import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NoteAttachmentService } from '../services/note-attachment.service';

// 일반 파일은 500MB, ZIP 은 1GB까지 허용. multer는 MIME 타입과 무관하게 가장
// 큰 한도(=ZIP 한도)로 받아두고, 서비스 레이어에서 형식별 한도를 다시 검증한다.
const MAX_BYTES_ANY =
  (parseInt(process.env.NOTE_ATTACHMENT_MAX_ANY_MB || '1024', 10) || 1024) * 1024 * 1024;

const TMP_DIR = join(tmpdir(), 'photocafe-note-attachments');
if (!existsSync(TMP_DIR)) mkdirSync(TMP_DIR, { recursive: true });

@ApiTags('노트 첨부파일')
@Controller()
export class NoteAttachmentController {
  constructor(private readonly service: NoteAttachmentService) {}

  @Post('notes/:noteId/attachments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '노트 첨부파일 업로드' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, TMP_DIR),
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname || '').slice(0, 16);
          cb(null, `${Date.now()}_${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: MAX_BYTES_ANY },
    }),
  )
  upload(
    @Param('noteId') noteId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('파일이 없습니다.');
    return this.service.upload(noteId, file, req.user);
  }

  @Get('notes/:noteId/attachments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트 첨부파일 목록' })
  list(@Param('noteId') noteId: string, @Req() req: any) {
    return this.service.list(noteId, req.user);
  }

  @Get('attachments/:id/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '첨부파일 새 다운로드 URL (프리사인드 URL은 만료됨)' })
  refreshUrl(@Param('id') id: string, @Req() req: any) {
    return this.service.getFreshUrl(id, req.user);
  }

  @Delete('attachments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '첨부파일 삭제' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user);
  }
}
