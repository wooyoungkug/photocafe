import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  MoveCategoryDto,
  VisibilityDto,
} from '../dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) { }

  async findAll(params: CategoryQueryDto) {
    const { level, parentId, isActive, isVisible, isTopMenu, categoryType, search } = params;

    const where: Prisma.CategoryWhereInput = {
      ...(level && { level }),
      ...(parentId && { parentId }),
      ...(parentId === null && { parentId: null }),
      ...(isActive !== undefined && { isActive }),
      ...(isVisible !== undefined && { isVisible }),
      ...(isTopMenu !== undefined && { isTopMenu }),
      ...(categoryType && { categoryType }),
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
            code: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            level: true,
            code: true,
            isActive: true,
            isVisible: true,
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
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return categories;
  }

  async findTree() {
    const largeCategories = await this.prisma.category.findMany({
      where: { level: 'large' },
      include: {
        children: {
          include: {
            children: {
              include: {
                _count: { select: { products: true, halfProducts: true } },
              },
              orderBy: { sortOrder: 'asc' },
            },
            _count: { select: { products: true, halfProducts: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { products: true, halfProducts: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return largeCategories;
  }

  async findTopMenuCategories() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        isVisible: true,
        isTopMenu: true,
      },
      include: {
        children: {
          where: { isActive: true, isVisible: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findVisibleCategories(isLoggedIn: boolean) {
    const visibilityConditions = isLoggedIn
      ? ['always', 'logged_in']
      : ['always', 'logged_out'];

    return this.prisma.category.findMany({
      where: {
        isActive: true,
        isVisible: true,
        loginVisibility: { in: visibilityConditions },
      },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { products: true, halfProducts: true } },
          },
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

  async create(data: CreateCategoryDto) {
    // 레벨 검증
    if (data.level !== 'large' && !data.parentId) {
      throw new BadRequestException('중분류/소분류는 상위 카테고리가 필요합니다');
    }

    if (data.level === 'large' && data.parentId) {
      throw new BadRequestException('대분류는 상위 카테고리를 가질 수 없습니다');
    }

    let depth = 1;
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

      depth = parent.depth + 1;
    }

    // 코드 자동 생성 (제공되지 않은 경우)
    const code = data.code || await this.generateCode(data.parentId);

    // sortOrder 자동 할당 (같은 부모의 마지막 순서 + 1)
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const lastSibling = await this.prisma.category.findFirst({
        where: { parentId: data.parentId ?? null },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    return this.prisma.category.create({
      data: {
        code,
        name: data.name,
        level: data.level,
        depth,
        parentId: data.parentId,
        sortOrder,
        isActive: data.isActive ?? true,
        isVisible: data.isVisible ?? true,
        isTopMenu: data.isTopMenu ?? false,
        loginVisibility: data.loginVisibility ?? 'always',
        categoryType: data.categoryType ?? 'HTML',
        productionForm: data.productionForm,
        isOutsourced: data.isOutsourced ?? false,
        pricingUnit: data.pricingUnit,
        description: data.description,
        linkUrl: data.linkUrl,
        htmlContent: data.htmlContent,
        salesCategoryId: data.salesCategoryId,
        iconUrl: data.iconUrl,
      },
      include: {
        parent: true,
      },
    });
  }

  async update(id: string, data: UpdateCategoryDto) {
    await this.findOne(id);

    // 레벨/parentId 변경은 허용하지 않음 (이동은 별도 메서드)
    const { level, parentId, ...updateData } = data;

    return this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async updateVisibility(id: string, data: VisibilityDto) {
    await this.findOne(id);

    return this.prisma.category.update({
      where: { id },
      data,
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

  async move(id: string, dto: MoveCategoryDto) {
    const category = await this.findOne(id);

    let newDepth = category.depth;
    let newLevel = category.level;

    if (dto.newParentId !== undefined) {
      if (dto.newParentId === null) {
        // 최상위로 이동
        newDepth = 1;
        newLevel = 'large';
      } else {
        const newParent = await this.prisma.category.findUnique({
          where: { id: dto.newParentId },
        });

        if (!newParent) {
          throw new NotFoundException('새 부모 카테고리를 찾을 수 없습니다');
        }

        newDepth = newParent.depth + 1;
        newLevel = newParent.level === 'large' ? 'medium' : 'small';

        if (newDepth > 3) {
          throw new BadRequestException('3단계 이상의 계층은 지원하지 않습니다');
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        parentId: dto.newParentId,
        depth: newDepth,
        level: newLevel,
        sortOrder: dto.newSortOrder ?? category.sortOrder,
      },
      include: {
        parent: true,
      },
    });
  }

  async moveUp(id: string) {
    const category = await this.findOne(id);

    // 같은 부모의 모든 형제들 가져오기 (정렬 순서대로)
    const siblings = await this.prisma.category.findMany({
      where: { parentId: category.parentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const currentIndex = siblings.findIndex((s) => s.id === id);
    if (currentIndex <= 0) {
      return category; // 이미 최상위
    }

    const prevSibling = siblings[currentIndex - 1];

    // 순서 교환 (현재 sortOrder가 같을 수 있으므로 명시적으로 설정)
    const prevSortOrder = prevSibling.sortOrder;
    const currentSortOrder = category.sortOrder;

    // sortOrder가 같은 경우 강제로 다른 값 할당
    if (prevSortOrder === currentSortOrder) {
      await this.prisma.$transaction([
        this.prisma.category.update({
          where: { id: prevSibling.id },
          data: { sortOrder: currentIndex },
        }),
        this.prisma.category.update({
          where: { id: category.id },
          data: { sortOrder: currentIndex - 1 },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.category.update({
          where: { id: prevSibling.id },
          data: { sortOrder: currentSortOrder },
        }),
        this.prisma.category.update({
          where: { id: category.id },
          data: { sortOrder: prevSortOrder },
        }),
      ]);
    }

    return this.findOne(id);
  }

  async moveDown(id: string) {
    const category = await this.findOne(id);

    // 같은 부모의 모든 형제들 가져오기 (정렬 순서대로)
    const siblings = await this.prisma.category.findMany({
      where: { parentId: category.parentId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const currentIndex = siblings.findIndex((s) => s.id === id);
    if (currentIndex < 0 || currentIndex >= siblings.length - 1) {
      return category; // 이미 최하위
    }

    const nextSibling = siblings[currentIndex + 1];

    // 순서 교환 (현재 sortOrder가 같을 수 있으므로 명시적으로 설정)
    const nextSortOrder = nextSibling.sortOrder;
    const currentSortOrder = category.sortOrder;

    // sortOrder가 같은 경우 강제로 다른 값 할당
    if (nextSortOrder === currentSortOrder) {
      await this.prisma.$transaction([
        this.prisma.category.update({
          where: { id: nextSibling.id },
          data: { sortOrder: currentIndex },
        }),
        this.prisma.category.update({
          where: { id: category.id },
          data: { sortOrder: currentIndex + 1 },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.category.update({
          where: { id: nextSibling.id },
          data: { sortOrder: currentSortOrder },
        }),
        this.prisma.category.update({
          where: { id: category.id },
          data: { sortOrder: nextSortOrder },
        }),
      ]);
    }

    return this.findOne(id);
  }

  async moveToTop(id: string) {
    return this.move(id, { newParentId: null });
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

  // 8자리 코드 자동 생성
  async generateCode(parentId?: string): Promise<string> {
    if (!parentId) {
      // 대분류 코드 생성
      const lastCategory = await this.prisma.category.findFirst({
        where: { depth: 1, code: { not: null } },
        orderBy: { code: 'desc' },
      });

      const lastCode = lastCategory?.code
        ? parseInt(lastCategory.code.substring(0, 2))
        : 0;
      return `${String(lastCode + 1).padStart(2, '0')}000000`;
    }

    // 하위 카테고리 코드 생성
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('부모 카테고리를 찾을 수 없습니다');
    }

    const parentCode = parent.code || '00000000';
    const prefix = parentCode.substring(0, parent.depth * 2);

    const lastChild = await this.prisma.category.findFirst({
      where: { parentId, code: { not: null } },
      orderBy: { code: 'desc' },
    });

    let lastChildCode = 0;
    if (lastChild?.code) {
      lastChildCode = parseInt(
        lastChild.code.substring(parent.depth * 2, (parent.depth + 1) * 2)
      );
    }

    const newCodePart = String(lastChildCode + 1).padStart(2, '0');
    const remainingZeros = '0'.repeat(8 - (parent.depth + 1) * 2);

    return `${prefix}${newCodePart}${remainingZeros}`;
  }
}
