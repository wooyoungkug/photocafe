import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException, Get, Param, Res, Body, Delete, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, createReadStream, statSync, unlinkSync } from 'fs';
import { writeFile as fsWriteFile } from 'fs/promises';
import { Response } from 'express';
import { FileStorageService, getUploadBasePath } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';
import { B2StorageService } from './services/b2-storage.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Public } from '@/common/decorators/public.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

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

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);

    constructor(
        private readonly fileStorage: FileStorageService,
        private readonly thumbnailService: ThumbnailService,
        private readonly b2Storage: B2StorageService,
        private readonly prisma: PrismaService,
    ) {}

    /** tempFolderId 정규화 (경로 탐색 방지) */
    private sanitizeTempFolderId(value: string | undefined | null): string {
        return (value || '')
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            .trim();
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
            storage: memoryStorage(),
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
    ) {
        if (!file) {
            throw new BadRequestException('파일이 업로드되지 않았습니다.');
        }

        // Magic number 검증 — MIME 헤더는 조작 가능하므로 파일 실제 바이트로 재확인
        // JPEG: FF D8 FF | PNG: 89 50 4E 47 | TIFF(LE): 49 49 2A 00 | TIFF(BE): 4D 4D 00 2A | WEBP: 52 49 46 46...57 45 42 50
        const sig = file.buffer.slice(0, 12);
        const isJpeg = sig[0] === 0xFF && sig[1] === 0xD8 && sig[2] === 0xFF;
        const isPng  = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47;
        const isTiff = (sig[0] === 0x49 && sig[1] === 0x49 && sig[2] === 0x2A) ||
                       (sig[0] === 0x4D && sig[1] === 0x4D && sig[3] === 0x2A);
        const isWebp = sig[0] === 0x52 && sig[1] === 0x49 && sig[2] === 0x46 && sig[3] === 0x46 &&
                       sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50;
        if (!isJpeg && !isPng && !isTiff && !isWebp) {
            throw new BadRequestException('지원하지 않는 파일 형식입니다. (jpg, png, tif, webp만 허용)');
        }

        // 경로 탐색 공격 방지
        const safeTempFolderId = (body.tempFolderId || '')
            .replace(/\.\./g, '')
            .replace(/[/\\]/g, '')
            .trim();
        if (!safeTempFolderId) {
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

        // 메모리 버퍼를 디스크에 비동기 쓰기 (이벤트 루프 블로킹 방지)
        const filePath = join(dir, filename);
        await fsWriteFile(filePath, file.buffer);

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

    @Public()
    @Get('temp/:tempFolderId/files')
    @Throttle({ default: { ttl: 60000, limit: 60 } })
    @ApiOperation({ summary: '임시 업로드 파일 목록 조회' })
    listTempFiles(@Param('tempFolderId') tempFolderId: string) {
        const safeTempFolderId = this.sanitizeTempFolderId(tempFolderId);
        if (!safeTempFolderId) {
            throw new BadRequestException('유효하지 않은 tempFolderId입니다.');
        }

        const diskResult = this.fileStorage.listTempFiles(safeTempFolderId);
        const files = (diskResult?.files ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
        return {
            tempFolderId: safeTempFolderId,
            files,
            totalCount: files.length,
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
}
