import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateSalesCategoryDto,
  UpdateSalesCategoryDto,
  SalesCategoryQueryDto,
} from '../dto/sales-category.dto';

@Injectable()
export class SalesCategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: SalesCategoryQueryDto) {
    const { parentId, isActive, search, depth } = params;

    const where: Prisma.SalesCategoryWhereInput = {
      ...(parentId !== undefined && { parentId: parentId || null }),
      ...(isActive !== undefined && { isActive }),
      ...(depth !== undefined && { depth }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as Prisma.QueryMode },
      }),
    };

    const categories = await this.prisma.salesCategory.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            sortOrder: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            children: true,
          },
        },
      },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories;
  }

  async findTree() {
    // 대분류만 조회하고 하위 포함
    const largeCategories = await this.prisma.salesCategory.findMany({
      where: { depth: 1 },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return largeCategories;
  }

  async findOne(id: string) {
    const category = await this.prisma.salesCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('매출품목분류를 찾을 수 없습니다');
    }

    return category;
  }

  private generateCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `SC_${timestamp}${random}`.toUpperCase();
  }

  async create(data: CreateSalesCategoryDto) {
    // 코드 자동 생성 (입력값이 없으면)
    let code = data.code;
    if (!code) {
      code = this.generateCode();
    } else {
      // 코드 중복 확인
      const existing = await this.prisma.salesCategory.findUnique({
        where: { code },
      });

      if (existing) {
        throw new ConflictException('이미 사용 중인 코드입니다');
      }
    }

    let depth = 1;
    if (data.parentId) {
      const parent = await this.prisma.salesCategory.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new NotFoundException('상위 분류를 찾을 수 없습니다');
      }

      if (parent.depth >= 2) {
        throw new BadRequestException('2단계까지만 생성할 수 있습니다');
      }

      depth = parent.depth + 1;
    }

    // sortOrder 자동 할당 (같은 부모의 마지막 순서 + 1)
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const lastSibling = await this.prisma.salesCategory.findFirst({
        where: { parentId: data.parentId ?? null },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    return this.prisma.salesCategory.create({
      data: {
        code,
        name: data.name,
        depth,
        parentId: data.parentId,
        sortOrder,
        isActive: data.isActive ?? true,
        description: data.description,
      },
      include: {
        parent: true,
      },
    });
  }

  async update(id: string, data: UpdateSalesCategoryDto) {
    await this.findOne(id);

    // 코드 중복 확인 (자신 제외)
    if (data.code) {
      const existing = await this.prisma.salesCategory.findFirst({
        where: {
          code: data.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 사용 중인 코드입니다');
      }
    }

    // parentId 변경은 허용하지 않음 (계층 변경 시 문제 발생)
    const { parentId, ...updateData } = data;

    return this.prisma.salesCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async delete(id: string) {
    const category = await this.findOne(id);

    if (category.children && category.children.length > 0) {
      throw new ConflictException('하위 분류가 있는 경우 삭제할 수 없습니다');
    }

    return this.prisma.salesCategory.delete({
      where: { id },
    });
  }

  async moveUp(id: string) {
    const category = await this.findOne(id);

    const siblings = await this.prisma.salesCategory.findMany({
      where: { parentId: category.parentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const currentIndex = siblings.findIndex((s) => s.id === id);
    if (currentIndex <= 0) {
      return category; // 이미 최상위
    }

    const prevSibling = siblings[currentIndex - 1];
    const prevSortOrder = prevSibling.sortOrder;
    const currentSortOrder = category.sortOrder;

    if (prevSortOrder === currentSortOrder) {
      await this.prisma.$transaction([
        this.prisma.salesCategory.update({
          where: { id: prevSibling.id },
          data: { sortOrder: currentIndex },
        }),
        this.prisma.salesCategory.update({
          where: { id: category.id },
          data: { sortOrder: currentIndex - 1 },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.salesCategory.update({
          where: { id: prevSibling.id },
          data: { sortOrder: currentSortOrder },
        }),
        this.prisma.salesCategory.update({
          where: { id: category.id },
          data: { sortOrder: prevSortOrder },
        }),
      ]);
    }

    return this.findOne(id);
  }

  async moveDown(id: string) {
    const category = await this.findOne(id);

    const siblings = await this.prisma.salesCategory.findMany({
      where: { parentId: category.parentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const currentIndex = siblings.findIndex((s) => s.id === id);
    if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
      return category; // 이미 최하위
    }

    const nextSibling = siblings[currentIndex + 1];
    const nextSortOrder = nextSibling.sortOrder;
    const currentSortOrder = category.sortOrder;

    if (nextSortOrder === currentSortOrder) {
      await this.prisma.$transaction([
        this.prisma.salesCategory.update({
          where: { id: nextSibling.id },
          data: { sortOrder: currentIndex },
        }),
        this.prisma.salesCategory.update({
          where: { id: category.id },
          data: { sortOrder: currentIndex + 1 },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.salesCategory.update({
          where: { id: nextSibling.id },
          data: { sortOrder: currentSortOrder },
        }),
        this.prisma.salesCategory.update({
          where: { id: category.id },
          data: { sortOrder: nextSortOrder },
        }),
      ]);
    }

    return this.findOne(id);
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    const updates = items.map((item) =>
      this.prisma.salesCategory.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }
}
