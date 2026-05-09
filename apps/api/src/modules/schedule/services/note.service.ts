import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto, QueryNoteDto } from '../dto';
import { sanitizeMemoContent } from '../utils/sanitize-memo-content';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
  clientId?: string;
}

const NOTE_INCLUDE = {
  notebook: { select: { id: true, name: true, color: true, icon: true } },
  tags: { include: { tag: true } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class NoteService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNoteDto, user: CurrentUser) {
    const format = dto.contentFormat || 'html';
    const safeContent = sanitizeMemoContent(dto.content, format);

    if (dto.notebookId) {
      await this.assertNotebookAccess(dto.notebookId, user);
    }

    const note = await this.prisma.note.create({
      data: {
        clientId: user.clientId || null,
        creatorId: user.id,
        creatorName: user.name || '사용자',
        creatorDeptId: user.departmentId || null,
        creatorDeptName: user.departmentName || null,
        title: dto.title || '',
        content: safeContent,
        contentFormat: format,
        notebookId: dto.notebookId || null,
        color: dto.color || '#FEF9C3',
        isPersonal: dto.isPersonal ?? true,
        isDepartment: dto.isDepartment ?? false,
        isCompany: dto.isCompany ?? false,
        lastEditedAt: new Date(),
      },
    });

    if (dto.tagIds?.length) {
      await this.replaceTags(note.id, dto.tagIds, user);
    }

    return this.prisma.note.findUnique({
      where: { id: note.id },
      include: NOTE_INCLUDE,
    });
  }

  async findAll(query: QueryNoteDto, user: CurrentUser) {
    const where: any = {
      ...(user.clientId ? { clientId: user.clientId } : { clientId: null }),
    };

    if (query.notebookId === 'uncategorized') {
      where.notebookId = null;
    } else if (query.notebookId) {
      where.notebookId = query.notebookId;
    }

    if (query.tagId) {
      where.tags = { some: { tagId: query.tagId } };
    }

    if (query.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { content: { contains: query.search, mode: 'insensitive' } },
            { tags: { some: { tag: { name: { contains: query.search, mode: 'insensitive' } } } } },
          ],
        },
      ];
    }

    const scopeConditions: any[] = [];

    if (query.scope === 'personal' || query.scope === 'all' || !query.scope) {
      scopeConditions.push({
        creatorId: user.id,
        isPersonal: true,
      });
    }

    if (query.scope === 'department' || query.scope === 'all' || !query.scope) {
      if (user.departmentId) {
        scopeConditions.push({
          isDepartment: true,
          creatorDeptId: user.departmentId,
        });
      }
    }

    if (query.scope === 'company' || query.scope === 'all' || !query.scope) {
      scopeConditions.push({
        isCompany: true,
      });
    }

    if (user.role !== 'admin' && scopeConditions.length > 0) {
      where.AND = where.AND
        ? [...where.AND, { OR: scopeConditions }]
        : [{ OR: scopeConditions }];
    }

    return this.prisma.note.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { lastEditedAt: 'desc' }, { updatedAt: 'desc' }],
      include: NOTE_INCLUDE,
    });
  }

  async findOne(id: string, user: CurrentUser) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: NOTE_INCLUDE,
    });

    if (!note) {
      throw new NotFoundException('노트를 찾을 수 없습니다.');
    }

    if (!this.canAccess(note, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return note;
  }

  async update(id: string, dto: UpdateNoteDto, user: CurrentUser) {
    const note = await this.findOne(id, user);

    if (!this.canEdit(note, user)) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    if (dto.notebookId) {
      await this.assertNotebookAccess(dto.notebookId, user);
    }

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPersonal !== undefined) updateData.isPersonal = dto.isPersonal;
    if (dto.isDepartment !== undefined) updateData.isDepartment = dto.isDepartment;
    if (dto.isCompany !== undefined) updateData.isCompany = dto.isCompany;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;
    if (dto.notebookId !== undefined) updateData.notebookId = dto.notebookId || null;
    if (dto.summary !== undefined) updateData.summary = dto.summary;

    if (dto.content !== undefined || dto.contentFormat !== undefined) {
      const nextFormat = (dto.contentFormat ?? note.contentFormat) as 'text' | 'html';
      const nextContent = dto.content ?? note.content;
      updateData.content = sanitizeMemoContent(nextContent, nextFormat);
      updateData.contentFormat = nextFormat;
      updateData.lastEditedAt = new Date();
    }

    await this.prisma.note.update({
      where: { id },
      data: updateData,
    });

    if (dto.tagIds !== undefined) {
      await this.replaceTags(id, dto.tagIds, user);
    }

    return this.prisma.note.findUnique({ where: { id }, include: NOTE_INCLUDE });
  }

  async delete(id: string, user: CurrentUser) {
    const note = await this.findOne(id, user);

    if (!this.canDelete(note, user)) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    return this.prisma.note.delete({ where: { id } });
  }

  private async replaceTags(noteId: string, tagIds: string[], user: CurrentUser) {
    if (!tagIds.length) {
      await this.prisma.noteTagLink.deleteMany({ where: { noteId } });
      return;
    }
    const tags = await this.prisma.noteTag.findMany({
      where: { id: { in: tagIds }, ownerId: user.id },
      select: { id: true },
    });
    const validIds = tags.map((t) => t.id);
    await this.prisma.$transaction([
      this.prisma.noteTagLink.deleteMany({ where: { noteId } }),
      ...(validIds.length
        ? [
            this.prisma.noteTagLink.createMany({
              data: validIds.map((tagId) => ({ noteId, tagId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  private async assertNotebookAccess(notebookId: string, user: CurrentUser) {
    const nb = await this.prisma.notebook.findUnique({ where: { id: notebookId } });
    if (!nb) throw new NotFoundException('노트북을 찾을 수 없습니다.');
    const sameTenant =
      (user.clientId && nb.clientId && nb.clientId === user.clientId) ||
      (!user.clientId && !nb.clientId);
    if (!sameTenant) throw new ForbiddenException('노트북 접근 권한이 없습니다.');
    if (user.role === 'admin') return;
    if (nb.ownerId === user.id) return;
    if (nb.scope === 'all') return;
    if (nb.scope === 'department' && nb.departmentId === user.departmentId) return;
    throw new ForbiddenException('노트북 접근 권한이 없습니다.');
  }

  private isSameTenant(note: any, user: CurrentUser): boolean {
    if (user.clientId && note.clientId) return user.clientId === note.clientId;
    if (!user.clientId && !note.clientId) return true;
    return false;
  }

  private canAccess(note: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(note, user)) return false;
    if (user.role === 'admin') return true;
    if (note.creatorId === user.id) return true;
    if (note.isCompany) return true;
    if (note.isDepartment && note.creatorDeptId === user.departmentId) return true;
    return false;
  }

  private canEdit(note: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(note, user)) return false;
    if (user.role === 'admin') return true;
    return note.creatorId === user.id;
  }

  private canDelete(note: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(note, user)) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager' && note.creatorDeptId === user.departmentId) return true;
    return note.creatorId === user.id;
  }
}
