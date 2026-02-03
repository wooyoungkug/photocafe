import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto, UpdateProductDto } from '../dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // Decimal을 number로 변환하는 헬퍼 함수
  private convertDecimalToNumber<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    // Prisma Decimal은 toString 메서드를 가진 객체로 반환됨
    if (typeof obj === 'object' && obj !== null && 'toNumber' in obj && typeof (obj as { toNumber: () => number }).toNumber === 'function') {
      return (obj as { toNumber: () => number }).toNumber() as T;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertDecimalToNumber(item)) as T;
    }
    if (typeof obj === 'object' && obj !== null && !(obj instanceof Date)) {
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(obj)) {
        result[key] = this.convertDecimalToNumber((obj as Record<string, unknown>)[key]);
      }
      return result as T;
    }
    return obj;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    categoryId?: string;
    isActive?: boolean;
    isNew?: boolean;
    isBest?: boolean;
  }) {
    const { skip = 0, take = 20, search, categoryId, isActive, isNew, isBest } = params;

    // 카테고리 ID가 있으면 해당 카테고리와 하위 카테고리 ID 모두 조회
    let categoryIds: string[] = [];
    if (categoryId) {
      const childCategories = await this.prisma.category.findMany({
        where: {
          OR: [
            { id: categoryId },
            { parentId: categoryId },
            { parent: { parentId: categoryId } }, // 손자 카테고리까지
          ],
        },
        select: { id: true },
      });
      categoryIds = childCategories.map((c: { id: string }) => c.id);
    }

    const where: Prisma.ProductWhereInput = {
      ...(search && {
        OR: [
          { productName: { contains: search } },
          { productCode: { contains: search } },
        ],
      }),
      ...(categoryIds.length > 0 && { categoryId: { in: categoryIds } }),
      ...(isActive !== undefined && { isActive }),
      ...(isNew !== undefined && { isNew }),
      ...(isBest !== undefined && { isBest }),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          _count: {
            select: {
              specifications: true,
              bindings: true,
              papers: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: this.convertDecimalToNumber(data),
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        specifications: { orderBy: { sortOrder: 'asc' } },
        bindings: { orderBy: { sortOrder: 'asc' } },
        papers: { orderBy: { sortOrder: 'asc' } },
        covers: { orderBy: { sortOrder: 'asc' } },
        foils: { orderBy: { sortOrder: 'asc' } },
        finishings: { orderBy: { sortOrder: 'asc' } },
        customOptions: { orderBy: { sortOrder: 'asc' } },
        halfProducts: {
          include: {
            halfProduct: {
              select: {
                id: true,
                code: true,
                name: true,
                basePrice: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다');
    }

    return this.convertDecimalToNumber(product);
  }

  async create(dto: CreateProductDto) {
    const { specifications, bindings, papers, covers, foils, finishings, ...productData } = dto;

    // Check for duplicate productCode
    const existing = await this.prisma.product.findUnique({
      where: { productCode: dto.productCode },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 상품 코드입니다');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    return this.prisma.product.create({
      data: {
        ...productData,
        basePrice: dto.basePrice,
        specifications: specifications?.length
          ? { create: specifications }
          : undefined,
        bindings: bindings?.length
          ? { create: bindings }
          : undefined,
        papers: papers?.length
          ? { create: papers }
          : undefined,
        covers: covers?.length
          ? { create: covers }
          : undefined,
        foils: foils?.length
          ? { create: foils }
          : undefined,
        finishings: finishings?.length
          ? { create: finishings }
          : undefined,
      },
      include: {
        category: true,
        specifications: true,
        bindings: true,
        papers: true,
        covers: true,
        foils: true,
        finishings: true,
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    const { specifications, bindings, papers, covers, foils, finishings, ...productData } = dto;

    console.log('=== Product Update Debug ===');
    console.log('Product ID:', id);
    console.log('Specifications:', JSON.stringify(specifications, null, 2));
    console.log('Bindings:', JSON.stringify(bindings, null, 2));
    console.log('Papers:', JSON.stringify(papers, null, 2));

    try {
      // 기존 옵션들 삭제
      if (specifications !== undefined) {
        console.log('Deleting existing specifications...');
        await this.prisma.productSpecification.deleteMany({ where: { productId: id } });
      }
      if (bindings !== undefined) {
        console.log('Deleting existing bindings...');
        await this.prisma.productBinding.deleteMany({ where: { productId: id } });
      }
      if (papers !== undefined) {
        console.log('Deleting existing papers...');
        await this.prisma.productPaper.deleteMany({ where: { productId: id } });
      }
      if (covers !== undefined) {
        await this.prisma.productCover.deleteMany({ where: { productId: id } });
      }
      if (foils !== undefined) {
        await this.prisma.productFoil.deleteMany({ where: { productId: id } });
      }
      if (finishings !== undefined) {
        await this.prisma.productFinishing.deleteMany({ where: { productId: id } });
      }

      console.log('Creating new options...');
      // 상품 업데이트
      const result = await this.prisma.product.update({
        where: { id },
        data: {
          ...productData,
          specifications: specifications !== undefined && specifications.length > 0
            ? { create: specifications }
            : undefined,
          bindings: bindings !== undefined && bindings.length > 0
            ? { create: bindings }
            : undefined,
          papers: papers !== undefined && papers.length > 0
            ? { create: papers }
            : undefined,
          covers: covers !== undefined && covers.length > 0
            ? { create: covers }
            : undefined,
          foils: foils !== undefined && foils.length > 0
            ? { create: foils }
            : undefined,
          finishings: finishings !== undefined && finishings.length > 0
            ? { create: finishings }
            : undefined,
        },
        include: {
          category: true,
          specifications: true,
          bindings: true,
          papers: true,
          covers: true,
          foils: true,
          finishings: true,
        },
      });

      console.log('Update successful! Specs count:', result.specifications.length);
      console.log('Papers count:', result.papers.length);
      console.log('Bindings count:', result.bindings.length);
      return result;
    } catch (error) {
      console.error('=== Product Update Error ===');
      console.error('Error:', error);
      throw error;
    }
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // ==================== 옵션 개별 관리 ====================

  async addSpecification(productId: string, data: Prisma.ProductSpecificationCreateWithoutProductInput) {
    await this.findOne(productId);
    return this.prisma.productSpecification.create({
      data: { ...data, productId },
    });
  }

  async updateSpecification(specId: string, data: Prisma.ProductSpecificationUpdateInput) {
    return this.prisma.productSpecification.update({
      where: { id: specId },
      data,
    });
  }

  async deleteSpecification(specId: string) {
    return this.prisma.productSpecification.delete({
      where: { id: specId },
    });
  }

  async addBinding(productId: string, data: Prisma.ProductBindingCreateWithoutProductInput) {
    await this.findOne(productId);
    return this.prisma.productBinding.create({
      data: { ...data, productId },
    });
  }

  async addPaper(productId: string, data: Prisma.ProductPaperCreateWithoutProductInput) {
    await this.findOne(productId);
    return this.prisma.productPaper.create({
      data: { ...data, productId },
    });
  }

  async addCover(productId: string, data: Prisma.ProductCoverCreateWithoutProductInput) {
    await this.findOne(productId);
    return this.prisma.productCover.create({
      data: { ...data, productId },
    });
  }

  async addFoil(productId: string, data: Prisma.ProductFoilCreateWithoutProductInput) {
    await this.findOne(productId);
    return this.prisma.productFoil.create({
      data: { ...data, productId },
    });
  }

  async addFinishing(productId: string, data: Prisma.ProductFinishingCreateWithoutProductInput) {
    await this.findOne(productId);
    return this.prisma.productFinishing.create({
      data: { ...data, productId },
    });
  }

  // ==================== 반제품 연결 관리 ====================

  async linkHalfProduct(productId: string, halfProductId: string, isRequired: boolean = false) {
    await this.findOne(productId);

    return this.prisma.productHalfProduct.upsert({
      where: {
        productId_halfProductId: { productId, halfProductId },
      },
      create: { productId, halfProductId, isRequired },
      update: { isRequired },
    });
  }

  async unlinkHalfProduct(productId: string, halfProductId: string) {
    return this.prisma.productHalfProduct.delete({
      where: {
        productId_halfProductId: { productId, halfProductId },
      },
    });
  }
}
