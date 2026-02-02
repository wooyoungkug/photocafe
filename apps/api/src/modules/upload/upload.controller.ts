import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException, Get, Param, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// uploads 디렉토리 생성
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

const categoryIconsDir = join(UPLOAD_DIR, 'category-icons');
if (!existsSync(categoryIconsDir)) {
    mkdirSync(categoryIconsDir, { recursive: true });
}

// 동판 관련 디렉토리
const copperPlateDir = join(UPLOAD_DIR, 'copper-plates');
const copperPlateAiDir = join(copperPlateDir, 'ai');
const copperPlateImageDir = join(copperPlateDir, 'images');
const copperPlateAlbumDir = join(copperPlateDir, 'albums');

[copperPlateDir, copperPlateAiDir, copperPlateImageDir, copperPlateAlbumDir].forEach(dir => {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
});

@ApiTags('Upload')
@Controller('upload')
export class UploadController {

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
                destination: categoryIconsDir,
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
            url: `/upload/category-icons/${file.filename}`,
        };
    }

    @Get('category-icons/:filename')
    @ApiOperation({ summary: '카테고리 아이콘 조회' })
    getCategoryIcon(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(categoryIconsDir, filename);

        if (!existsSync(filePath)) {
            return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        }

        return res.sendFile(filePath);
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
                destination: copperPlateAiDir,
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
            url: `/upload/copper-plate/ai/${file.filename}`,
        };
    }

    @Get('copper-plate/ai/:filename')
    @ApiOperation({ summary: '동판 AI 파일 조회' })
    getCopperPlateAi(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(copperPlateAiDir, filename);

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
                destination: copperPlateImageDir,
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
            url: `/upload/copper-plate/image/${file.filename}`,
        };
    }

    @Get('copper-plate/image/:filename')
    @ApiOperation({ summary: '동판 이미지 파일 조회' })
    getCopperPlateImage(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(copperPlateImageDir, filename);

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
                destination: copperPlateAlbumDir,
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
            url: `/upload/copper-plate/album/${file.filename}`,
        };
    }

    @Get('copper-plate/album/:filename')
    @ApiOperation({ summary: '동판 앨범 이미지 조회' })
    getCopperPlateAlbum(@Param('filename') filename: string, @Res() res: Response) {
        const filePath = join(copperPlateAlbumDir, filename);

        if (!existsSync(filePath)) {
            return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
        }

        return res.sendFile(filePath);
    }
}
