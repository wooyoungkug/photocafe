import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get, Param, Res, Body, Delete } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { FileStorageService, getUploadBasePath } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';

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

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
    constructor(
        private readonly fileStorage: FileStorageService,
        private readonly thumbnailService: ThumbnailService,
    ) {}

    // ==================== 앨범 원본 파일 업로드 ====================

    @Post('album-file')
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
            storage: diskStorage({
                destination: (req: any, _file, cb) => {
                    const tempFolderId = req.body?.tempFolderId;
                    if (!tempFolderId) {
                        return cb(new BadRequestException('tempFolderId가 필요합니다.'), '');
                    }
                    // 경로 탐색 공격 방지: ../ 및 경로 구분자 제거
                    const safeTempFolderId = tempFolderId
                        .replace(/\.\./g, '')
                        .replace(/[/\\]/g, '')
                        .trim();
                    if (!safeTempFolderId) {
                        return cb(new BadRequestException('유효하지 않은 tempFolderId입니다.'), '');
                    }
                    const dir = join(getUploadBasePath(), 'temp', safeTempFolderId, 'originals');
                    if (!existsSync(dir)) {
                        mkdirSync(dir, { recursive: true });
                    }
                    cb(null, dir);
                },
                filename: (req: any, file, cb) => {
                    // multer는 latin1로 파일명을 디코딩하므로 UTF-8로 재변환
                    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
                    file.originalname = originalName;
                    const sortOrder = parseInt(req.body?.sortOrder || '0', 10);
                    const ext = extname(originalName).toLowerCase();
                    const safeName = originalName
                        .replace(/[<>:"/\\|?*]/g, '_')
                        .replace(/\.\./g, '_')
                        .trim();
                    const base = safeName.slice(0, -ext.length).slice(0, 80);
                    const prefix = sortOrder.toString().padStart(2, '0');
                    cb(null, `${prefix}_${base}${ext}`);
                },
            }),
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.match(/^image\/(jpg|jpeg|png|tiff|webp)$/)) {
                    return cb(new BadRequestException('이미지 파일만 업로드 가능합니다.'), false);
                }
                cb(null, true);
            },
            limits: {
                fileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '52428800', 10),
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

        const fileUrl = this.fileStorage.toRelativeUrl(file.path);

        // 썸네일은 완전 비동기(fire-and-forget) — 응답을 전혀 블로킹하지 않음
        const thumbDir = this.fileStorage.getTempThumbnailDir(body.tempFolderId);
        this.thumbnailService.generateThumbnail(
            file.path,
            thumbDir,
            file.filename,
        ).catch(() => { /* 썸네일 실패해도 원본은 정상 */ });

        // 썸네일 URL을 예측 가능한 경로로 즉시 반환 (파일명 규칙: {base}_thumb.jpg)
        const ext = extname(file.filename);
        const base = file.filename.slice(0, -ext.length);
        const thumbnailUrl = `/uploads/temp/${body.tempFolderId}/thumbnails/${base}_thumb.jpg`;

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

    @Delete('temp/:tempFolderId')
    @ApiOperation({ summary: '임시 업로드 파일 삭제' })
    deleteTempFolder(@Param('tempFolderId') tempFolderId: string) {
        this.fileStorage.cleanupTempFolder(tempFolderId);
        return { message: '임시 파일이 삭제되었습니다.' };
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
}
