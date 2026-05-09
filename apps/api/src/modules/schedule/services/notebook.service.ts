import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateNotebookDto, UpdateNotebookDto } from '../dto';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
  clientId?: string;
}

@Injectable()
export class NotebookService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotebookDto, user: CurrentUser) {
    if (dto.parentId) {
      await this.assertAccess(dto.parentId, user);
    }
    return this.prisma.notebook.create({
      data: {
        clientId: user.clientId || null,
        ownerId: user.id,
        ownerName: user.name || '사용자',
        parentId: dto.parentId || null,
        name: dto.name,
        color: dto.color || '#FEF9C3',
        icon: dto.icon || null,
        scope: dto.scope || 'personal',
        departmentId: dto.scope === 'department' ? user.departmentId || null : null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async findAll(user: CurrentUser) {
    const where: any = {
      ...(user.clientId ? { clientId: user.clientId } : { clientId: null }),
    };

    if (user.role !== 'admin') {
      const conditions: any[] = [{ ownerId: user.id }, { scope: 'all' }];
      if (user.departmentId) {
        conditions.push({ scope: 'department', departmentId: user.departmentId });
      }
      where.OR = conditions;
    }

    return this.prisma.notebook.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { memos: true, children: true } } },
    });
  }

  async findOne(id: string, user: CurrentUser) {
    const nb = await this.prisma.notebook.findUnique({
      where: { id },
      include: { _count: { select: { memos: true, children: true } } },
    });
    if (!nb) throw new NotFoundException('노트북을 찾을 수 없습니다.');
    if (!this.canAccess(nb, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
    return nb;
  }

  async update(id: string, dto: UpdateNotebookDto, user: CurrentUser) {
    const nb = await this.findOne(id, user);
    if (!this.canEdit(nb, user)) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }
    if (dto.parentId && dto.parentId !== nb.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('자기 자신을 상위 노트북으로 지정할 수 없습니다.');
      }
      await this.assertAccess(dto.parentId, user);
      await this.assertNoCycle(id, dto.parentId);
    }
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon || null;
    if (dto.parentId !== undefined) data.parentId = dto.parentId || null;
    if (dto.scope !== undefined) {
      data.scope = dto.scope;
      data.departmentId = dto.scope === 'department' ? user.departmentId || null : null;
    }
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    return this.prisma.notebook.update({ where: { id }, data });
  }

  async delete(id: string, user: CurrentUser) {
    const nb = await this.findOne(id, user);
    if (!this.canEdit(nb, user)) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }
    if (nb._count.children > 0) {
      throw new BadRequestException('하위 노트북이 있어 삭제할 수 없습니다.');
    }
    if (nb._count.memos > 0) {
      throw new BadRequestException('소속된 메모가 있어 삭제할 수 없습니다. (먼저 이동하거나 분류 해제하세요)');
    }
    return this.prisma.notebook.delete({ where: { id } });
  }

  private async assertAccess(id: string, user: CurrentUser) {
    const nb = await this.prisma.notebook.findUnique({ where: { id } });
    if (!nb) throw new NotFoundException('노트북을 찾을 수 없습니다.');
    if (!this.canAccess(nb, user)) {
      throw new ForbiddenException('노트북 접근 권한이 없습니다.');
    }
  }

  private async assertNoCycle(id: string, newParentId: string) {
    let cur: string | null = newParentId;
    const seen = new Set<string>();
    while (cur) {
      if (cur === id) {
        throw new BadRequestException('순환 구조는 만들 수 없습니다.');
      }
      if (seen.has(cur)) break;
      seen.add(cur);
      const parent: { parentId: string | null } | null =
        await this.prisma.notebook.findUnique({
          where: { id: cur },
          select: { parentId: true },
        });
      cur = parent?.parentId ?? null;
    }
  }

  private isSameTenant(nb: any, user: CurrentUser): boolean {
    if (user.clientId && nb.clientId) return user.clientId === nb.clientId;
    if (!user.clientId && !nb.clientId) return true;
    return false;
  }

  private canAccess(nb: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(nb, user)) return false;
    if (user.role === 'admin') return true;
    if (nb.ownerId === user.id) return true;
    if (nb.scope === 'all') return true;
    if (nb.scope === 'department' && nb.departmentId === user.departmentId) return true;
    return false;
  }

  private canEdit(nb: any, user: CurrentUser): boolean {
    if (!this.isSameTenant(nb, user)) return false;
    if (user.role === 'admin') return true;
    return nb.ownerId === user.id;
  }
}
