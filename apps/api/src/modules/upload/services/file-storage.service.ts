import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { join, extname } from 'path';
import { existsSync, mkdirSync, renameSync, unlinkSync, readdirSync, statSync, rmSync } from 'fs';
import { PrismaService } from '../../../common/prisma/prisma.service';

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

  constructor(private readonly prisma: PrismaService) {
    const envPath = process.env.UPLOAD_BASE_PATH;
    // Resolve relative paths against cwd to ensure consistent absolute paths
    this.basePath = envPath
      ? (envPath.startsWith('/') || /^[A-Z]:/i.test(envPath) ? envPath : join(process.cwd(), envPath))
      : join(process.cwd(), 'uploads');
    _sharedBasePath = this.basePath;
    this.ensureDirectories();
  }

  async onModuleInit() {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'server_upload_base_path' },
      });
      if (setting?.value) {
        const dbPath = setting.value;
        const resolvedPath = (dbPath.startsWith('/') || /^[A-Z]:/i.test(dbPath))
          ? dbPath
          : join(process.cwd(), dbPath);
        if (existsSync(resolvedPath) || this.tryCreateDir(resolvedPath)) {
          this.basePath = resolvedPath;
          _sharedBasePath = resolvedPath;
          this.ensureDirectories();
          this.logger.log(`업로드 경로 (DB 설정): ${resolvedPath}`);
        } else {
          this.logger.warn(`DB 설정 경로 접근 불가, 기본값 사용: ${this.basePath}`);
        }
      } else {
        this.logger.log(`업로드 경로 (ENV 기본값): ${this.basePath}`);
      }
    } catch (err) {
      this.logger.warn(`DB 설정 로드 실패, 기본값 사용: ${this.basePath}`);
    }
  }

  private tryCreateDir(dirPath: string): boolean {
    try {
      mkdirSync(dirPath, { recursive: true });
      return true;
    } catch {
      return false;
    }
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

  /** 임시 썸네일 경로 생성 */
  getTempThumbnailDir(tempFolderId: string): string {
    const dir = join(this.basePath, 'temp', tempFolderId, 'thumbnails');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /** 정식 주문 경로 생성 */
  getOrderDir(orderNumber: string, folderName: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const safeFolderName = this.sanitizePath(folderName);

    const dir = join(this.basePath, 'orders', year, month, day, orderNumber, safeFolderName);
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
  moveToOrderDir(
    tempFolderId: string,
    orderNumber: string,
    folderName: string,
  ): { orderDir: string; movedFiles: Array<{ original: string; thumbnail: string; fileName: string }> } {
    const orderDir = this.getOrderDir(orderNumber, folderName);
    const tempOriginalsDir = join(this.basePath, 'temp', tempFolderId, 'originals');
    const tempThumbnailsDir = join(this.basePath, 'temp', tempFolderId, 'thumbnails');
    const movedFiles: Array<{ original: string; thumbnail: string; fileName: string }> = [];

    if (!existsSync(tempOriginalsDir)) {
      this.logger.warn(`Temp originals dir not found: ${tempOriginalsDir}`);
      return { orderDir, movedFiles };
    }

    const files = readdirSync(tempOriginalsDir);
    for (const fileName of files) {
      const srcOriginal = join(tempOriginalsDir, fileName);
      const destOriginal = join(orderDir, 'originals', fileName);

      try {
        renameSync(srcOriginal, destOriginal);
      } catch {
        // 크로스 디바이스 이동 실패 시 복사 후 삭제
        const { copyFileSync } = require('fs');
        copyFileSync(srcOriginal, destOriginal);
        unlinkSync(srcOriginal);
      }

      // 썸네일 이동
      const thumbName = this.getThumbName(fileName);
      const srcThumb = join(tempThumbnailsDir, thumbName);
      const destThumb = join(orderDir, 'thumbnails', thumbName);

      if (existsSync(srcThumb)) {
        try {
          renameSync(srcThumb, destThumb);
        } catch {
          const { copyFileSync } = require('fs');
          copyFileSync(srcThumb, destThumb);
          unlinkSync(srcThumb);
        }
      }

      movedFiles.push({
        original: destOriginal,
        thumbnail: existsSync(destThumb) ? destThumb : '',
        fileName,
      });
    }

    // 임시 폴더 정리
    this.cleanupTempFolder(tempFolderId);

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

  /** 24시간 이상 된 임시 파일 정리 (서버 시작 시 호출) */
  cleanupStaleTempFiles() {
    const tempDir = join(this.basePath, 'temp');
    if (!existsSync(tempDir)) return;

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
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
        this.logger.log(`Cleaned up ${cleaned} stale temp folders`);
      }
    } catch (err) {
      this.logger.error('Failed to cleanup stale temp files', err);
    }
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

  /** 상대 URL 경로 생성 (프론트엔드용) */
  toRelativeUrl(absolutePath: string): string {
    const basePath = this.basePath.replace(/\\/g, '/');
    const absPath = absolutePath.replace(/\\/g, '/');
    const relative = absPath.replace(basePath, '');
    return `/uploads${relative}`;
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
  private getThumbName(originalName: string): string {
    const ext = extname(originalName);
    const base = originalName.slice(0, -ext.length);
    return `${base}_thumb.jpg`;
  }

  /** 파일명으로 안전한 이름 생성 (multer용) */
  getSafeFileName(sortOrder: number, originalName: string): string {
    const ext = extname(originalName).toLowerCase();
    const safeName = this.sanitizePath(originalName.slice(0, -ext.length));
    const prefix = sortOrder.toString().padStart(2, '0');
    return `${prefix}_${safeName}${ext}`;
  }

  get uploadBasePath(): string {
    return this.basePath;
  }
}
