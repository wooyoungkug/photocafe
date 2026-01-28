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
            url: `/api/v1/upload/category-icons/${file.filename}`,
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
}
