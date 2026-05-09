import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateNoteTagDto, UpdateNoteTagDto } from '../dto';

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  clientId?: string;
}

@Injectable()
export class NoteTagService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNoteTagDto, user: CurrentUser) {
    const trimmed = dto.name.trim();
    if (!trimmed) {
      throw new ConflictException('태그 이름은 비울 수 없습니다.');
    }
    try {
      return await this.prisma.noteTag.create({
        data: {
          clientId: user.clientId || null,
          ownerId: user.id,
          name: trimmed,
          color: dto.color || '#94A3B8',
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('같은 이름의 태그가 이미 존재합니다.');
      }
      throw e;
    }
  }

  async findAll(user: CurrentUser) {
    return this.prisma.noteTag.findMany({
      where: { ownerId: user.id },
      orderBy: { name: 'asc' },
      include: { _count: { select: { memos: true } } },
    });
  }

  async update(id: string, dto: UpdateNoteTagDto, user: CurrentUser) {
    const tag = await this.prisma.noteTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다.');
    if (tag.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }
    try {
      return await this.prisma.noteTag.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('같은 이름의 태그가 이미 존재합니다.');
      }
      throw e;
    }
  }

  async delete(id: string, user: CurrentUser) {
    const tag = await this.prisma.noteTag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('태그를 찾을 수 없습니다.');
    if (tag.ownerId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }
    await this.prisma.noteTag.delete({ where: { id } });
    return { ok: true };
  }
}
