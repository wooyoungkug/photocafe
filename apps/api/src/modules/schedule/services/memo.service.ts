import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateMemoDto, UpdateMemoDto, QueryMemoDto } from '../dto';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
  clientId?: string;
}

@Injectable()
export class MemoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMemoDto, user: CurrentUser) {
    return this.prisma.memo.create({
      data: {
        clientId: user.clientId || null,
        creatorId: user.id,
        creatorName: user.name || '사용자',
        creatorDeptId: user.departmentId || null,
        creatorDeptName: user.departmentName || null,
        title: dto.title || '',
        content: dto.content || '',
        color: dto.color || '#FEF9C3',
        isPersonal: dto.isPersonal ?? true,
        isDepartment: dto.isDepartment ?? false,
        isCompany: dto.isCompany ?? false,
      },
    });
  }

  async findAll(query: QueryMemoDto, user: CurrentUser) {
    const where: any = {
      ...(user.clientId ? { clientId: user.clientId } : { clientId: null }),
    };

    // 검색어 필터
    if (query.search) {
      where.AND = [
        {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            { content: { contains: query.search, mode: 'insensitive' } },
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
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: string, user: CurrentUser) {
    const memo = await this.prisma.memo.findUnique({ where: { id } });

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

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.isPersonal !== undefined) updateData.isPersonal = dto.isPersonal;
    if (dto.isDepartment !== undefined) updateData.isDepartment = dto.isDepartment;
    if (dto.isCompany !== undefined) updateData.isCompany = dto.isCompany;
    if (dto.isPinned !== undefined) updateData.isPinned = dto.isPinned;

    return this.prisma.memo.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string, user: CurrentUser) {
    const memo = await this.findOne(id, user);

    if (!this.canDelete(memo, user)) {
      throw new ForbiddenException('삭제 권한이 없습니다.');
    }

    return this.prisma.memo.delete({ where: { id } });
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
