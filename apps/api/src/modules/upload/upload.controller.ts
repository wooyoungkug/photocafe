import { Controller, Post, Patch, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException, ForbiddenException, Get, Param, Res, Body, Delete, Query, Logger, OnModuleInit } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID, randomBytes } from 'crypto';
import { existsSync, mkdirSync, createReadStream, statSync, unlinkSync, readFileSync } from 'fs';
import { writeFile as fsWriteFile, rename as fsRename, open as fsOpen, unlink as fsUnlink } from 'fs/promises';
import { Response } from 'express';
import { FileStorageService, getUploadBasePath } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';
import { B2StorageService } from './services/b2-storage.service';
import { R2StorageService } from './services/r2-storage.service';
import { WorkerUploadProxyService } from './services/worker-upload-proxy.service';
import { UploadMetricsService } from './services/upload-metrics.service';
import { UploadMetricsInterceptor } from './interceptors/upload-metrics.interceptor';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

/** CSV 셀 이스케이프: 쉼표·따옴표·개행 포함 시 따옴표로 감싸고 내부 " 는 "" 로 escape */
function csvEscape(v: unknown): string {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'boolean' || typeof v === 'number' ? String(v) : String(v);
    if (/[",\n\r]/.test(s)) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

/** B2 키 세그먼트 정규화 (b2-storage.service 의 sanitizeStorageKeyPart 와 동일 규칙) */
function sanitizeStorageKeyPart(value: string): string {
    return value
        .replace(/\\/g, '/')
        .replace(/^\.+/, '')
        .replace(/\.\./g, '_')
        .replace(/[^a-zA-Z0-9._/-]/g, '_');
}

/** 동적 업로드 디렉토리 헬퍼 (DB 설정 반영) */
function ensureDir(subPath: string): string {
    const dir = join(getUploadBasePath(), subPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// 초기 디렉토리 생성
ensureDir('');
ensureDir('category-icons');
ensureDir('products');
ensureDir('copper-plates/ai');
ensureDir('copper-plates/images');
ensureDir('copper-plates/albums');
ensureDir('repairs');

/** B2 presigned 업로드용 인메모리 파일 메타데이터 항목 */
interface B2TempFileMeta {
    fileName: string;
    originalName: string;
    fileSize: number;
    fileUrl: string;       // b2Key
    thumbnailUrl: string;
    sortOrder: number;
    createdAt: number;     // Date.now()
    width?: number;
    height?: number;
    widthInch?: number;
    heightInch?: number;
    dpi?: number;
}

@ApiTags('Upload')
@Controller('upload')
@UseInterceptors(UploadMetricsInterceptor)
export class UploadController implements OnModuleInit {
    private readonly logger = new Logger(UploadController.name);

    /** B2 presigned 업로드 메타데이터: tempFolderId -> 파일 목록 */
    private readonly b2TempFiles = new Map<string, B2TempFileMeta[]>();

    /** TTL: 24시간 경과 폴더 자동 정리 */
    private readonly TEMP_TTL_MS = 24 * 60 * 60 * 1000;

    /**
     * 백그라운드 썸네일 큐 — multipart-complete / confirm 의 setImmediate 대체.
     * 한 번에 1개만 처리해 메인 이벤트 루프 점유를 제어한다 (sharp + B2 다운로드).
     * 동시 multipart 요청들이 서로의 백그라운드 작업에 의해 지연되지 않게 함.
     */
    private readonly thumbnailQueue: Array<() => Promise<void>> = [];
    private thumbnailActiveCount = 0;
    private readonly THUMBNAIL_CONCURRENCY = 3;

    private enqueueThumbnail(task: () => Promise<void>): void {
        this.thumbnailQueue.push(task);
        this.drainThumbnailQueue();
    }

    private drainThumbnailQueue(): void {
        while (
            this.thumbnailQueue.length > 0 &&
            this.thumbnailActiveCount < this.THUMBNAIL_CONCURRENCY
        ) {
            const task = this.thumbnailQueue.shift();
            if (!task) continue;
            this.thumbnailActiveCount++;
            void task()
                .catch((err) =>
                    this.logger.warn(`thumbnail bg task failed: ${(err as Error).message}`),
                )
                .finally(() => {
                    this.thumbnailActiveCount--;
                    this.drainThumbnailQueue();
                });
        }
    }

    constructor(
        private readonly fileStorage: FileStorageService,
        private readonly thumbnailService: ThumbnailService,
        private readonly b2Storage: B2StorageService,
        private readonly r2Storage: R2StorageService,
        private readonly workerProxy: WorkerUploadProxyService,
        private readonly prisma: PrismaService,
        private readonly metrics: UploadMetricsService,
    ) {}

    /**
     * 스토리지 선택:
     *   - storage === 'r2' 또는 'r2-worker' → R2 (R2 미설정 시 B2 폴백)
     *   - 그 외 → B2
     *
     * 'r2-worker' 는 청크 PUT URL 생성 시에만 Worker 경유 URL 을 발급한다.
     * 실제 multipart 생성/완료/취소 는 R2 S3 API 로 처리한다 (Worker 는 부분 업로드만).
     */
    private pickStorage(storage: string | undefined): B2StorageService | R2StorageService {
        if ((storage === 'r2' || storage === 'r2-worker') && this.r2Storage.isEnabled()) {
            return this.r2Storage;
        }
        return this.b2Storage;
    }

    /** Worker 프록시 모드 활성 조건: 사용자 요청 + Worker 설정 + R2 활성 모두 충족 */
    private shouldUseWorkerProxy(storage: string | undefined): boolean {
        return (
            storage === 'r2-worker' &&
            this.workerProxy.isEnabled() &&
            this.r2Storage.isEnabled()
        );
    }

    onModuleInit(): void {
        // 1시간마다 TTL 체크 — 24시간 경과 메타데이터 정리
        setInterval(() => {
            try {
                const now = Date.now();
                const cutoff = now - this.TEMP_TTL_MS;
                let cleaned = 0;
                for (const [folderId, files] of this.b2TempFiles.entries()) {
                    const fresh = files.filter((f) => f.createdAt >= cutoff);
                    if (fresh.length === 0) {
                        this.b2TempFiles.delete(folderId);
                        cleaned++;
                    } else if (fresh.length !== files.length) {
                        this.b2TempFiles.set(folderId, fresh);
                    }
                }
                if (cleaned > 0) {
                    this.logger.log(`B2 temp 메타데이터 TTL 정리: ${cleaned}개 폴더`);
                }
            } catch (err) {
                this.logger.warn(`B2 temp TTL 정리 실패: ${(err as Error).message}`);
            }
        }, 60 * 60 * 1000).unref?.();
    }

    /** tempFolderId 정규화 (경로 탐색 방지) */
    private sanitizeTempFolderId(value: string | undefined | null): string {
        return (value || '')
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            .trim();
    }

    /** 파일명 정규화 (B2 키 안전성 + 경로 탐색 방지) */
    private sanitizeFileName(value: string): string {
        return value
            .replace(/[<>:"/\\|?*\0]/g, '_')
            .replace(/\.\./g, '_')
            .trim();
    }

    /** manifest.json 경로 */
    private manifestPath(safeTempFolderId: string): string {
        return join(getUploadBasePath(), 'temp', safeTempFolderId, 'manifest.json');
    }

    /** manifest.json 비동기 저장 (presigned 업로드 세션 복원용) */
    private async saveManifest(safeTempFolderId: string, files: B2TempFileMeta[]): Promise<void> {
        try {
            const dir = join(getUploadBasePath(), 'temp', safeTempFolderId);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
            const payload = {
                source: 'b2-presigned',
                updatedAt: new Date().toISOString(),
                files: files.map((f) => ({
                    fileName: f.fileName,
                    originalName: f.originalName,
                    fileSize: f.fileSize,
                    fileUrl: f.fileUrl,
                    thumbnailUrl: f.thumbnailUrl,
                    sortOrder: f.sortOrder,
                })),
            };
            await fsWriteFile(this.manifestPath(safeTempFolderId), JSON.stringify(payload, null, 2));
        } catch (err) {
            this.logger.warn(`manifest.json 저장 실패 (${safeTempFolderId}): ${(err as Error).message}`);
        }
    }

    /** manifest.json 읽기 (없거나 깨졌으면 null) */
    private readManifest(safeTempFolderId: string): B2TempFileMeta[] | null {
        try {
            const p = this.manifestPath(safeTempFolderId);
            if (!existsSync(p)) return null;
            const raw = readFileSync(p, 'utf-8');
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.files)) return null;
            return parsed.files.map((f: any): B2TempFileMeta => ({
                fileName: String(f.fileName || ''),
                originalName: String(f.originalName || f.fileName || ''),
                fileSize: Number(f.fileSize || 0),
                fileUrl: String(f.fileUrl || ''),
                thumbnailUrl: String(f.thumbnailUrl || ''),
                sortOrder: Number(f.sortOrder || 0),
                createdAt: Date.now(),
            }));
        } catch (err) {
            this.logger.warn(`manifest.json 읽기 실패 (${safeTempFolderId}): ${(err as Error).message}`);
            return null;
        }
    }

    // ==================== 앨범 원본 파일 업로드 ====================

    @Public()
    @Post('album-file')
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '앨범 원본 파일 업로드 (장바구니 단계)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                tempFolderId: { type: 'string' },
                folderName: { type: 'string' },
                sortOrder: { type: 'number' },
                fileName: { type: 'string' },
                width: { type: 'number' },
                height: { type: 'number' },
                widthInch: { type: 'number' },
                heightInch: { type: 'number' },
                dpi: { type: 'number' },
                fileSize: { type: 'number' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            // diskStorage: 200MB 파일을 메모리에 적재하지 않고 즉시 디스크에 스트림
            // → Railway 메모리 압박/GC pause 해소, 동시 N개 업로드 시에도 안정
            storage: diskStorage({
                destination: (_req, _file, cb) => {
                    const incomingDir = join(getUploadBasePath(), 'temp', '_incoming');
                    if (!existsSync(incomingDir)) {
                        mkdirSync(incomingDir, { recursive: true });
                    }
                    cb(null, incomingDir);
                },
                filename: (_req, file, cb) => {
                    const ext = extname(file.originalname).toLowerCase();
                    cb(null, `${randomUUID()}${ext}`);
                },
            }),
            fileFilter: (_req, file, cb) => {
                // image/tif (단수)도 허용 (일부 시스템이 tif로 전송)
                if (!file.mimetype.match(/^image\/(jpg|jpeg|png|tif|tiff|webp)$/)) {
                    return cb(new BadRequestException('이미지 파일만 업로드 가능합니다. (jpg, jpeg, png, tif, tiff, webp)'), false);
                }
                cb(null, true);
            },
            limits: {
                // 기본값 200MB - 인쇄용 고해상도 TIFF 파일 지원 (env: UPLOAD_MAX_FILE_SIZE)
                fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '209715200', 10),
            },
        }),
    )
    async uploadAlbumFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: {
            tempFolderId: string;
            folderName: string;
            sortOrder: string;
            fileName: string;
            width: string;
            height: string;
            widthInch: string;
            heightInch: string;
            dpi: string;
            fileSize: string;
        },
        @Request() req: any,
    ) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        // Magic number 검증 — MIME 헤더는 조작 가능하므로 파일 실제 바이트로 재확인
        // diskStorage 사용 중이라 file.buffer 가 없음 → 디스크에서 첫 12바이트만 읽음 (전체 로드 X)
        // JPEG: FF D8 FF | PNG: 89 50 4E 47 | TIFF(LE): 49 49 2A 00 | TIFF(BE): 4D 4D 00 2A | WEBP: 52 49 46 46...57 45 42 50
        let sig: Buffer;
        const fd = await fsOpen(file.path, 'r');
        try {
            const headerBuf = Buffer.alloc(12);
            await fd.read(headerBuf, 0, 12, 0);
            sig = headerBuf;
        } finally {
            await fd.close();
        }
        const isJpeg = sig[0] === 0xFF && sig[1] === 0xD8 && sig[2] === 0xFF;
        const isPng  = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47;
        const isTiff = (sig[0] === 0x49 && sig[1] === 0x49 && sig[2] === 0x2A) ||
                       (sig[0] === 0x4D && sig[1] === 0x4D && sig[3] === 0x2A);
        const isWebp = sig[0] === 0x52 && sig[1] === 0x49 && sig[2] === 0x46 && sig[3] === 0x46 &&
                       sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50;
        if (!isJpeg && !isPng && !isTiff && !isWebp) {
            // 잘못된 파일 즉시 삭제
            await fsUnlink(file.path).catch(() => {});
            throw new BadRequestException('지원하지 않는 파일 형식입니다. (jpg, png, tif, webp만 허용)');
        }

        // 경로 탐색 공격 방지
        const safeTempFolderId = (body.tempFolderId || '')
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            .trim();
        if (!safeTempFolderId) {
            // 무효 요청도 임시 파일 정리
            await fsUnlink(file.path).catch(() => {});
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        // 디렉토리 생성
        const dir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'originals');
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        // 파일명 생성 (multer latin1→UTF-8 변환)
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        file.originalname = originalName;
        const sortOrder = parseInt(body.sortOrder || '0', 10);
        const ext = extname(originalName).toLowerCase();
        const safeName = originalName
            .replace(/[<>:"/\\|?*]/g, '_')
            .replace(/\.\./g, '_')
            .trim();
        const base = safeName.slice(0, -ext.length).slice(0, 80);
        const prefix = sortOrder.toString().padStart(2, '0');
        const filename = `${prefix}_${base}${ext}`;

        // diskStorage 가 이미 _incoming 에 썼으므로 최종 경로로 rename (디스크 복사 X)
        const filePath = join(dir, filename);
        await fsRename(file.path, filePath);

        // multer 호환 속성 설정
        file.path = filePath;
        file.filename = filename;

        const fileUrl = this.fileStorage.toRelativeUrl(file.path);

        // 썸네일은 fire-and-forget 백그라운드 처리 - 응답 지연 방지
        // 썸네일 URL은 예측 경로를 반환하고, 클라이언트가 재시도/fallback 처리
        const thumbDir = this.fileStorage.getTempThumbnailDir(body.tempFolderId);
        setImmediate(() => {
            this.thumbnailService
                .generateThumbnail(file.path, thumbDir, file.filename)
                .catch(() => {});
        });

        // API → B2 속도 측정: 인터셉터가 이 요청을 샘플링했을 때만 실행(10%)
        // 실제 이미지 파일로 B2 업로드 속도를 즉시 측정하고 temp 키는 바로 삭제
        if (req?.metricsSampled && this.b2Storage.isEnabled()) {
            const probeKey = `metrics/probe/${randomUUID()}${extname(filePath)}`;
            setImmediate(async () => {
                try {
                    await this.b2Storage.putPrivateObjectFromPath(probeKey, filePath, file.mimetype);
                } catch { /* 측정 실패는 무시 */ } finally {
                    this.b2Storage.deletePrivateObject(probeKey).catch(() => {});
                }
            });
        }

        // 썸네일 URL을 예측 가능한 경로로 즉시 반환 (파일명 규칙: {base}_thumb.jpg)
        const thumbExt = extname(file.filename);
        const thumbBase = file.filename.slice(0, -thumbExt.length);
        const thumbName = `${thumbBase}_thumb.jpg`;
        const encodedThumbName = /[^\x00-\x7F]/.test(thumbName) || thumbName.includes(' ')
            ? encodeURIComponent(thumbName)
            : thumbName;
        const thumbnailUrl = `/uploads/temp/${body.tempFolderId}/thumbnails/${encodedThumbName}`;

        return {
            tempFileId: `${body.tempFolderId}/${file.filename}`,
            fileName: file.filename,
            originalName: file.originalname,
            size: file.size,
            fileUrl,
            thumbnailUrl,
            sortOrder: parseInt(body.sortOrder || '0', 10),
        };
    }

    // ==================== 앨범 원본 파일 업로드 (B2 직접 업로드, presigned PUT) ====================

    @Public()
    @Post('album-file-presign')
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '앨범 원본 파일 직접 업로드용 B2 presigned PUT URL 발급' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempFolderId: { type: 'string' },
                folderName: { type: 'string' },
                sortOrder: { type: 'number' },
                fileName: { type: 'string' },
                contentType: { type: 'string' },
                fileSize: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                widthInch: { type: 'number' },
                heightInch: { type: 'number' },
                dpi: { type: 'number' },
            },
        },
    })
    async getAlbumFilePresignedUrl(
        @Body() body: {
            tempFolderId: string;
            folderName: string;
            sortOrder: number;
            fileName: string;
            contentType: string;
            fileSize: number;
            width: number;
            height: number;
            widthInch: number;
            heightInch: number;
            dpi: number;
        },
    ) {
        if (!this.b2Storage.isEnabled()) {
            throw new BadRequestException('B2 스토리지가 설정되지 않았습니다.');
        }

        // tempFolderId 검증
        const safeTempFolderId = this.sanitizeTempFolderId(body.tempFolderId);
        if (!safeTempFolderId) {
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        // contentType 검증
        const contentType = (body.contentType || '').trim();
        if (!contentType.match(/^image\/(jpeg|jpg|png|tif|tiff|webp)$/)) {
            throw new BadRequestException('지원하지 않는 contentType입니다. (image/jpeg, image/jpg, image/png, image/tif, image/tiff, image/webp만 허용)');
        }

        // fileSize 검증 (0 초과 ~ 200MB)
        const fileSize = Number(body.fileSize);
        const MAX_FILE_SIZE = 209715200; // 200MB
        if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
            throw new BadRequestException(`파일 크기가 유효하지 않습니다. (1 ~ ${MAX_FILE_SIZE} bytes)`);
        }

        // fileName 검증
        if (!body.fileName || !body.fileName.trim()) {
            throw new BadRequestException('fileName이 필요합니다.');
        }
        const safeFileName = this.sanitizeFileName(body.fileName.trim());
        if (!safeFileName) {
            throw new BadRequestException('유효하지 않은 fileName입니다.');
        }

        // B2 키 생성: temp/{safeTempFolderId}/originals/{safeFileName}
        const b2Key = `temp/${safeTempFolderId}/originals/${safeFileName}`;

        // presigned PUT URL 발급 (15분 유효)
        const expiresIn = 900;
        const presignedUrl = await this.b2Storage.getPresignedPutUrl(b2Key, contentType, 'private', expiresIn);

        // 썸네일 예측 경로 (실제로는 confirm 단계에서 생성됨)
        const ext = extname(safeFileName);
        const base = safeFileName.slice(0, -ext.length);
        const thumbName = `${base}_thumb.jpg`;
        const encodedThumbName = /[^\x00-\x7F]/.test(thumbName) || thumbName.includes(' ')
            ? encodeURIComponent(thumbName)
            : thumbName;
        const thumbnailUrl = `/uploads/temp/${safeTempFolderId}/thumbnails/${encodedThumbName}`;

        const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        return {
            presignedUrl,
            b2Key,
            tempFileId: `${safeTempFolderId}/${safeFileName}`,
            fileName: safeFileName,
            thumbnailUrl,
            sortOrder,
            expiresAt,
        };
    }

    @Public()
    @Post('album-file-confirm')
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '앨범 원본 파일 B2 직접 업로드 완료 통보 (썸네일 백그라운드 생성)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempFolderId: { type: 'string' },
                b2Key: { type: 'string' },
                fileName: { type: 'string' },
                originalName: { type: 'string' },
                sortOrder: { type: 'number' },
                fileSize: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                widthInch: { type: 'number' },
                heightInch: { type: 'number' },
                dpi: { type: 'number' },
            },
        },
    })
    async confirmAlbumFileUpload(
        @Body() body: {
            tempFolderId: string;
            b2Key: string;
            fileName: string;
            originalName: string;
            sortOrder: number;
            fileSize: number;
            width: number;
            height: number;
            widthInch: number;
            heightInch: number;
            dpi: number;
            thumbnailDataUrl?: string;
            b2DurationMs?: number;
        },
    ) {
        if (!this.b2Storage.isEnabled()) {
            throw new BadRequestException('B2 스토리지가 설정되지 않았습니다.');
        }

        const safeTempFolderId = this.sanitizeTempFolderId(body.tempFolderId);
        if (!safeTempFolderId) {
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        const b2Key = (body.b2Key || '').trim();
        if (!b2Key) {
            throw new BadRequestException('b2Key가 필요합니다.');
        }

        // b2Key prefix 검증 — 다른 폴더로 위장 방지
        const expectedPrefix = `temp/${safeTempFolderId}/originals/`;
        if (!b2Key.startsWith(expectedPrefix)) {
            throw new BadRequestException('b2Key가 tempFolderId와 일치하지 않습니다.');
        }
        // 경로 탐색 방지
        if (b2Key.includes('..') || b2Key.includes('\0')) {
            throw new BadRequestException('유효하지 않은 b2Key입니다.');
        }

        const safeFileName = this.sanitizeFileName((body.fileName || '').trim());
        if (!safeFileName) {
            throw new BadRequestException('유효하지 않은 fileName입니다.');
        }

        const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
        const fileSize = Number.isFinite(Number(body.fileSize)) ? Number(body.fileSize) : 0;
        const originalName = (body.originalName || safeFileName).toString();

        // 썸네일 URL 예측
        const ext = extname(safeFileName);
        const base = safeFileName.slice(0, -ext.length);
        const thumbName = `${base}_thumb.jpg`;
        const encodedThumbName = /[^\x00-\x7F]/.test(thumbName) || thumbName.includes(' ')
            ? encodeURIComponent(thumbName)
            : thumbName;
        const thumbnailUrl = `/uploads/temp/${safeTempFolderId}/thumbnails/${encodedThumbName}`;

        // 인메모리 Map에 메타데이터 저장 (중복 fileName 은 새 값으로 덮어쓰기)
        const width = Number.isFinite(Number(body.width)) ? Number(body.width) : undefined;
        const height = Number.isFinite(Number(body.height)) ? Number(body.height) : undefined;
        const widthInch = Number.isFinite(Number(body.widthInch)) ? Number(body.widthInch) : undefined;
        const heightInch = Number.isFinite(Number(body.heightInch)) ? Number(body.heightInch) : undefined;
        const dpi = Number.isFinite(Number(body.dpi)) ? Number(body.dpi) : undefined;
        const meta: B2TempFileMeta = {
            fileName: safeFileName,
            originalName,
            fileSize,
            fileUrl: b2Key,
            thumbnailUrl,
            sortOrder,
            createdAt: Date.now(),
            width,
            height,
            widthInch,
            heightInch,
            dpi,
        };
        const existing = this.b2TempFiles.get(safeTempFolderId) || [];
        const filtered = existing.filter((f) => f.fileName !== safeFileName);
        filtered.push(meta);
        this.b2TempFiles.set(safeTempFolderId, filtered);

        // manifest.json 비동기 저장 (세션 복원용)
        void this.saveManifest(safeTempFolderId, filtered);

        const thumbDir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'thumbnails');
        const thumbPath = join(thumbDir, thumbName);

        // 클라이언트가 썸네일을 미리 생성해 보냈으면 바로 저장 (B2 재다운로드 없음)
        const rawThumb = typeof body.thumbnailDataUrl === 'string' ? body.thumbnailDataUrl : '';
        const thumbMatch = rawThumb.match(/^data:image\/\w+;base64,(.+)$/s);
        if (thumbMatch && rawThumb.length <= 3 * 1024 * 1024) {
            try {
                const thumbBuffer = Buffer.from(thumbMatch[1], 'base64');
                if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
                await fsWriteFile(thumbPath, thumbBuffer);
            } catch (err) {
                this.logger.warn(`클라이언트 썸네일 저장 실패, B2 폴백: ${err}`);
                this.enqueueThumbnail(async () => {
                    const presignedGetUrl = await this.b2Storage.getPrivatePresignedUrl(b2Key, 300);
                    const res = await fetch(presignedGetUrl);
                    if (!res.ok) return;
                    const buf = Buffer.from(await res.arrayBuffer());
                    const tempOrigDir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'originals');
                    if (!existsSync(tempOrigDir)) mkdirSync(tempOrigDir, { recursive: true });
                    const tempFilePath = join(tempOrigDir, safeFileName);
                    await fsWriteFile(tempFilePath, buf);
                    if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
                    await this.thumbnailService.generateThumbnail(tempFilePath, thumbDir, safeFileName);
                });
            }
        } else {
            // 썸네일 없음 (TIFF 등 브라우저 미지원 포맷) → B2 재다운로드 폴백
            this.enqueueThumbnail(async () => {
                const presignedGetUrl = await this.b2Storage.getPrivatePresignedUrl(b2Key, 300);
                const res = await fetch(presignedGetUrl);
                if (!res.ok) {
                    this.logger.warn(`B2 원본 다운로드 실패 (${b2Key}): HTTP ${res.status}`);
                    return;
                }
                const buf = Buffer.from(await res.arrayBuffer());
                const tempOrigDir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'originals');
                if (!existsSync(tempOrigDir)) mkdirSync(tempOrigDir, { recursive: true });
                const tempFilePath = join(tempOrigDir, safeFileName);
                await fsWriteFile(tempFilePath, buf);
                if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
                await this.thumbnailService.generateThumbnail(tempFilePath, thumbDir, safeFileName);
            });
        }

        // 클라이언트가 측정한 B2 직접 업로드 소요 시간 → 서버사이드로 안정적 기록
        const b2DurationMs = Number(body.b2DurationMs);
        if (Number.isFinite(b2DurationMs) && b2DurationMs > 0 && fileSize > 0) {
            this.metrics.record({
                kind: 'real',
                phase: 'client_to_b2',
                endpoint: '/upload/album-file-confirm',
                fileSize,
                durationMs: b2DurationMs,
                success: true,
            });
        }

        return {
            tempFileId: `${safeTempFolderId}/${safeFileName}`,
            fileName: safeFileName,
            originalName,
            size: fileSize,
            fileUrl: b2Key,
            thumbnailUrl,
            sortOrder,
        };
    }

    // ==================== 앨범 원본 파일 Multipart 업로드 (B2 직접, 청크 병렬) ====================

    @Public()
    @Post('album-file-multipart-create')
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '앨범 원본 파일 Multipart 업로드 시작 — uploadId + 청크별 presigned URL 반환' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempFolderId: { type: 'string' },
                folderName: { type: 'string' },
                sortOrder: { type: 'number' },
                fileName: { type: 'string' },
                contentType: { type: 'string' },
                fileSize: { type: 'number' },
                partSize: { type: 'number', description: '청크 크기 (bytes). 기본 8MB. 최소 5MB.' },
            },
        },
    })
    async createAlbumFileMultipart(
        @Body() body: {
            tempFolderId: string;
            folderName: string;
            sortOrder: number;
            fileName: string;
            contentType: string;
            fileSize: number;
            partSize?: number;
            storage?: string;
        },
    ) {
        const storage = this.pickStorage(body.storage);
        if (!storage.isEnabled()) {
            throw new BadRequestException('스토리지가 설정되지 않았습니다.');
        }

        const safeTempFolderId = this.sanitizeTempFolderId(body.tempFolderId);
        if (!safeTempFolderId) {
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        const contentType = (body.contentType || '').trim();
        if (!contentType.match(/^image\/(jpeg|jpg|png|tif|tiff|webp)$/)) {
            throw new BadRequestException('지원하지 않는 contentType입니다.');
        }

        const fileSize = Number(body.fileSize);
        const MAX_FILE_SIZE = 1073741824; // 1GB
        const MIN_FILE_SIZE = 5242880;    // 5MB (S3 multipart 최소 1청크 = 5MB)
        if (!Number.isFinite(fileSize) || fileSize < MIN_FILE_SIZE || fileSize > MAX_FILE_SIZE) {
            throw new BadRequestException(`Multipart 업로드 파일 크기는 ${MIN_FILE_SIZE} ~ ${MAX_FILE_SIZE} bytes 범위여야 합니다.`);
        }

        if (!body.fileName || !body.fileName.trim()) {
            throw new BadRequestException('fileName이 필요합니다.');
        }
        const safeFileName = this.sanitizeFileName(body.fileName.trim());
        if (!safeFileName) {
            throw new BadRequestException('유효하지 않은 fileName입니다.');
        }

        const MIN_PART = 5242880;    // 5MB
        const MAX_PART = 104857600;  // 100MB
        const requestedPartSize = Number(body.partSize);
        let partSize = Number.isFinite(requestedPartSize) && requestedPartSize > 0
            ? Math.min(Math.max(requestedPartSize, MIN_PART), MAX_PART)
            : 52428800; // 기본 50MB

        let partCount = Math.ceil(fileSize / partSize);
        if (partCount > 10000) {
            partSize = Math.ceil(fileSize / 10000);
            partCount = Math.ceil(fileSize / partSize);
        }

        const b2Key = `temp/${safeTempFolderId}/originals/${safeFileName}`;

        const uploadId = await storage.createMultipartUpload(b2Key, contentType);

        const expiresIn = 1800; // 30분
        const useWorker = this.shouldUseWorkerProxy(body.storage);

        // 청크별 URL 생성:
        //  - r2-worker: Worker HMAC 서명 URL (Seoul edge → R2 binding, IO 없음)
        //  - 그 외: S3/B2 presigned PUT URL
        const partUrls = useWorker
            ? Array.from({ length: partCount }, (_, idx) => {
                const partNumber = idx + 1;
                const offset = idx * partSize;
                const contentLength = Math.min(partSize, fileSize - offset);
                const url = this.workerProxy.signPartUrl({
                    key: b2Key,
                    uploadId,
                    partNumber,
                    expiresInSeconds: expiresIn,
                });
                return { partNumber, url, contentLength };
            })
            : await Promise.all(
                Array.from({ length: partCount }, async (_, idx) => {
                    const partNumber = idx + 1;
                    const url = await storage.getPresignedUploadPartUrl(b2Key, uploadId, partNumber, expiresIn);
                    const offset = idx * partSize;
                    const contentLength = Math.min(partSize, fileSize - offset);
                    return { partNumber, url, contentLength };
                }),
            );

        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // 응답의 storage 필드는 클라이언트가 complete/abort 호출 시 같은 백엔드 스토리지를
        // 가리키도록 유지해야 한다. 'r2-worker' 도 R2 위에 동작하므로 'r2-worker' 그대로 반환.
        const storageLabel = useWorker
            ? 'r2-worker'
            : body.storage === 'r2' && this.r2Storage.isEnabled()
                ? 'r2'
                : 'b2';

        return {
            uploadId,
            b2Key,
            partSize,
            partCount,
            partUrls,
            fileName: safeFileName,
            expiresAt,
            storage: storageLabel,
        };
    }

    @Public()
    @Post('album-file-multipart-complete')
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '앨범 원본 파일 Multipart 업로드 완료 — 청크 ETag 수집 후 통합 확정' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempFolderId: { type: 'string' },
                b2Key: { type: 'string' },
                uploadId: { type: 'string' },
                parts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            partNumber: { type: 'number' },
                            etag: { type: 'string' },
                        },
                    },
                },
                fileName: { type: 'string' },
                originalName: { type: 'string' },
                sortOrder: { type: 'number' },
                fileSize: { type: 'number' },
                width: { type: 'number' },
                height: { type: 'number' },
                widthInch: { type: 'number' },
                heightInch: { type: 'number' },
                dpi: { type: 'number' },
            },
        },
    })
    async completeAlbumFileMultipart(
        @Body() body: {
            tempFolderId: string;
            b2Key: string;
            uploadId: string;
            parts: Array<{ partNumber: number; etag: string }>;
            fileName: string;
            originalName: string;
            sortOrder: number;
            fileSize: number;
            width: number;
            height: number;
            widthInch: number;
            heightInch: number;
            dpi: number;
            storage?: string;
            thumbnailDataUrl?: string;
            b2DurationMs?: number;
        },
        @Request() req: any,
    ) {
        const storage = this.pickStorage(body.storage);
        if (!storage.isEnabled()) {
            throw new BadRequestException('스토리지가 설정되지 않았습니다.');
        }

        const safeTempFolderId = this.sanitizeTempFolderId(body.tempFolderId);
        if (!safeTempFolderId) {
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        const b2Key = (body.b2Key || '').trim();
        const uploadId = (body.uploadId || '').trim();
        if (!b2Key || !uploadId) {
            throw new BadRequestException('b2Key, uploadId가 필요합니다.');
        }

        const expectedPrefix = `temp/${safeTempFolderId}/originals/`;
        if (!b2Key.startsWith(expectedPrefix) || b2Key.includes('..') || b2Key.includes('\0')) {
            throw new BadRequestException('b2Key가 유효하지 않습니다.');
        }

        const safeFileName = this.sanitizeFileName((body.fileName || '').trim());
        if (!safeFileName) {
            throw new BadRequestException('유효하지 않은 fileName입니다.');
        }

        if (!Array.isArray(body.parts) || body.parts.length === 0) {
            throw new BadRequestException('parts 배열이 비어있습니다.');
        }

        const partsForS3 = body.parts
            .map((p) => ({
                PartNumber: Number(p.partNumber),
                ETag: String(p.etag || '').trim(),
            }))
            .filter((p) => Number.isFinite(p.PartNumber) && p.PartNumber > 0 && p.ETag);

        if (partsForS3.length !== body.parts.length) {
            throw new BadRequestException('parts 항목이 유효하지 않습니다.');
        }

        // R2/S3 CompleteMultipartUpload 는 idempotent.
        // 동시 부하 시 R2 측 일시적 timeout 가능 → 짧은 backoff 로 3회 retry.
        // 두 번째 호출에서 NoSuchUpload 가 오면 첫 호출이 이미 성공한 것으로 간주.
        const MAX_COMPLETE_ATTEMPTS = 3;
        let completeError: Error | null = null;
        for (let attempt = 1; attempt <= MAX_COMPLETE_ATTEMPTS; attempt++) {
            try {
                await storage.completeMultipartUpload(b2Key, uploadId, partsForS3);
                completeError = null;
                break;
            } catch (err) {
                const e = err as Error & { name?: string; Code?: string };
                const msg = (e?.message || '').toLowerCase();
                const code = (e?.name || (e as any)?.Code || '').toString();
                // 이미 완료된 multipart 는 정상 성공으로 처리
                if (
                    code === 'NoSuchUpload' ||
                    msg.includes('nosuchupload') ||
                    msg.includes('no such upload')
                ) {
                    this.logger.log(
                        `multipart-complete: upload already finalized (b2Key=${b2Key}, attempt=${attempt})`,
                    );
                    completeError = null;
                    break;
                }
                completeError = e;
                if (attempt < MAX_COMPLETE_ATTEMPTS) {
                    this.logger.warn(
                        `multipart-complete retry ${attempt}/${MAX_COMPLETE_ATTEMPTS - 1}: ${e?.message}`,
                    );
                    await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
                }
            }
        }
        if (completeError) {
            throw new BadRequestException(`Multipart 완료 실패: ${completeError.message}`);
        }

        const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
        const fileSize = Number.isFinite(Number(body.fileSize)) ? Number(body.fileSize) : 0;
        const originalName = (body.originalName || safeFileName).toString();

        const ext = extname(safeFileName);
        const base = safeFileName.slice(0, -ext.length);
        const thumbName = `${base}_thumb.jpg`;
        const encodedThumbName = /[^\x00-\x7F]/.test(thumbName) || thumbName.includes(' ')
            ? encodeURIComponent(thumbName)
            : thumbName;
        const thumbnailUrl = `/uploads/temp/${safeTempFolderId}/thumbnails/${encodedThumbName}`;

        const meta: B2TempFileMeta = {
            fileName: safeFileName,
            originalName,
            fileSize,
            fileUrl: b2Key,
            thumbnailUrl,
            sortOrder,
            createdAt: Date.now(),
        };
        const existing = this.b2TempFiles.get(safeTempFolderId) || [];
        const filtered = existing.filter((f) => f.fileName !== safeFileName);
        filtered.push(meta);
        this.b2TempFiles.set(safeTempFolderId, filtered);

        void this.saveManifest(safeTempFolderId, filtered);

        const thumbDir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'thumbnails');
        const thumbPath = join(thumbDir, thumbName);

        // 클라이언트가 썸네일을 미리 생성해 보냈으면 바로 저장 (B2 재다운로드 없음)
        const rawThumb = typeof body.thumbnailDataUrl === 'string' ? body.thumbnailDataUrl : '';
        const thumbMatch = rawThumb.match(/^data:image\/\w+;base64,(.+)$/s);
        if (thumbMatch && rawThumb.length <= 3 * 1024 * 1024) {
            try {
                const thumbBuffer = Buffer.from(thumbMatch[1], 'base64');
                if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
                await fsWriteFile(thumbPath, thumbBuffer);
            } catch (err) {
                this.logger.warn(`클라이언트 썸네일 저장 실패, B2 폴백: ${err}`);
                const storageForDownload = storage;
                this.enqueueThumbnail(async () => {
                    const presignedGetUrl = await storageForDownload.getPrivatePresignedUrl(b2Key, 300);
                    const res = await fetch(presignedGetUrl);
                    if (!res.ok) return;
                    const buf = Buffer.from(await res.arrayBuffer());
                    const tempOrigDir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'originals');
                    if (!existsSync(tempOrigDir)) mkdirSync(tempOrigDir, { recursive: true });
                    const tempFilePath = join(tempOrigDir, safeFileName);
                    await fsWriteFile(tempFilePath, buf);
                    if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
                    await this.thumbnailService.generateThumbnail(tempFilePath, thumbDir, safeFileName);
                });
            }
        } else {
            // 썸네일 없음 (TIFF 등 브라우저 미지원 포맷) → B2 재다운로드 폴백
            const storageForDownload = storage;
            this.enqueueThumbnail(async () => {
                const presignedGetUrl = await storageForDownload.getPrivatePresignedUrl(b2Key, 300);
                const res = await fetch(presignedGetUrl);
                if (!res.ok) {
                    this.logger.warn(`원본 다운로드 실패 (${b2Key}): HTTP ${res.status}`);
                    return;
                }
                const buf = Buffer.from(await res.arrayBuffer());
                const tempOrigDir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'originals');
                if (!existsSync(tempOrigDir)) mkdirSync(tempOrigDir, { recursive: true });
                const tempFilePath = join(tempOrigDir, safeFileName);
                await fsWriteFile(tempFilePath, buf);
                if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
                await this.thumbnailService.generateThumbnail(tempFilePath, thumbDir, safeFileName);
            });
        }

        // 클라이언트가 측정한 B2 직접 업로드 소요 시간 → 서버사이드로 안정적 기록
        const b2DurationMsMulti = Number(body.b2DurationMs);
        if (Number.isFinite(b2DurationMsMulti) && b2DurationMsMulti > 0 && fileSize > 0) {
            this.metrics.record({
                kind: 'real',
                phase: 'client_to_b2',
                endpoint: '/upload/album-file-multipart-complete',
                fileSize,
                durationMs: b2DurationMsMulti,
                success: true,
            });
        }

        // API → B2 속도 측정: 5% 추가 샘플링 (20% 메트릭 샘플 × 5% = 전체 1%)
        // 사용자 업로드와 소켓 풀 경쟁 최소화
        if (req?.metricsSampled && Math.random() < 0.05 && this.b2Storage.isEnabled()) {
            const probeKey = `metrics/probe/${randomUUID()}`;
            setImmediate(async () => {
                try {
                    const probe = Buffer.allocUnsafe(512 * 1024); // 512KB 합성 데이터
                    await this.b2Storage.putPrivateObject(probeKey, probe, 'application/octet-stream');
                } catch { /* 측정 실패 무시 */ } finally {
                    this.b2Storage.deletePrivateObject(probeKey).catch(() => {});
                }
            });
        }

        return {
            tempFileId: `${safeTempFolderId}/${safeFileName}`,
            fileName: safeFileName,
            originalName,
            size: fileSize,
            fileUrl: b2Key,
            thumbnailUrl,
            sortOrder,
        };
    }

    @Public()
    @Post('album-file-multipart-abort')
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '앨범 원본 파일 Multipart 업로드 취소 — B2에 쌓인 미완료 청크 정리' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempFolderId: { type: 'string' },
                b2Key: { type: 'string' },
                uploadId: { type: 'string' },
            },
        },
    })
    async abortAlbumFileMultipart(
        @Body() body: {
            tempFolderId: string;
            b2Key: string;
            uploadId: string;
            storage?: string;
        },
    ) {
        const storage = this.pickStorage(body.storage);
        if (!storage.isEnabled()) {
            return { aborted: false, reason: 'storage disabled' };
        }

        const safeTempFolderId = this.sanitizeTempFolderId(body.tempFolderId);
        const b2Key = (body.b2Key || '').trim();
        const uploadId = (body.uploadId || '').trim();
        if (!safeTempFolderId || !b2Key || !uploadId) {
            return { aborted: false, reason: 'invalid input' };
        }

        const expectedPrefix = `temp/${safeTempFolderId}/originals/`;
        if (!b2Key.startsWith(expectedPrefix)) {
            return { aborted: false, reason: 'b2Key prefix mismatch' };
        }

        try {
            await storage.abortMultipartUpload(b2Key, uploadId);
            return { aborted: true };
        } catch (err) {
            this.logger.warn(`Multipart abort 실패 (${b2Key}): ${(err as Error).message}`);
            return { aborted: false, reason: (err as Error).message };
        }
    }

    @Public()
    @Get('temp/:tempFolderId/files')
    @Throttle({ default: { ttl: 60000, limit: 60 } })
    @ApiOperation({ summary: '임시 업로드 파일 목록 조회' })
    listTempFiles(@Param('tempFolderId') tempFolderId: string) {
        const safeTempFolderId = this.sanitizeTempFolderId(tempFolderId);
        if (!safeTempFolderId) {
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        // 1) 디스크 기반 결과
        const diskResult = this.fileStorage.listTempFiles(safeTempFolderId);
        const diskFiles = diskResult?.files ?? [];
        const diskFileNames = new Set(diskFiles.map((f) => f.fileName));

        // 2) 인메모리 b2TempFiles + manifest.json 병합 (디스크 우선)
        const mem = this.b2TempFiles.get(safeTempFolderId);
        let b2Files: B2TempFileMeta[] = [];
        if (mem && mem.length > 0) {
            b2Files = mem;
        } else {
            const fromManifest = this.readManifest(safeTempFolderId);
            if (fromManifest && fromManifest.length > 0) {
                // manifest 만 있고 메모리에 없으면 메모리에도 복원
                this.b2TempFiles.set(safeTempFolderId, fromManifest);
                b2Files = fromManifest;
            }
        }

        const merged = [...diskFiles];
        for (const b of b2Files) {
            if (diskFileNames.has(b.fileName)) continue; // 디스크 파일 우선
            merged.push({
                fileName: b.fileName,
                sortOrder: b.sortOrder,
                fileSize: b.fileSize,
                fileUrl: b.fileUrl, // b2Key
                thumbnailUrl: b.thumbnailUrl,
            });
        }
        merged.sort((a, b) => a.sortOrder - b.sortOrder);

        return {
            tempFolderId: safeTempFolderId,
            files: merged,
            totalCount: merged.length,
        };
    }

    @Public()
    @Delete('temp/:tempFolderId')
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @ApiOperation({ summary: '임시 업로드 파일 삭제' })
    deleteTempFolder(@Param('tempFolderId') tempFolderId: string) {
        this.fileStorage.cleanupTempFolder(tempFolderId);
        return { message: '임시 파일이 삭제되었습니다.' };
    }

    // ==================== 사업자등록증 업로드 (B2 private) ====================

    @Post('business-cert')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle({ default: { ttl: 60000, limit: 10 } })
    @ApiOperation({ summary: '사업자등록증 업로드 (사업자 회원 전환 신청용, B2 private 저장)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('business-certs')),
                filename: (_req, file, cb) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname).toLowerCase()}`;
                    cb(null, uniqueName);
                },
            }),
            fileFilter: (_req, file, cb) => {
                const ok = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname) &&
                    /\/(pdf|jpg|jpeg|png)$/i.test(file.mimetype);
                if (!ok) {
                    return cb(new BadRequestException('PDF, JPG, PNG 파일만 업로드 가능합니다.'), false);
                }
                cb(null, true);
            },
            limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
        }),
    )
    async uploadBusinessCert(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }
        if (req.user?.type === 'staff') {
            // 임시파일 정리
            try { unlinkSync(file.path); } catch { /* noop */ }
            throw new BadRequestException('회원 계정으로만 업로드할 수 있습니다.');
        }
        const clientId: string = req.user?.clientId || req.user?.sub;
        if (!clientId) {
            try { unlinkSync(file.path); } catch { /* noop */ }
            throw new BadRequestException('유효하지 않은 사용자입니다.');
        }
        if (!this.b2Storage.isEnabled()) {
            try { unlinkSync(file.path); } catch { /* noop */ }
            throw new BadRequestException('파일 스토리지가 설정되지 않았습니다. 관리자에게 문의하세요.');
        }

        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const key = `clients/${sanitizeStorageKeyPart(clientId)}/business-cert/${Date.now()}-${sanitizeStorageKeyPart(originalName)}`;
        try {
            await this.b2Storage.putPrivateObjectFromPath(key, file.path, file.mimetype);
        } finally {
            try { unlinkSync(file.path); } catch { /* noop */ }
        }
        return { uploadKey: key, originalName, size: file.size };
    }

    // ==================== 카테고리 아이콘 ====================

    @Post('category-icon')
    @ApiOperation({ summary: '카테고리 아이콘 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('category-icons')),
                filename: (req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    callback(null, uniqueName);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|avif|svg\+xml)$/)) {
                    return callback(new BadRequestException('이미지 파일만 업로드 가능합니다.'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB
            },
        }),
    )
    uploadCategoryIcon(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        return {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: this.fileStorage.toRelativeUrl(file.path),
        };
    }

    @Get('category-icons/:filename')
    @ApiOperation({ summary: '카테고리 아이콘 조회' })
    getCategoryIcon(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(getUploadBasePath(), 'category-icons', filename);

        if (!existsSync(filePath)) {
            return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        }

        return res.sendFile(filePath);
    }

    // ==================== CS 가이드 이미지 업로드 ====================

    @Post('cs-guide-image')
    @ApiOperation({ summary: 'CS 상담 가이드 이미지 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('cs-guides')),
                filename: (_req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    callback(null, uniqueName);
                },
            }),
            fileFilter: (_req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|avif)$/)) {
                    return callback(new BadRequestException('이미지 파일만 업로드 가능합니다.'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 20 * 1024 * 1024, // 20MB
            },
        }),
    )
    uploadCsGuideImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        return {
            filename: file.filename,
            originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            size: file.size,
            url: this.fileStorage.toRelativeUrl(file.path),
        };
    }

    // ==================== 상품 이미지 업로드 ====================

    @Post('product-image')
    @ApiOperation({ summary: '상품 썸네일/상세이미지 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('products')),
                filename: (_req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    callback(null, uniqueName);
                },
            }),
            fileFilter: (_req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|avif)$/)) {
                    return callback(new BadRequestException('이미지 파일만 업로드 가능합니다.'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '52428800', 10),
            },
        }),
    )
    uploadProductImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        return {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: this.fileStorage.toRelativeUrl(file.path),
        };
    }

    // ==================== 동판 파일 업로드 ====================

    @Post('copper-plate/ai')
    @ApiOperation({ summary: '동판 AI 파일 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('copper-plates/ai')),
                filename: (req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    callback(null, uniqueName);
                },
            }),
            fileFilter: (req, file, callback) => {
                // AI, PDF, EPS 파일 허용
                const allowedTypes = /\.(ai|pdf|eps)$/i;
                if (!allowedTypes.test(file.originalname)) {
                    return callback(new BadRequestException('AI, PDF, EPS 파일만 업로드 가능합니다.'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB
            },
        }),
    )
    uploadCopperPlateAi(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        return {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: this.fileStorage.toRelativeUrl(file.path),
        };
    }

    @Get('copper-plate/ai/:filename')
    @ApiOperation({ summary: '동판 AI 파일 조회' })
    getCopperPlateAi(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(getUploadBasePath(), 'copper-plates/ai', filename);

        if (!existsSync(filePath)) {
            return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        }

        return res.sendFile(filePath);
    }

    @Post('copper-plate/image')
    @ApiOperation({ summary: '동판 이미지 파일 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('copper-plates/images')),
                filename: (req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    callback(null, uniqueName);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|pdf|webp)$/)) {
                    return callback(new BadRequestException('JPG, PNG, PDF, WEBP 파일만 업로드 가능합니다.'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 20 * 1024 * 1024, // 20MB
            },
        }),
    )
    uploadCopperPlateImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        return {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: this.fileStorage.toRelativeUrl(file.path),
        };
    }

    @Get('copper-plate/image/:filename')
    @ApiOperation({ summary: '동판 이미지 파일 조회' })
    getCopperPlateImage(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(getUploadBasePath(), 'copper-plates/images', filename);

        if (!existsSync(filePath)) {
            return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        }

        return res.sendFile(filePath);
    }

    @Post('copper-plate/album')
    @ApiOperation({ summary: '동판 앨범 이미지 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (_req, _file, cb) => cb(null, ensureDir('copper-plates/albums')),
                filename: (req, file, callback) => {
                    const uniqueName = `${randomUUID()}${extname(file.originalname)}`;
                    callback(null, uniqueName);
                },
            }),
            fileFilter: (req, file, callback) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
                    return callback(new BadRequestException('JPG, PNG, WEBP 파일만 업로드 가능합니다.'), false);
                }
                callback(null, true);
            },
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB
            },
        }),
    )
    uploadCopperPlateAlbum(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        return {
            filename: file.filename,
            originalName: file.originalname,
            size: file.size,
            url: this.fileStorage.toRelativeUrl(file.path),
        };
    }

    @Get('copper-plate/album/:filename')
    @ApiOperation({ summary: '동판 앨범 이미지 조회' })
    getCopperPlateAlbum(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(getUploadBasePath(), 'copper-plates/albums', filename);

        if (!existsSync(filePath)) {
            return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        }

        return res.sendFile(filePath);
    }

    // ==================== 앨범수리 교체페이지 파일 업로드 ====================

    @Public()
    @Post('repair-file')
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @ApiOperation({ summary: '앨범수리 교체페이지 파일 업로드' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
                tempRepairId: { type: 'string', description: '임시 수리 요청 ID' },
                pageNumber: { type: 'number', description: '교체 페이지 번호' },
            },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req: any, _file, cb) => {
                    const tempRepairId = req.body?.tempRepairId;
                    if (!tempRepairId) {
                        return cb(new BadRequestException('tempRepairId가 필요합니다.'), '');
                    }
                    const safeId = tempRepairId.replace(/\.\./g, '').replace(/[/\\]/g, '').trim();
                    if (!safeId) {
                        return cb(new BadRequestException('유효하지 않은 tempRepairId입니다.'), '');
                    }
                    const dir = join(getUploadBasePath(), 'repairs', safeId);
                    if (!existsSync(dir)) {
                        mkdirSync(dir, { recursive: true });
                    }
                    cb(null, dir);
                },
                filename: (req: any, file, cb) => {
                    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    file.originalname = originalName;
                    const pageNumber = parseInt(req.body?.pageNumber || '0', 10);
                    const ext = extname(originalName).toLowerCase();
                    const prefix = `page_${String(pageNumber).padStart(3, '0')}`;
                    const uuid = randomUUID().slice(0, 8);
                    cb(null, `${prefix}_${uuid}${ext}`);
                },
            }),
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.match(/^image\/(jpg|jpeg|png|tif|tiff|webp)$/)) {
                    return cb(new BadRequestException('이미지 파일만 업로드 가능합니다.'), false);
                }
                cb(null, true);
            },
            limits: {
                fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '209715200', 10),
            },
        }),
    )
    async uploadRepairFile(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { tempRepairId: string; pageNumber: string },
    ) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        const fileUrl = this.fileStorage.toRelativeUrl(file.path);

        // 썸네일 생성
        const thumbDir = join(getUploadBasePath(), 'repairs', body.tempRepairId, 'thumbnails');
        if (!existsSync(thumbDir)) {
            mkdirSync(thumbDir, { recursive: true });
        }
        this.thumbnailService.generateThumbnail(file.path, thumbDir, file.filename)
            .catch(() => {});

        const ext = extname(file.filename);
        const base = file.filename.slice(0, -ext.length);
        const thumbName = `${base}_thumb.jpg`;
        const thumbnailUrl = `/uploads/repairs/${body.tempRepairId}/thumbnails/${thumbName}`;

        return {
            fileName: file.filename,
            originalName: file.originalname,
            size: file.size,
            fileUrl,
            thumbnailUrl,
            pageNumber: parseInt(body.pageNumber || '0', 10),
        };
    }

    // ==================== 앨범수리 교체페이지 파일 업로드 (B2 직접, presigned PUT) ====================

    @Public()
    @Post('repair-file-presign')
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @ApiOperation({ summary: '앨범수리 파일 B2 직접 업로드용 presigned PUT URL 발급' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempRepairId: { type: 'string' },
                pageNumber: { type: 'number' },
                fileName: { type: 'string' },
                contentType: { type: 'string' },
                fileSize: { type: 'number' },
            },
        },
    })
    async getRepairFilePresignedUrl(
        @Body() body: {
            tempRepairId: string;
            pageNumber: number;
            fileName: string;
            contentType: string;
            fileSize: number;
        },
    ) {
        if (!this.b2Storage.isEnabled()) {
            throw new BadRequestException('B2 스토리지가 설정되지 않았습니다.');
        }

        const safeId = (body.tempRepairId || '')
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            .trim();
        if (!safeId) throw new BadRequestException('유효하지 않은 tempRepairId입니다.');

        const contentType = (body.contentType || '').trim();
        if (!contentType.match(/^image\/(jpeg|jpg|png|tif|tiff|webp)$/)) {
            throw new BadRequestException('지원하지 않는 contentType입니다.');
        }

        const fileSize = Number(body.fileSize);
        const MAX = parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '209715200', 10);
        if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX) {
            throw new BadRequestException('파일 크기가 유효하지 않습니다.');
        }

        if (!body.fileName?.trim()) throw new BadRequestException('fileName이 필요합니다.');
        const safeFileName = this.sanitizeFileName(body.fileName.trim());
        if (!safeFileName) throw new BadRequestException('유효하지 않은 fileName입니다.');

        const pageNumber = Number.isFinite(Number(body.pageNumber)) ? Number(body.pageNumber) : 0;
        const ext = extname(safeFileName).toLowerCase();
        const base = safeFileName.slice(0, -ext.length).slice(0, 80);
        const prefix = `page_${String(pageNumber).padStart(3, '0')}`;
        const uid = randomUUID().slice(0, 8);
        const b2FileName = `${prefix}_${uid}_${base}${ext}`;
        const b2Key = `repairs/${safeId}/${b2FileName}`;

        const expiresIn = 900; // 15분
        const presignedUrl = await this.b2Storage.getPresignedPutUrl(b2Key, contentType, 'private', expiresIn);

        const thumbName = `${prefix}_${uid}_${base}_thumb.jpg`;
        const thumbnailUrl = `/uploads/repairs/${safeId}/thumbnails/${encodeURIComponent(thumbName)}`;

        return {
            presignedUrl,
            b2Key,
            fileName: b2FileName,
            thumbnailUrl,
            pageNumber,
            expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        };
    }

    @Public()
    @Post('repair-file-confirm')
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @ApiOperation({ summary: '앨범수리 파일 B2 직접 업로드 완료 통보 (썸네일 백그라운드 생성)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                tempRepairId: { type: 'string' },
                b2Key: { type: 'string' },
                fileName: { type: 'string' },
                originalName: { type: 'string' },
                pageNumber: { type: 'number' },
                fileSize: { type: 'number' },
            },
        },
    })
    async confirmRepairFileUpload(
        @Body() body: {
            tempRepairId: string;
            b2Key: string;
            fileName: string;
            originalName: string;
            pageNumber: number;
            fileSize: number;
        },
    ) {
        if (!this.b2Storage.isEnabled()) {
            throw new BadRequestException('B2 스토리지가 설정되지 않았습니다.');
        }

        const safeId = (body.tempRepairId || '')
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            .trim();
        if (!safeId) throw new BadRequestException('유효하지 않은 tempRepairId입니다.');

        const b2Key = (body.b2Key || '').trim();
        const expectedPrefix = `repairs/${safeId}/`;
        if (!b2Key.startsWith(expectedPrefix) || b2Key.includes('..') || b2Key.includes('\0')) {
            throw new BadRequestException('b2Key가 유효하지 않습니다.');
        }

        const safeFileName = this.sanitizeFileName((body.fileName || '').trim());
        if (!safeFileName) throw new BadRequestException('유효하지 않은 fileName입니다.');

        const pageNumber = Number.isFinite(Number(body.pageNumber)) ? Number(body.pageNumber) : 0;
        const fileSize = Number.isFinite(Number(body.fileSize)) ? Number(body.fileSize) : 0;
        const originalName = (body.originalName || safeFileName).toString();

        const ext = extname(safeFileName);
        const base = safeFileName.slice(0, -ext.length);
        const thumbName = `${base}_thumb.jpg`;
        const thumbnailUrl = `/uploads/repairs/${safeId}/thumbnails/${encodeURIComponent(thumbName)}`;

        // 썸네일 백그라운드 생성 — B2 원본 다운로드 후 로컬 생성
        this.enqueueThumbnail(async () => {
            const url = await this.b2Storage.getPrivatePresignedUrl(b2Key, 300);
            const res = await fetch(url);
            if (!res.ok) {
                this.logger.warn(`수리파일 B2 다운로드 실패 (${b2Key}): HTTP ${res.status}`);
                return;
            }
            const buf = Buffer.from(await res.arrayBuffer());
            const tempDir = join(getUploadBasePath(), 'repairs', safeId);
            if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
            const tempPath = join(tempDir, safeFileName);
            await fsWriteFile(tempPath, buf);
            const thumbDir = join(getUploadBasePath(), 'repairs', safeId, 'thumbnails');
            if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
            await this.thumbnailService.generateThumbnail(tempPath, thumbDir, safeFileName);
        });

        return {
            fileName: safeFileName,
            originalName,
            size: fileSize,
            fileUrl: b2Key,
            thumbnailUrl,
            pageNumber,
        };
    }

    @Public()
    @Delete('repair/:tempRepairId')
    @Throttle({ default: { ttl: 60000, limit: 20 } })
    @ApiOperation({ summary: '수리 임시 파일 삭제' })
    deleteRepairFolder(@Param('tempRepairId') tempRepairId: string) {
        const safeId = tempRepairId.replace(/\.\./g, '').replace(/[/\\]/g, '').trim();
        const dir = join(getUploadBasePath(), 'repairs', safeId);
        if (existsSync(dir)) {
            const fs = require('fs');
            fs.rmSync(dir, { recursive: true, force: true });
        }
        return { message: '수리 임시 파일이 삭제되었습니다.' };
    }

    // ==================== 주문/수리 파일 직접 서빙 (static middleware fallback) ====================

    @Public()
    @Get('serve/*path')
    @Throttle({ default: { ttl: 60000, limit: 120 } })
    @ApiOperation({ summary: '업로드 파일 직접 서빙 (orders/repairs/temp 등 한글 경로 지원)' })
    async serveUploadFile(@Param('path') rawPath: string | string[], @Res() res: Response) {
        if (!rawPath) {
            return res.status(400).json({ message: '경로가 필요합니다.' });
        }
        // NestJS 와일드카드(*path)는 다중 세그먼트를 배열로 반환하므로 '/'로 결합
        const joined = Array.isArray(rawPath) ? rawPath.join('/') : rawPath;
        // 경로 탐색 방지
        const decoded = decodeURIComponent(joined);
        if (decoded.includes('..') || decoded.includes('\0')) {
            return res.status(400).json({ message: '잘못된 경로입니다.' });
        }
        // 원본 파일(orders/.../originals/)은 presigned URL 전용 — 직접 서빙 금지
        if (/orders[\\/][^\\/]+[\\/]originals[\\/]/i.test(decoded)) {
            return res.status(403).json({ message: '원본 파일은 직접 접근이 허용되지 않습니다. API를 통해 접근하세요.' });
        }
        const uploadBase = getUploadBasePath();
        const filePath = join(uploadBase, decoded);
        if (existsSync(filePath)) {
            return this.streamFile(filePath, res);
        }
        // B2 폴백: 디스크에 없으면 B2 originals 에서 받아 .b2-cache/{orderNumber}/(originals|thumbnails)/ 에 캐싱.
        // 썸네일은 원본 다운로드 후 sharp 로 재생성한다 (B2 Public 버킷 미설정 케이스 대응).
        try {
            const cached = await this.tryB2ServeFallback(decoded, uploadBase);
            if (cached) {
                return this.streamFile(cached, res);
            }
        } catch (err) {
            this.logger.warn(`B2 폴백 실패 (${decoded}): ${(err as Error).message}`);
        }
        return res.status(404).json({ message: '파일을 찾을 수 없습니다.', tried: filePath });
    }

    /**
     * 한글/공백 포함 경로에서 res.sendFile (Express send) 가 NotFound 로 깨지는
     * 이슈를 우회하기 위해 ReadStream 으로 직접 응답한다. 절대 경로만 입력받는다.
     */
    private streamFile(absPath: string, res: Response): void {
        try {
            const stat = statSync(absPath);
            const lower = absPath.toLowerCase();
            const contentType = lower.endsWith('.jpg') || lower.endsWith('.jpeg') ? 'image/jpeg'
                : lower.endsWith('.png') ? 'image/png'
                : lower.endsWith('.webp') ? 'image/webp'
                : lower.endsWith('.gif') ? 'image/gif'
                : lower.endsWith('.tif') || lower.endsWith('.tiff') ? 'image/tiff'
                : lower.endsWith('.pdf') ? 'application/pdf'
                : 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', String(stat.size));
            res.setHeader('Cache-Control', 'public, max-age=86400');
            const stream = createReadStream(absPath);
            stream.on('error', (err) => {
                this.logger.warn(`파일 스트림 에러 (${absPath}): ${err.message}`);
                if (!res.headersSent) {
                    res.status(500).json({ message: '파일 읽기 실패' });
                }
            });
            stream.pipe(res);
        } catch (err) {
            this.logger.warn(`파일 stat 실패 (${absPath}): ${(err as Error).message}`);
            if (!res.headersSent) {
                res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
            }
        }
    }

    /**
     * 로컬 디스크에 없는 주문 파일을 B2 에서 받아 로컬 캐시에 저장.
     * 경로 패턴: orders/.../{orderNumber}/(originals|thumbnails)/{fileName}
     * 썸네일이면 원본을 받아 ThumbnailService 로 재생성한다.
     * 반환: 캐시된 로컬 파일 경로 (없으면 null)
     */
    private async tryB2ServeFallback(decoded: string, uploadBase: string): Promise<string | null> {
        if (!this.b2Storage.isEnabled()) return null;
        // orderNumber 형식: YYMMDD-NNN (예: 260429-008)
        const m = decoded.match(/\/([0-9]{6}-[0-9]{3})\/(originals|thumbnails)\/(.+)$/);
        if (!m) return null;
        const [, orderNumber, kind, fileName] = m;

        const sanitize = (v: string): string =>
            v.replace(/\\/g, '/')
                .replace(/^\.+/, '')
                .replace(/\.\./g, '_')
                .replace(/[^a-zA-Z0-9._/-]/g, '_');

        const cacheDir = join(uploadBase, '.b2-cache', orderNumber, kind);
        const cachePath = join(cacheDir, fileName);
        if (existsSync(cachePath)) return cachePath;

        const safeOrder = sanitize(orderNumber);

        if (kind === 'originals') {
            const safeName = sanitize(fileName);
            const key = `orders/${safeOrder}/originals/${safeName}`;
            const url = await this.b2Storage.getPrivatePresignedUrl(key, 300);
            const response = await fetch(url);
            if (!response.ok) {
                this.logger.warn(`B2 다운로드 실패 (${key}): HTTP ${response.status}`);
                return null;
            }
            const buf = Buffer.from(await response.arrayBuffer());
            if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
            await fsWriteFile(cachePath, buf);
            return cachePath;
        }

        // kind === 'thumbnails': fileName = `{base}_thumb.jpg`. 원본 fileName 을 DB 에서 조회.
        const base = fileName.replace(/_thumb\.jpg$/i, '');
        const orderFile = await this.prisma.orderFile.findFirst({
            where: {
                orderItem: { order: { orderNumber } },
                fileName: { startsWith: `${base}.` },
            },
            select: { fileName: true },
        });
        if (!orderFile) {
            this.logger.warn(`썸네일 폴백: OrderFile 매칭 실패 (orderNumber=${orderNumber}, base=${base})`);
            return null;
        }
        const origFileName = orderFile.fileName;
        const safeOrigName = sanitize(origFileName);
        const origKey = `orders/${safeOrder}/originals/${safeOrigName}`;

        const origCacheDir = join(uploadBase, '.b2-cache', orderNumber, 'originals');
        const origCachePath = join(origCacheDir, origFileName);
        if (!existsSync(origCachePath)) {
            const url = await this.b2Storage.getPrivatePresignedUrl(origKey, 300);
            const response = await fetch(url);
            if (!response.ok) {
                this.logger.warn(`B2 다운로드 실패 (${origKey}): HTTP ${response.status}`);
                return null;
            }
            const buf = Buffer.from(await response.arrayBuffer());
            if (!existsSync(origCacheDir)) mkdirSync(origCacheDir, { recursive: true });
            await fsWriteFile(origCachePath, buf);
        }

        if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
        await this.thumbnailService.generateThumbnail(origCachePath, cacheDir, origFileName);
        return existsSync(cachePath) ? cachePath : null;
    }

    // ==================== 속도 테스트 & 메트릭 조회 (관리자 전용) ====================

    private assertStaff(req: any): void {
        if (req?.user?.type !== 'staff') {
            throw new ForbiddenException('관리자(staff)만 접근 가능합니다.');
        }
    }

    @Post('speedtest/upload')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: '업로드 속도 테스트 — 받은 파일을 즉시 폐기, 메트릭만 기록 (관리자 전용)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB 상한
        }),
    )
    speedtestUpload(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
        this.assertStaff(req);
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }
        // 메모리 즉시 폐기 (참조 끊기)
        const size = file.size;
        (file as any).buffer = null;
        return {
            sizeBytes: size,
            sizeMb: +(size / 1024 / 1024).toFixed(2),
            message: 'received',
        };
    }

    @Post('speedtest/b2-presign')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: 'B2 직접 업로드 속도 테스트용 presigned PUT URL 발급 (관리자 전용, 최대 100MB)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: { sizeMb: { type: 'number', description: '업로드할 크기 MB (1~100)' } },
        },
    })
    async speedtestB2Presign(@Body() body: { sizeMb?: number }, @Request() req: any) {
        this.assertStaff(req);
        if (!this.b2Storage.isEnabled()) {
            throw new BadRequestException('B2 스토리지가 설정되지 않았습니다.');
        }
        const sizeMb = Math.min(Math.max(Number.isFinite(body?.sizeMb) ? body.sizeMb! : 10, 1), 100);
        const key = `speedtest/${Date.now()}-${randomBytes(6).toString('hex')}.bin`;
        const presignedUrl = await this.b2Storage.getPresignedPutUrl(key, 'application/octet-stream', 'private', 300);
        return { presignedUrl, key, sizeMb, expiresIn: 300 };
    }

    @Get('speedtest/download')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: '다운로드 속도 테스트 — 무작위 바이트 N MB 스트리밍 (관리자 전용, 최대 100MB)' })
    @ApiQuery({ name: 'sizeMb', required: false, description: '다운로드 크기 MB (기본 10, 최대 100)' })
    async speedtestDownload(@Query('sizeMb') sizeMb: string, @Request() req: any, @Res() res: Response) {
        this.assertStaff(req);
        const requested = parseInt(sizeMb || '10', 10);
        const sizeMbClamped = Math.min(Math.max(Number.isFinite(requested) ? requested : 10, 1), 100);
        const totalBytes = sizeMbClamped * 1024 * 1024;
        const chunkSize = 64 * 1024; // 64KB

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', String(totalBytes));
        res.setHeader('Cache-Control', 'no-store');

        const start = process.hrtime.bigint();
        let sent = 0;
        try {
            while (sent < totalBytes) {
                const remaining = totalBytes - sent;
                const len = Math.min(chunkSize, remaining);
                const chunk = randomBytes(len);
                const ok = res.write(chunk);
                sent += len;
                if (!ok) {
                    await new Promise<void>(resolve => res.once('drain', () => resolve()));
                }
            }
            res.end();
        } catch (err) {
            this.logger.warn(`speedtest/download 실패: ${(err as Error).message}`);
        }

        const durationMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
        this.metrics.record({
            kind: 'speedtest',
            phase: 'b2_download',
            endpoint: '/upload/speedtest/download',
            userId: req.user?.sub || req.user?.id || null,
            userType: req.user?.type || null,
            fileSize: sent,
            durationMs,
            success: sent === totalBytes,
        });
    }

    @Post('metrics/record')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle({ default: { ttl: 60000, limit: 300 } })
    @ApiOperation({ summary: '클라이언트 측 업로드 메트릭 기록 — 멀티파트 client_to_b2 직접 PUT 속도 등' })
    async recordClientMetric(@Body() body: any, @Request() req: any) {
        const allowedPhases = ['client_to_api', 'api_to_b2', 'b2_download', 'client_to_b2'] as const;
        const allowedKinds = ['real', 'speedtest'] as const;

        const kind = body?.kind;
        const phase = body?.phase;
        if (!allowedKinds.includes(kind)) {
            throw new BadRequestException(`kind 는 ${allowedKinds.join(', ')} 중 하나여야 합니다.`);
        }
        if (!allowedPhases.includes(phase)) {
            throw new BadRequestException(`phase 는 ${allowedPhases.join(', ')} 중 하나여야 합니다.`);
        }

        const fileSize = Number(body?.fileSize);
        const durationMs = Number(body?.durationMs);
        if (!Number.isFinite(fileSize) || fileSize < 0) {
            throw new BadRequestException('fileSize 가 유효하지 않습니다.');
        }
        if (!Number.isFinite(durationMs) || durationMs < 0) {
            throw new BadRequestException('durationMs 가 유효하지 않습니다.');
        }

        this.metrics.record({
            kind,
            phase,
            endpoint: typeof body?.endpoint === 'string' ? body.endpoint : null,
            userId: req.user?.sub || req.user?.id || null,
            userType: req.user?.type || null,
            fileSize,
            durationMs,
            success: body?.success !== false,
            errorMessage: typeof body?.errorMessage === 'string' ? body.errorMessage : null,
            clientIp: req.ip || null,
            userAgent: req.headers?.['user-agent'] || null,
            metadata: body?.metadata && typeof body.metadata === 'object' ? body.metadata : null,
        });

        return { ok: true };
    }

    @Get('metrics/summary')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '업로드 메트릭 요약 (관리자 전용)' })
    @ApiQuery({ name: 'range', required: false, enum: ['1h', '24h', '7d', '30d'] })
    async getMetricsSummary(@Query('range') range: '1h' | '24h' | '7d' | '30d' | undefined, @Request() req: any) {
        this.assertStaff(req);
        return this.metrics.getSummary(range ?? '24h');
    }

    @Get('metrics/timeseries')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '업로드 메트릭 시계열 (관리자 전용)' })
    @ApiQuery({ name: 'kind', required: false, enum: ['real', 'speedtest'] })
    @ApiQuery({ name: 'phase', required: false, enum: ['client_to_api', 'api_to_b2', 'b2_download', 'client_to_b2'] })
    @ApiQuery({ name: 'groupBy', required: false, enum: ['hour', 'day', 'week', 'month'] })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    async getMetricsTimeseries(
        @Query('kind') kind: 'real' | 'speedtest' | undefined,
        @Query('phase') phase: 'client_to_api' | 'api_to_b2' | 'b2_download' | 'client_to_b2' | undefined,
        @Query('groupBy') groupBy: 'hour' | 'day' | 'week' | 'month' | undefined,
        @Query('startDate') startDate: string | undefined,
        @Query('endDate') endDate: string | undefined,
        @Request() req: any,
    ) {
        this.assertStaff(req);
        return this.metrics.getTimeSeries({
            kind,
            phase,
            groupBy,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }

    @Get('metrics/recent')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '최근 업로드 메트릭 (관리자 전용)' })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'kind', required: false, enum: ['real', 'speedtest'] })
    async getMetricsRecent(
        @Query('limit') limit: string | undefined,
        @Query('kind') kind: 'real' | 'speedtest' | undefined,
        @Request() req: any,
    ) {
        this.assertStaff(req);
        const lim = limit ? parseInt(limit, 10) : 50;
        return this.metrics.getRecent(Number.isFinite(lim) ? lim : 50, kind);
    }

    @Get('metrics/export')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '업로드 메트릭 전체 다운로드 (관리자 전용, CSV/JSON)' })
    @ApiQuery({ name: 'from', required: false, description: 'ISO date (default: 7일 전)' })
    @ApiQuery({ name: 'to', required: false, description: 'ISO date (default: 지금)' })
    @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'], description: 'default: csv' })
    @ApiQuery({ name: 'kind', required: false, enum: ['real', 'speedtest'] })
    @ApiQuery({ name: 'phase', required: false, enum: ['client_to_api', 'api_to_b2', 'b2_download', 'client_to_b2'] })
    async exportMetrics(
        @Query('from') fromStr: string | undefined,
        @Query('to') toStr: string | undefined,
        @Query('format') format: 'csv' | 'json' | undefined,
        @Query('kind') kind: 'real' | 'speedtest' | undefined,
        @Query('phase') phase: 'client_to_api' | 'api_to_b2' | 'b2_download' | 'client_to_b2' | undefined,
        @Request() req: any,
        @Res() res: Response,
    ): Promise<void> {
        this.assertStaff(req);

        const now = new Date();
        const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const from = fromStr ? new Date(fromStr) : defaultFrom;
        const to = toStr ? new Date(toStr) : now;

        if (isNaN(from.getTime()) || isNaN(to.getTime())) {
            throw new BadRequestException('from/to 는 유효한 ISO date 여야 합니다.');
        }
        if (from > to) {
            throw new BadRequestException('from 은 to 보다 이전이어야 합니다.');
        }

        const fmt: 'csv' | 'json' = format === 'json' ? 'json' : 'csv';
        const fromTag = from.toISOString().slice(0, 10);
        const toTag = to.toISOString().slice(0, 10);
        const filename = `upload-metrics-${fromTag}_${toTag}.${fmt}`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-store');

        const iter = this.metrics.iterateMetrics({ from, to, kind, phase });

        if (fmt === 'csv') {
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            // UTF-8 BOM (엑셀 한글 깨짐 방지)
            res.write('﻿');
            const headers = [
                'id', 'createdAt', 'kind', 'phase', 'endpoint',
                'userId', 'userType', 'fileSize', 'durationMs', 'speedKbps',
                'success', 'errorMessage', 'clientIp', 'countryCode', 'userAgent', 'metadata',
            ];
            res.write(headers.join(',') + '\n');
            for await (const row of iter) {
                const line = [
                    csvEscape(row.id),
                    csvEscape(row.createdAt),
                    csvEscape(row.kind),
                    csvEscape(row.phase),
                    csvEscape(row.endpoint),
                    csvEscape(row.userId),
                    csvEscape(row.userType),
                    csvEscape(row.fileSize),
                    csvEscape(row.durationMs),
                    csvEscape(row.speedKbps),
                    csvEscape(row.success),
                    csvEscape(row.errorMessage),
                    csvEscape(row.clientIp),
                    csvEscape(row.countryCode),
                    csvEscape(row.userAgent),
                    csvEscape(row.metadata === null || row.metadata === undefined ? '' : JSON.stringify(row.metadata)),
                ].join(',');
                if (!res.write(line + '\n')) {
                    await new Promise<void>(resolve => res.once('drain', () => resolve()));
                }
            }
            res.end();
        } else {
            // NDJSON: newline-delimited JSON (한 줄에 한 객체)
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            for await (const row of iter) {
                if (!res.write(JSON.stringify(row) + '\n')) {
                    await new Promise<void>(resolve => res.once('drain', () => resolve()));
                }
            }
            res.end();
        }
    }

    @Get('metrics/stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '기간별 업로드 통계 — 일/월/분기/연 (관리자 전용)' })
    @ApiQuery({ name: 'period', required: false, enum: ['day', 'month', 'quarter', 'year'] })
    async getMetricsStats(
        @Query('period') period: 'day' | 'month' | 'quarter' | 'year' | undefined,
        @Request() req: any,
    ) {
        this.assertStaff(req);
        return this.metrics.getAggregatedStats(period ?? 'month');
    }

    @Get('metrics/weekday-stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '요일별 업로드 통계 — 일~토 (관리자 전용)' })
    async getMetricsWeekdayStats(@Request() req: any) {
        this.assertStaff(req);
        return this.metrics.getWeekdayStats();
    }

    @Get('metrics/storage-overview')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'B2 버킷·DB 스토리지 사용 현황 + 비용 조회 (관리자 전용)' })
    async getStorageOverview(@Request() req: any) {
        this.assertStaff(req);
        return this.metrics.getStorageOverview(this.b2Storage);
    }

    @Get('metrics/config')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '업로드 메트릭 설정 조회 (관리자 전용)' })
    async getMetricsConfig(@Request() req: any) {
        this.assertStaff(req);
        return {
            sampleRate: this.metrics.getSampleRate(),
            b2SampleRate: this.metrics.getB2SampleRate(),
            multipartChunkSize: this.metrics.getMultipartChunkSize(),
            multipartConcurrency: this.metrics.getMultipartConcurrency(),
        };
    }

    @Patch('metrics/config')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: '샘플링 비율/멀티파트 튜닝 변경 (관리자 전용, 서버 재시작 시 env 기본값으로 초기화)' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                sampleRate: { type: 'number', description: '실 업로드 메트릭 샘플링 비율 0~1' },
                b2SampleRate: { type: 'number', description: '클라이언트→B2 직접 업로드 샘플링 비율 0~1' },
                multipartChunkSize: { type: 'number', description: '멀티파트 업로드 청크 크기 bytes (5242880~104857600)' },
                multipartConcurrency: { type: 'number', description: '멀티파트 동시 청크 개수 (1~32)' },
            },
        },
    })
    async updateMetricsConfig(
        @Body() body: {
            sampleRate?: number;
            b2SampleRate?: number;
            multipartChunkSize?: number;
            multipartConcurrency?: number;
        },
        @Request() req: any,
    ) {
        this.assertStaff(req);
        if (body.sampleRate !== undefined) this.metrics.setSampleRate(body.sampleRate);
        if (body.b2SampleRate !== undefined) this.metrics.setB2SampleRate(body.b2SampleRate);
        if (body.multipartChunkSize !== undefined) this.metrics.setMultipartChunkSize(body.multipartChunkSize);
        if (body.multipartConcurrency !== undefined) this.metrics.setMultipartConcurrency(body.multipartConcurrency);
        return {
            sampleRate: this.metrics.getSampleRate(),
            b2SampleRate: this.metrics.getB2SampleRate(),
            multipartChunkSize: this.metrics.getMultipartChunkSize(),
            multipartConcurrency: this.metrics.getMultipartConcurrency(),
        };
    }

    // ==================== 클라이언트 진단 (Diagnostics) ====================

    @Public()
    @Get('diagnostics/me')
    @Throttle({ default: { ttl: 60000, limit: 60 } })
    @ApiOperation({ summary: '클라이언트 위치/회선 진단 정보 반환' })
    async diagnosticsMe(@Request() req: any) {
        const h = (name: string): string | null => {
            const v = req.headers?.[name.toLowerCase()];
            if (Array.isArray(v)) return v[0] ?? null;
            return (v as string | undefined) ?? null;
        };

        const cfRay = h('cf-ray');
        const cfColo =
            typeof cfRay === 'string' && cfRay.includes('-')
                ? cfRay.split('-').pop() ?? null
                : null;

        return {
            ip: h('cf-connecting-ip') || (req.ip ?? null),
            country: h('cf-ipcountry') || null,
            city: h('cf-ipcity') || null,
            region: h('cf-region') || null,
            continent: h('cf-ipcontinent') || null,
            cfRay: cfRay || null,
            cfColo,
            userAgent: h('user-agent') || null,
            acceptLanguage: h('accept-language') || null,
            forwardedFor: h('x-forwarded-for') || null,
            protocol: req.protocol || null,
            server: {
                region: process.env.RAILWAY_REGION || process.env.SERVER_REGION || 'us-west2',
                nodeVersion: process.version,
                nowIso: new Date().toISOString(),
            },
        };
    }

    @Public()
    @Get('diagnostics/ping')
    @Throttle({ default: { ttl: 60000, limit: 120 } })
    @ApiOperation({ summary: 'RTT 측정용 작은 페이로드 응답 (캐시 금지)' })
    async diagnosticsPing(@Res() res: Response) {
        res.setHeader('Cache-Control', 'no-store');
        res.json({ ok: true, ts: Date.now() });
    }

    @Post('speedtest/api-put')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Throttle({ default: { ttl: 60000, limit: 30 } })
    @ApiOperation({ summary: 'API 경유 단일 PUT 속도 테스트 — 받은 파일을 즉시 폐기 (관리자 전용, path-comparison 라벨 구분용)' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: { file: { type: 'string', format: 'binary' } },
        },
    })
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 100 * 1024 * 1024 }, // 100MB 상한
        }),
    )
    speedtestApiPut(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
        this.assertStaff(req);
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }
        const size = file.size;
        // 메모리 즉시 폐기 (참조 끊기)
        (file as any).buffer = null;
        return {
            sizeBytes: size,
            sizeMb: +(size / 1024 / 1024).toFixed(2),
            message: 'received',
        };
    }
}
