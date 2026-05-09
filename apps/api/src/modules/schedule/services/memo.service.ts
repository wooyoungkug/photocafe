import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMemoDto, UpdateMemoDto, QueryMemoDto } from '../dto';
import { sanitizeMemoContent } from '../utils/sanitize-memo-content';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
  clientId?: string;
}

const MEMO_INCLUDE = {
  notebook: { select: { id: true, name: true, color: true, icon: true } },
  tags: { include: { tag: true } },
  attachments: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class MemoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMemoDto, user: CurrentUser) {
    const format = dto.contentFormat || 'text';
    const safeContent = sanitizeMemoContent(dto.content, format);

    if (dto.notebookId) {
      await this.assertNotebookAccess(dto.notebookId, user);
    }

    const memo = await this.prisma.memo.create({
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
      await this.replaceTags(memo.id, dto.tagIds, user);
    }

    return this.prisma.memo.findUnique({
      where: { id: memo.id },
      include: MEMO_INCLUDE,
    });
  }

  async findAll(query: QueryMemoDto, user: CurrentUser) {
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

    // 검색어 필터
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

    // 범위 필터 (개인/부서/전체)
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

    // 관리자가 아닌 경우 범위 조건 적용
    if (user.role !== 'admin' && scopeConditions.length > 0) {
      where.AND = where.AND
        ? [...where.AND, { OR: scopeConditions }]
        : [{ OR: scopeConditions }];
    }

    return this.prisma.memo.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { lastEditedAt: 'desc' }, { updatedAt: 'desc' }],
      include: MEMO_INCLUDE,
    });
  }

  async findOne(id: string, user: CurrentUser) {
    const memo = await this.prisma.memo.findUnique({
      where: { id },
      include: MEMO_INCLUDE,
    });

    if (!memo) {
      throw new NotFoundException('메모를 찾을 수 없습니다.');
    }

    if (!this.canAccess(memo, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return memo;
  }

  async update(id: string, dto: UpdateMemoDto, user: CurrentUser) {
    const memo = await this.findOne(id, user);

    if (!this.canEdit(memo, user)) {
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
      const nextFormat = (dto.contentFormat ?? memo.contentFormat) as 'text' | 'html';
      const nextContent = dto.content ?? memo.content;
      updateData.content = sanitizeMemoContent(nextContent, nextFormat);
      updateData.contentFormat = nextFormat;
      updateData.lastEditedAt = new Date();
    }

    const updated = await this.prisma.memo.update({
      where: { id },
      data: updateData,
    });

    if (dto.tagIds !== undefined) {
      await this.replaceTags(id, dto.tagIds, user);
    }

    return this.prisma.memo.findUnique({ where: { id }, include: MEMO_INCLUDE });
  }

  async delete(id: string, user: CurrentUser) {
    const memo = await this.findOne(id, user);

    if (!this.canDelete(memo, user)) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    return this.prisma.memo.delete({ where: { id } });
  }

  private async replaceTags(memoId: string, tagIds: string[], user: CurrentUser) {
    if (!tagIds.length) {
      await this.prisma.memoTag.deleteMany({ where: { memoId } });
      return;
    }
    const tags = await this.prisma.noteTag.findMany({
      where: { id: { in: tagIds }, ownerId: user.id },
      select: { id: true },
    });
    const validIds = tags.map((t) => t.id);
    await this.prisma.$transaction([
      this.prisma.memoTag.deleteMany({ where: { memoId } }),
      ...(validIds.length
        ? [
            this.prisma.memoTag.createMany({
              data: validIds.map((tagId) => ({ memoId, tagId })),
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

  private isSameTenant(memo: any, user: CurrentUser): boolean {
    if (user.clientId && memo.clientId) return user.clientId === memo.clientId;
    if (!user.clientId && !memo.clientId) return true;
    return false;
  }

  private canAccess(memo: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(memo, user)) return false;
    if (user.role === 'admin') return true;
    if (memo.creatorId === user.id) return true;
    if (memo.isCompany) return true;
    if (memo.isDepartment && memo.creatorDeptId === user.departmentId) return true;
    return false;
  }

  private canEdit(memo: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(memo, user)) return false;
    if (user.role === 'admin') return true;
    return memo.creatorId === user.id;
  }

  private canDelete(memo: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(memo, user)) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager' && memo.creatorDeptId === user.departmentId) return true;
    return memo.creatorId === user.id;
  }
}
