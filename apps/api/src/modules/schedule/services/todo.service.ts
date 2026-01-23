import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateTodoDto, UpdateTodoDto, QueryTodoDto } from '../dto';

interface CurrentUser {
  id: string;
  name: string;
  departmentId?: string;
  departmentName?: string;
  role: string;
}

@Injectable()
export class TodoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTodoDto, user: CurrentUser) {
    return this.prisma.todo.create({
      data: {
        title: dto.title,
        content: dto.content,
        priority: dto.priority || 'normal',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        isAllDay: dto.isAllDay || false,
        isPersonal: dto.isPersonal ?? true,
        isDepartment: dto.isDepartment ?? false,
        isCompany: dto.isCompany ?? false,
        sharedDeptIds: dto.sharedDeptIds || [],
        reminderAt: dto.reminderAt ? new Date(dto.reminderAt) : null,
        isRecurring: dto.isRecurring || false,
        recurringType: dto.recurringType,
        recurringEnd: dto.recurringEnd ? new Date(dto.recurringEnd) : null,
        color: dto.color || '#3B82F6',
        tags: dto.tags || [],
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        creatorId: user.id,
        creatorName: user.name || '사용자',
        creatorDeptId: user.departmentId || null,
        creatorDeptName: user.departmentName || null,
      },
    });
  }

  async findAll(query: QueryTodoDto, user: CurrentUser) {
    const where: any = {};

    // 상태 필터
    if (query.status) {
      where.status = query.status;
    }

    // 우선순위 필터
    if (query.priority) {
      where.priority = query.priority;
    }

    // 날짜 필터
    if (query.startDate || query.endDate) {
      where.OR = [
        // 마감일이 범위 내에 있는 경우
        query.startDate && query.endDate
          ? {
              dueDate: {
                gte: new Date(query.startDate),
                lte: new Date(query.endDate),
              },
            }
          : null,
        // 시작일이 범위 내에 있는 경우
        query.startDate && query.endDate
          ? {
              startDate: {
                gte: new Date(query.startDate),
                lte: new Date(query.endDate),
              },
            }
          : null,
      ].filter(Boolean);
    }

    // 검색어 필터
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // 범위 필터 (개인/부서/전체)
    const scopeConditions: any[] = [];

    if (query.scope === 'personal' || query.scope === 'all' || !query.scope) {
      // 본인이 작성한 개인 일정
      scopeConditions.push({
        creatorId: user.id,
        isPersonal: true,
      });
    }

    if (query.scope === 'department' || query.scope === 'all' || !query.scope) {
      // 부서 일정 (본인 부서 또는 공유된 부서)
      if (user.departmentId) {
        scopeConditions.push({
          isDepartment: true,
          OR: [
            { creatorDeptId: user.departmentId },
            { sharedDeptIds: { has: user.departmentId } },
          ],
        });
      }
    }

    if (query.scope === 'company' || query.scope === 'all' || !query.scope) {
      // 전체 일정
      scopeConditions.push({
        isCompany: true,
      });
    }

    if (scopeConditions.length > 0) {
      where.OR = where.OR
        ? [...where.OR, ...scopeConditions]
        : scopeConditions;
    }

    const todos = await this.prisma.todo.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return todos;
  }

  async findOne(id: string, user: CurrentUser) {
    const todo = await this.prisma.todo.findUnique({
      where: { id },
    });

    if (!todo) {
      throw new NotFoundException('할일을 찾을 수 없습니다.');
    }

    // 접근 권한 확인
    if (!this.canAccess(todo, user)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    return todo;
  }

  async update(id: string, dto: UpdateTodoDto, user: CurrentUser) {
    const todo = await this.findOne(id, user);

    // 수정 권한 확인 (작성자만 수정 가능)
    if (!this.canEdit(todo, user)) {
      throw new ForbiddenException('수정 권한이 없습니다.');
    }

    const updateData: any = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.startDate !== undefined)
      updateData.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.dueDate !== undefined)
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    if (dto.isAllDay !== undefined) updateData.isAllDay = dto.isAllDay;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'completed') {
        updateData.completedAt = new Date();
        updateData.completedBy = user.name;
      }
    }
    if (dto.isPersonal !== undefined) updateData.isPersonal = dto.isPersonal;
    if (dto.isDepartment !== undefined) updateData.isDepartment = dto.isDepartment;
    if (dto.isCompany !== undefined) updateData.isCompany = dto.isCompany;
    if (dto.sharedDeptIds !== undefined)
      updateData.sharedDeptIds = dto.sharedDeptIds;
    if (dto.reminderAt !== undefined)
      updateData.reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurringType !== undefined)
      updateData.recurringType = dto.recurringType;
    if (dto.recurringEnd !== undefined)
      updateData.recurringEnd = dto.recurringEnd
        ? new Date(dto.recurringEnd)
        : null;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    return this.prisma.todo.update({
      where: { id },
      data: updateData,
    });
  }

  async complete(id: string, user: CurrentUser) {
    const todo = await this.findOne(id, user);

    // 완료 권한 확인
    if (!this.canEdit(todo, user)) {
      throw new ForbiddenException('완료 처리 권한이 없습니다.');
    }

    return this.prisma.todo.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedBy: user.name,
      },
    });
  }

  async delete(id: string, user: CurrentUser) {
    const todo = await this.findOne(id, user);

    // 삭제 권한 확인 (담당자, 부서장, 관리자만)
    if (!this.canDelete(todo, user)) {
      throw new ForbiddenException(
        '삭제 권한이 없습니다. (담당자, 부서장, 관리자만 삭제 가능)',
      );
    }

    return this.prisma.todo.delete({
      where: { id },
    });
  }

  // 접근 권한 확인
  private canAccess(todo: any, user: CurrentUser): boolean {
    // 관리자는 모든 접근 가능
    if (user.role === 'admin') return true;

    // 작성자 본인
    if (todo.creatorId === user.id) return true;

    // 전체 일정
    if (todo.isCompany) return true;

    // 부서 일정 (본인 부서 또는 공유된 부서)
    if (todo.isDepartment) {
      if (todo.creatorDeptId === user.departmentId) return true;
      if (todo.sharedDeptIds?.includes(user.departmentId)) return true;
    }

    return false;
  }

  // 수정 권한 확인
  private canEdit(todo: any, user: CurrentUser): boolean {
    // 관리자는 모든 수정 가능
    if (user.role === 'admin') return true;

    // 작성자 본인만 수정 가능
    return todo.creatorId === user.id;
  }

  // 삭제 권한 확인 (담당자, 부서장, 관리자)
  private canDelete(todo: any, user: CurrentUser): boolean {
    // 관리자는 모든 삭제 가능
    if (user.role === 'admin') return true;

    // 부서장 (같은 부서의 일정)
    if (user.role === 'manager' && todo.creatorDeptId === user.departmentId) {
      return true;
    }

    // 작성자 본인
    return todo.creatorId === user.id;
  }
}
