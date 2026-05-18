import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { copyFile, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { PrismaService } from '@/common/prisma/prisma.service';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';
import { getUploadBasePath } from '@/modules/upload/services/file-storage.service';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  role: string;
  clientId?: string;
}

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'text/'];
const ALLOWED_MIMES = new Set([
  // Office
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 압축
  'application/zip',
  'application/x-zip-compressed',
  // 디자인 원본 (인쇄업 특성)
  'application/postscript',
  'application/illustrator',
  'application/x-photoshop',
  'image/vnd.adobe.photoshop',
  'application/x-indesign',
  'application/x-coreldraw',
  'application/eps',
  'image/x-eps',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ai', '.psd', '.eps', '.indd', '.idml', '.cdr',
  '.sketch', '.fig', '.xd',
]);

const PRESIGN_TTL_SECONDS = 600; // 10분

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\.\./g, '_').slice(0, 200);
}

function isAllowedFile(mime: string, fileName: string): boolean {
  if (ALLOWED_MIMES.has(mime)) return true;
  if (ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;
  const ext = extname(fileName).toLowerCase();
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;
  return false;
}

function isZipLike(mime: string, fileName: string): boolean {
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return true;
  return extname(fileName).toLowerCase() === '.zip';
}

@Injectable()
export class NoteAttachmentService {
  private readonly logger = new Logger(NoteAttachmentService.name);
  private readonly maxBytesAny: number;
  private readonly maxBytesGeneral: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly b2: B2StorageService,
    config: ConfigService,
  ) {
    const generalMb = parseInt(config.get<string>('NOTE_ATTACHMENT_MAX_MB') || '500', 10);
    const anyMb = parseInt(config.get<string>('NOTE_ATTACHMENT_MAX_ANY_MB') || '1024', 10);
    this.maxBytesGeneral =
      (Number.isFinite(generalMb) && generalMb > 0 ? generalMb : 500) * 1024 * 1024;
    this.maxBytesAny =
      (Number.isFinite(anyMb) && anyMb > 0 ? anyMb : 1024) * 1024 * 1024;
  }

  async upload(noteId: string, file: Express.Multer.File, user: CurrentUser) {
    if (!file) throw new BadRequestException('파일이 없습니다.');

    const tmpPath = (file as any).path as string | undefined;
    try {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const isZip = isZipLike(file.mimetype, originalName);
      const limit = isZip ? this.maxBytesAny : this.maxBytesGeneral;
      if (file.size > limit) {
        throw new BadRequestException(
          `파일 크기가 너무 큽니다. (최대 ${Math.round(limit / 1024 / 1024)}MB${
            isZip ? '' : ', ZIP은 1GB'
          })`,
        );
      }
      if (!isAllowedFile(file.mimetype, originalName)) {
        throw new BadRequestException(`지원하지 않는 파일 형식입니다: ${file.mimetype}`);
      }
      await this.assertNoteEditable(noteId, user);

      const safeName = sanitizeFileName(originalName);
      const stamp = Date.now();
      const id = randomUUID();
      const ext = extname(safeName);
      const baseName = safeName.slice(0, safeName.length - ext.length).slice(0, 80);
      const fileName = `${stamp}_${id}_${baseName}${ext}`;
      const storageKey = `notes/${user.id}/${noteId}/${fileName}`;

      if (!tmpPath) {
        throw new BadRequestException('업로드 임시파일을 찾을 수 없습니다.');
      }

      let url = '';
      if (this.b2.isEnabled()) {
        try {
          await this.b2.putPrivateObjectFromPath(storageKey, tmpPath, file.mimetype);
          url = await this.b2.getPrivatePresignedUrl(storageKey, PRESIGN_TTL_SECONDS);
        } catch (e: any) {
          this.logger.error(`B2 upload failed: ${e?.message}`);
          throw new BadRequestException('파일 업로드에 실패했습니다.');
        }
      } else {
        const dir = join(getUploadBasePath(), 'notes', user.id, noteId);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        const destPath = join(dir, fileName);
        await copyFile(tmpPath, destPath);
        url = `/uploads/notes/${user.id}/${noteId}/${encodeURIComponent(fileName)}`;
      }

      const att = await this.prisma.noteAttachment.create({
        data: {
          noteId,
          url,
          storageKey,
          fileName: originalName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          uploadedBy: user.id,
        },
      });

      return this.toResponse(att);
    } finally {
      if (tmpPath) {
        unlink(tmpPath).catch(() => undefined);
      }
    }
  }

  async list(noteId: string, user: CurrentUser) {
    await this.assertNoteAccess(noteId, user);
    const items = await this.prisma.noteAttachment.findMany({
      where: { noteId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(items.map((a) => this.toResponse(a)));
  }

  async getFreshUrl(id: string, user: CurrentUser) {
    const att = await this.prisma.noteAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    await this.assertNoteAccess(att.noteId, user);
    return { url: await this.resolveUrl(att) };
  }

  async delete(id: string, user: CurrentUser) {
    const att = await this.prisma.noteAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('첨부파일을 찾을 수 없습니다.');
    await this.assertNoteEditable(att.noteId, user);

    if (this.b2.isEnabled() && att.storageKey) {
      try {
        await this.b2.deletePrivateObject(att.storageKey, {
          fileSize: att.sizeBytes ?? 0,
          userId: user.id,
          endpoint: 'note-attachment.delete',
        });
      } catch (e: any) {
        this.logger.warn(`B2 delete failed (continuing): ${e?.message}`);
      }
    } else if (att.storageKey) {
      const localPath = join(getUploadBasePath(), att.storageKey);
      try {
        await unlink(localPath);
      } catch {
        // 파일이 이미 없을 수 있음
      }
    }

    await this.prisma.noteAttachment.delete({ where: { id } });
    return { ok: true };
  }

  private async assertNoteAccess(noteId: string, user: CurrentUser) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다.');
    const sameTenant =
      (user.clientId && note.clientId && note.clientId === user.clientId) ||
      (!user.clientId && !note.clientId);
    if (!sameTenant) throw new ForbiddenException('접근 권한이 없습니다.');
    if (user.role === 'admin') return;
    if (note.creatorId === user.id) return;
    if (note.isCompany) return;
    if (note.isDepartment && note.creatorDeptId === user.departmentId) return;
    throw new ForbiddenException('접근 권한이 없습니다.');
  }

  private async assertNoteEditable(noteId: string, user: CurrentUser) {
    const note = await this.prisma.note.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('노트를 찾을 수 없습니다.');
    if (user.role === 'admin') return;
    if (note.creatorId === user.id) return;
    throw new ForbiddenException('수정 권한이 없습니다.');
  }

  private async resolveUrl(att: {
    url: string;
    storageKey: string | null;
    fileName?: string | null;
  }): Promise<string> {
    if (this.b2.isEnabled() && att.storageKey) {
      try {
        return await this.b2.getPrivatePresignedUrl(att.storageKey, PRESIGN_TTL_SECONDS, {
          downloadFileName: att.fileName ?? undefined,
        });
      } catch (e: any) {
        this.logger.warn(`B2 presign failed: ${e?.message}`);
      }
    }
    return att.url;
  }

  private async toResponse(att: any) {
    return {
      id: att.id,
      noteId: att.noteId,
      url: await this.resolveUrl(att),
      fileName: att.fileName,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      uploadedBy: att.uploadedBy,
      createdAt: att.createdAt,
    };
  }
}
