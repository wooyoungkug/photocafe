import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, mkdirSync, renameSync, unlinkSync, readdirSync, statSync, rmSync, copyFileSync } from 'fs';
import { rm } from 'fs/promises';
import { ThumbnailService } from './thumbnail.service';

// 모듈 레벨 base path (multer 콜백에서 접근용)
let _sharedBasePath: string = '';

/** multer diskStorage 콜백 등에서 사용할 업로드 base path */
export function getUploadBasePath(): string {
  if (_sharedBasePath) return _sharedBasePath;
  const envPath = process.env.UPLOAD_BASE_PATH;
  return envPath
    ? (envPath.startsWith('/') || /^[A-Z]:/i.test(envPath) ? envPath : join(process.cwd(), envPath))
    : join(process.cwd(), 'uploads');
}

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private basePath: string;

  constructor(
    @Inject(forwardRef(() => ThumbnailService))
    private readonly thumbnailService: ThumbnailService,
  ) {
    const envPath = process.env.UPLOAD_BASE_PATH;
    // Resolve relative paths against cwd to ensure consistent absolute paths
    this.basePath = envPath
      ? (envPath.startsWith('/') || /^[A-Z]:/i.test(envPath) ? envPath : join(process.cwd(), envPath))
      : join(process.cwd(), 'uploads');
    _sharedBasePath = this.basePath;
    this.ensureDirectories();
  }

  async onModuleInit() {
    // 경로 결정은 ENV(UPLOAD_BASE_PATH)만 사용. DB 설정은 제거됨.
    this.logger.log(`업로드 경로: ${this.basePath} (source: ${process.env.UPLOAD_BASE_PATH ? 'ENV' : 'default'})`);
  }

  private ensureDirectories() {
    const dirs = [
      this.basePath,
      join(this.basePath, 'temp'),
      join(this.basePath, 'orders'),
    ];
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /** 임시 업로드 경로 생성 (장바구니 단계) */
  getTempUploadDir(tempFolderId: string): string {
    const dir = join(this.basePath, 'temp', tempFolderId, 'originals');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /** 임시 원본 경로 */
  getTempOriginalsDir(tempFolderId: string): string {
    return join(this.basePath, 'temp', tempFolderId, 'originals');
  }

  /** 임시 썸네일 경로 생성 */
  getTempThumbnailDir(tempFolderId: string): string {
    const dir = join(this.basePath, 'temp', tempFolderId, 'thumbnails');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /** 정식 주문 경로 생성: orders/{year}/{month}/{day}/{거래처명}/{주문번호}/ */
  getOrderDir(orderNumber: string, companyName: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    if (!companyName) {
      throw new Error('거래처명이 필요합니다. (companyName is required)');
    }
    const safeCompanyName = this.sanitizePath(companyName);

    const dir = join(this.basePath, 'orders', year, month, day, safeCompanyName, orderNumber);
    const originals = join(dir, 'originals');
    const thumbnails = join(dir, 'thumbnails');
    const pdf = join(dir, 'pdf');

    for (const d of [originals, thumbnails, pdf]) {
      if (!existsSync(d)) {
        mkdirSync(d, { recursive: true });
      }
    }

    return dir;
  }

  /** 임시 파일을 정식 경로로 이동 */
  async moveToOrderDir(
    tempFolderId: string,
    orderNumber: string,
    companyName: string,
  ): Promise<{ orderDir: string; movedFiles: Array<{ original: string; thumbnail: string; fileName: string }> }> {
    const orderDir = this.getOrderDir(orderNumber, companyName);
    const tempOriginalsDir = join(this.basePath, 'temp', tempFolderId, 'originals');
    const tempThumbnailsDir = join(this.basePath, 'temp', tempFolderId, 'thumbnails');
    const movedFiles: Array<{ original: string; thumbnail: string; fileName: string }> = [];

    if (!existsSync(tempOriginalsDir)) {
      this.logger.warn(`Temp originals dir not found: ${tempOriginalsDir}`);
      return { orderDir, movedFiles };
    }

    const files = readdirSync(tempOriginalsDir);
    const thumbnailsToGenerate: Array<{ originalPath: string; destThumb: string; fileName: string; index: number }> = [];

    for (const fileName of files) {
      const srcOriginal = join(tempOriginalsDir, fileName);
      const destOriginal = join(orderDir, 'originals', fileName);

      try {
        this.safeMove(srcOriginal, destOriginal);
      } catch (err) {
        this.logger.error(`파일 이동 실패: ${fileName}`, err);
        continue; // 실패한 파일은 건너뛰고 나머지 계속 처리
      }

      // 썸네일 이동
      const thumbName = this.getThumbName(fileName);
      const srcThumb = join(tempThumbnailsDir, thumbName);
      const destThumb = join(orderDir, 'thumbnails', thumbName);

      if (existsSync(srcThumb)) {
        try {
          this.safeMove(srcThumb, destThumb);
        } catch {
          // 썸네일 이동 실패는 무시 (원본이 중요)
        }
      }

      const index = movedFiles.length;
      movedFiles.push({
        original: destOriginal,
        thumbnail: existsSync(destThumb) ? destThumb : '',
        fileName,
      });

      // 썸네일이 이동되지 않은 경우 (비동기 생성이 아직 안 됐거나 이동 실패) → 재생성 대상
      if (!existsSync(destThumb)) {
        thumbnailsToGenerate.push({ originalPath: destOriginal, destThumb, fileName, index });
      }
    }

    // 누락된 썸네일 원본에서 재생성
    if (thumbnailsToGenerate.length > 0) {
      this.logger.log(`${thumbnailsToGenerate.length}개 누락 썸네일 재생성 (주문: ${orderNumber})`);
      const thumbDir = join(orderDir, 'thumbnails');
      await Promise.all(
        thumbnailsToGenerate.map(async ({ originalPath, destThumb, fileName, index }) => {
          try {
            await this.thumbnailService.generateThumbnail(originalPath, thumbDir, fileName);
            if (existsSync(destThumb)) {
              movedFiles[index].thumbnail = destThumb;
            }
          } catch (err) {
            this.logger.warn(`썸네일 재생성 실패: ${fileName}`, err);
          }
        })
      );
    }

    // temp 폴더 정리는 호출측에서 DB 업데이트 완료 후 수행 (여기서 삭제하면 DB 업데이트 실패 시 복구 불가)
    // this.cleanupTempFolder(tempFolderId); -- 제거: 호출측에서 처리

    return { orderDir, movedFiles };
  }

  /** 임시 폴더 삭제 */
  cleanupTempFolder(tempFolderId: string) {
    const tempDir = join(this.basePath, 'temp', tempFolderId);
    if (existsSync(tempDir)) {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        this.logger.error(`Failed to cleanup temp folder: ${tempFolderId}`, err);
      }
    }
  }

  /**
   * 오래된 임시 파일(로컬 디스크) 정리.
   *
   * @param cutoffHours mtime 기준 이 시간보다 오래된 폴더 삭제 (기본 24시간)
   * @returns 삭제된 폴더 수
   */
  cleanupStaleTempFiles(cutoffHours: number = 24): { cleaned: number } {
    const tempDir = join(this.basePath, 'temp');
    if (!existsSync(tempDir)) return { cleaned: 0 };

    const cutoff = Date.now() - cutoffHours * 60 * 60 * 1000;
    let cleaned = 0;

    try {
      const folders = readdirSync(tempDir);
      for (const folder of folders) {
        const folderPath = join(tempDir, folder);
        try {
          const stat = statSync(folderPath);
          if (stat.isDirectory() && stat.mtimeMs < cutoff) {
            rmSync(folderPath, { recursive: true, force: true });
            cleaned++;
          }
        } catch {
          // skip
        }
      }
      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} stale temp folders (cutoff: ${cutoffHours}h)`);
      }
    } catch (err) {
      this.logger.error('Failed to cleanup stale temp files', err);
    }
    return { cleaned };
  }

  /** 원본 파일 삭제 (originals 디렉토리만) */
  deleteOriginals(orderDir: string): { deletedCount: number; freedBytes: number } {
    const originalsDir = join(orderDir, 'originals');
    if (!existsSync(originalsDir)) {
      return { deletedCount: 0, freedBytes: 0 };
    }

    let deletedCount = 0;
    let freedBytes = 0;

    const files = readdirSync(originalsDir);
    for (const file of files) {
      const filePath = join(originalsDir, file);
      try {
        const stat = statSync(filePath);
        freedBytes += stat.size;
        unlinkSync(filePath);
        deletedCount++;
      } catch (err) {
        this.logger.error(`Failed to delete file: ${filePath}`, err);
      }
    }

    // 빈 originals 디렉토리 삭제
    try {
      rmSync(originalsDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    return { deletedCount, freedBytes };
  }

  /** 단일 로컬 파일 삭제 시도 (경로 없음·미존재는 무시, 실패 시 로그만) */
  tryUnlinkLocalPath(localPath: string | null | undefined): void {
    if (!localPath?.trim()) return;
    try {
      if (existsSync(localPath)) {
        unlinkSync(localPath);
      }
    } catch (err) {
      this.logger.warn(`로컬 파일 삭제 실패: ${localPath} — ${(err as Error).message}`);
    }
  }

  /** 주문 전체 디렉토리 삭제 (originals + thumbnails + pdf) - 동기 버전 */
  deleteOrderDirectory(orderDir: string): { deletedCount: number; freedBytes: number } {
    if (!existsSync(orderDir)) {
      return { deletedCount: 0, freedBytes: 0 };
    }

    let deletedCount = 0;
    let freedBytes = 0;

    const countFiles = (dir: string) => {
      if (!existsSync(dir)) return;
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const st = statSync(fullPath);
          if (st.isDirectory()) {
            countFiles(fullPath);
          } else {
            deletedCount++;
            freedBytes += st.size;
          }
        } catch { /* skip */ }
      }
    };

    try {
      countFiles(orderDir);
    } catch (err) {
      this.logger.warn(`파일 집계 실패: ${orderDir} - ${err}`);
    }

    try {
      rmSync(orderDir, { recursive: true, force: true });
    } catch (err) {
      this.logger.error(`주문 디렉토리 삭제 실패: ${orderDir}`, err);
    }

    return { deletedCount, freedBytes };
  }

  /** 주문 전체 디렉토리 삭제 - 비동기 버전 (서버 크래시 방지) */
  async deleteOrderDirectoryAsync(orderDir: string): Promise<void> {
    if (!existsSync(orderDir)) return;
    try {
      await rm(orderDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      this.logger.log(`주문 디렉토리 삭제 완료: ${orderDir}`);
    } catch (err) {
      this.logger.warn(`주문 디렉토리 삭제 실패: ${orderDir} - ${(err as Error).message}`);
    }
  }

  /** 상대 URL 경로 생성 (프론트엔드용) */
  toRelativeUrl(absolutePath: string): string {
    const basePath = this.basePath.replace(/\\/g, '/').replace(/\/+/g, '/');
    const absPath = absolutePath.replace(/\\/g, '/').replace(/\/+/g, '/');
    const relative = absPath.replace(basePath, '');
    // 비ASCII 문자(한글 등)를 포함한 경로 세그먼트를 URL 인코딩
    const encodedRelative = relative
      .split('/')
      .map(segment => (/[^\x00-\x7F]/.test(segment) ? encodeURIComponent(segment) : segment))
      .join('/');
    return `/uploads${encodedRelative}`;
  }

  /** 파일명 정리 (경로 탐색 방지) */
  private sanitizePath(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\.\./g, '_')
      .trim()
      .slice(0, 100);
  }

  /** 썸네일 파일명 생성 */
  getThumbName(originalName: string): string {
    const ext = extname(originalName);
    const base = originalName.slice(0, -ext.length);
    return `${base}_thumb.jpg`;
  }

  /** 안전한 파일 이동 (rename 실패 시 복사→검증→삭제) */
  private safeMove(src: string, dest: string) {
    try {
      renameSync(src, dest);
    } catch {
      // 크로스 디바이스: 복사 후 검증 → 삭제
      copyFileSync(src, dest);
      // 복사 결과 검증
      const srcStat = statSync(src);
      const destStat = statSync(dest);
      if (destStat.size !== srcStat.size) {
        // 복사 실패 - 대상 파일 삭제하고 에러
        try { unlinkSync(dest); } catch { /* ignore */ }
        throw new Error(`파일 복사 검증 실패: ${src} (${srcStat.size} != ${destStat.size})`);
      }
      unlinkSync(src);
    }
  }

  /** 파일명으로 안전한 이름 생성 (multer용) */
  getSafeFileName(sortOrder: number, originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const safeName = this.sanitizePath(originalName.slice(0, -ext.length));
    const prefix = sortOrder.toString().padStart(2, '0');
    return `${prefix}_${safeName}${ext}`;
  }

  /** 임시 폴더의 업로드된 파일 목록 조회 */
  listTempFiles(tempFolderId: string): {
    tempFolderId: string;
    files: Array<{
      fileName: string;
      sortOrder: number;
      fileSize: number;
      fileUrl: string;
      thumbnailUrl: string;
    }>;
    totalCount: number;
  } | null {
    const originalsDir = join(this.basePath, 'temp', tempFolderId, 'originals');
    if (!existsSync(originalsDir)) return null;

    const thumbnailsDir = join(this.basePath, 'temp', tempFolderId, 'thumbnails');
    const fileNames = readdirSync(originalsDir).filter(f => {
      try { return statSync(join(originalsDir, f)).isFile(); } catch { return false; }
    });

    const files = fileNames.map(fileName => {
      const st = statSync(join(originalsDir, fileName));
      // 파일명 형식: "NN_originalBaseName.ext" → sortOrder = NN
      const match = fileName.match(/^(\d+)_/);
      const sortOrder = match ? parseInt(match[1], 10) : 0;

      // 썸네일 URL
      const ext = extname(fileName);
      const base = fileName.slice(0, -ext.length);
      const thumbName = `${base}_thumb.jpg`;
      const thumbExists = existsSync(join(thumbnailsDir, thumbName));
      const encodedThumbName = /[^\x00-\x7F]/.test(thumbName) || thumbName.includes(' ')
        ? encodeURIComponent(thumbName) : thumbName;
      const encodedFileName = /[^\x00-\x7F]/.test(fileName) || fileName.includes(' ')
        ? encodeURIComponent(fileName) : fileName;

      return {
        fileName,
        sortOrder,
        fileSize: st.size,
        fileUrl: `/uploads/temp/${tempFolderId}/originals/${encodedFileName}`,
        thumbnailUrl: thumbExists
          ? `/uploads/temp/${tempFolderId}/thumbnails/${encodedThumbName}`
          : '',
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);

    return { tempFolderId, files, totalCount: files.length };
  }

  get uploadBasePath(): string {
    return this.basePath;
  }
}
