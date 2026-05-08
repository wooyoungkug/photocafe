import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  FileStorageService,
  getUploadBasePath,
} from '../../upload/services/file-storage.service';
import { PurchaseQuotationService } from '../services/purchase-quotation.service';
import {
  CreatePurchaseQuotationDto,
  UpdatePurchaseQuotationDto,
  PurchaseQuotationQueryDto,
} from '../dto';

function ensureDir(subPath: string): string {
  const dir = join(getUploadBasePath(), subPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

@ApiTags('PurchaseQuotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-quotations')
export class PurchaseQuotationController {
  constructor(
    private readonly service: PurchaseQuotationService,
    private readonly fileStorage: FileStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: '매입처 견적 목록 조회' })
  @ApiResponse({ status: 200, description: '매입처 견적 목록' })
  async findAll(@Query() query: PurchaseQuotationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '매입처 견적 상세' })
  @ApiResponse({ status: 200, description: '매입처 견적 상세' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '매입처 견적 등록' })
  @ApiResponse({ status: 201, description: '등록 성공' })
  async create(
    @Body() dto: CreatePurchaseQuotationDto,
    @Request() req: any,
  ) {
    const staffId = req.user?.type === 'staff' ? req.user.sub : undefined;
    return this.service.create(dto, staffId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '매입처 견적 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseQuotationDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '매입처 견적 삭제' })
  @ApiResponse({ status: 200, description: '삭제 성공' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post('upload')
  @ApiOperation({
    summary: '매입처 견적 첨부파일 업로드 (PDF/JPG/PNG, 최대 50MB)',
  })
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
        destination: (_req, _file, cb) =>
          cb(null, ensureDir('purchase-quotations')),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(pdf|jpg|jpeg|png|webp)$/i;
        if (!allowed.test(file.originalname)) {
          return cb(
            new BadRequestException(
              'PDF, JPG, PNG, WEBP 파일만 업로드 가능합니다.',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일이 업로드되지 않았습니다.');
    }
    const originalName = Buffer.from(file.originalname, 'latin1').toString(
      'utf8',
    );
    return {
      name: originalName,
      url: this.fileStorage.toRelativeUrl(file.path),
      type: file.mimetype,
      size: file.size,
    };
  }
}
