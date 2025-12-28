import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    level?: string;
    parentId?: string;
    isActive?: boolean;
    search?: string;
  }) {
    const { level, parentId, isActive, search } = params;

    const where: Prisma.CategoryWhereInput = {
      ...(level && { level }),
      ...(parentId && { parentId }),
      ...(parentId === null && { parentId: null }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' as Prisma.QueryMode },
      }),
    };

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            isActive: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: true,
            halfProducts: true,
          },
        },
      },
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories;
  }

  async findTree() {
    const largeCategories = await this.prisma.category.findMany({
      where: { level: 'large', isActive: true },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return largeCategories;
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: {
            products: true,
            halfProducts: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    return category;
  }

  async create(data: {
    name: string;
    level: string;
    parentId?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    if (data.level !== 'large' && !data.parentId) {
      throw new BadRequestException('중분류/소분류는 상위 카테고리가 필요합니다');
    }

    if (data.level === 'large' && data.parentId) {
      throw new BadRequestException('대분류는 상위 카테고리를 가질 수 없습니다');
    }

    if (data.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new NotFoundException('상위 카테고리를 찾을 수 없습니다');
      }

      if (data.level === 'medium' && parent.level !== 'large') {
        throw new BadRequestException('중분류의 상위는 대분류여야 합니다');
      }

      if (data.level === 'small' && parent.level !== 'medium') {
        throw new BadRequestException('소분류의 상위는 중분류여야 합니다');
      }
    }

    return this.prisma.category.create({
      data: {
        name: data.name,
        level: data.level,
        parentId: data.parentId,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: true,
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async delete(id: string) {
    const category = await this.findOne(id);

    if (category.children.length > 0) {
      throw new ConflictException('하위 카테고리가 있는 경우 삭제할 수 없습니다');
    }

    if (category._count.products > 0 || category._count.halfProducts > 0) {
      throw new ConflictException('상품이 등록된 카테고리는 삭제할 수 없습니다');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    const updates = items.map((item) =>
      this.prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }
}
