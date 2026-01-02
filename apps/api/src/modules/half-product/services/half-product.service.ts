import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateHalfProductDto, UpdateHalfProductDto } from '../dto';

@Injectable()
export class HalfProductService {
  constructor(private prisma: PrismaService) {}

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    categoryLargeId?: string;
    status?: string;
  }) {
    const { skip = 0, take = 20, search, categoryLargeId, status } = params;

    const where: Prisma.HalfProductWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { code: { contains: search } },
        ],
      }),
      ...(categoryLargeId && { categoryLargeId }),
      ...(status && { status }),
    };

    const [data, total] = await Promise.all([
      this.prisma.halfProduct.findMany({
        where,
        skip,
        take,
        include: {
          categoryLarge: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              specifications: true,
              priceTiers: true,
              options: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.halfProduct.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const halfProduct = await this.prisma.halfProduct.findUnique({
      where: { id },
      include: {
        categoryLarge: true,
        specifications: { orderBy: { sortOrder: 'asc' } },
        priceTiers: { orderBy: { sortOrder: 'asc' } },
        options: { orderBy: { sortOrder: 'asc' } },
        productLinks: {
          include: {
            product: {
              select: {
                id: true,
                productCode: true,
                productName: true,
              },
            },
          },
        },
      },
    });

    if (!halfProduct) {
      throw new NotFoundException('반제품을 찾을 수 없습니다');
    }

    return halfProduct;
  }

  async create(dto: CreateHalfProductDto) {
    const { specifications, priceTiers, options, ...halfProductData } = dto;

    // Check for duplicate code
    const existing = await this.prisma.halfProduct.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 반제품 코드입니다');
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryLargeId },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다');
    }

    return this.prisma.halfProduct.create({
      data: {
        ...halfProductData,
        basePrice: dto.basePrice,
        specifications: specifications?.length
          ? { create: specifications }
          : undefined,
        priceTiers: priceTiers?.length
          ? { create: priceTiers }
          : undefined,
        options: options?.length
          ? { create: options.map(opt => ({ ...opt, values: opt.values as any })) }
          : undefined,
      },
      include: {
        categoryLarge: true,
        specifications: true,
        priceTiers: true,
        options: true,
      },
    });
  }

  async update(id: string, dto: UpdateHalfProductDto) {
    await this.findOne(id);

    const { specifications, priceTiers, options, ...halfProductData } = dto;

    // 기존 옵션들 삭제 후 재생성
    const deleteAndCreate = async () => {
      if (specifications) {
        await this.prisma.halfProductSpecification.deleteMany({ where: { halfProductId: id } });
      }
      if (priceTiers) {
        await this.prisma.halfProductPriceTier.deleteMany({ where: { halfProductId: id } });
      }
      if (options) {
        await this.prisma.halfProductOption.deleteMany({ where: { halfProductId: id } });
      }

      return this.prisma.halfProduct.update({
        where: { id },
        data: {
          ...halfProductData,
          specifications: specifications?.length
            ? { create: specifications }
            : undefined,
          priceTiers: priceTiers?.length
            ? { create: priceTiers }
            : undefined,
          options: options?.length
            ? { create: options.map(opt => ({ ...opt, values: opt.values as any })) }
            : undefined,
        },
        include: {
          categoryLarge: true,
          specifications: true,
          priceTiers: true,
          options: true,
        },
      });
    };

    return this.prisma.$transaction(async () => {
      return deleteAndCreate();
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.halfProduct.delete({
      where: { id },
    });
  }

  // ==================== 가격 계산 ====================

  async calculatePrice(
    id: string,
    quantity: number,
    specificationId?: string,
    optionSelections?: { optionId: string; value: string }[],
  ) {
    const halfProduct = await this.findOne(id);

    let price = Number(halfProduct.basePrice);

    // 규격 가격 추가
    if (specificationId) {
      const spec = halfProduct.specifications.find(s => s.id === specificationId);
      if (spec) {
        price += Number(spec.price);
      }
    }

    // 옵션 가격 추가
    if (optionSelections) {
      for (const selection of optionSelections) {
        const option = halfProduct.options.find(o => o.id === selection.optionId);
        if (option && option.values) {
          const optionValues = option.values as { name: string; price?: number }[];
          const selectedValue = optionValues.find(v => v.name === selection.value);
          if (selectedValue?.price) {
            price += selectedValue.price;
          }
        }
      }
    }

    // 수량별 할인율 적용
    let discountRate = 1.0;
    for (const tier of halfProduct.priceTiers) {
      if (quantity >= tier.minQuantity && (!tier.maxQuantity || quantity <= tier.maxQuantity)) {
        discountRate = tier.discountRate;
        break;
      }
    }

    const unitPrice = price * discountRate;
    const totalPrice = unitPrice * quantity;

    return {
      basePrice: Number(halfProduct.basePrice),
      unitPrice,
      quantity,
      discountRate,
      totalPrice,
    };
  }
}
