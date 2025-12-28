import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CalculateProductPriceDto,
  CalculateHalfProductPriceDto,
  PriceCalculationResultDto,
  SetGroupProductPriceDto,
  SetGroupHalfProductPriceDto,
} from '../dto';

/**
 * 가격 정책 우선순위:
 * 1. 거래처 개별 단가 (GroupProductPrice / GroupHalfProductPrice)
 * 2. 그룹 단가
 * 3. 그룹 할인율 (generalDiscount, premiumDiscount, importedDiscount)
 * 4. 표준 단가 (basePrice)
 */

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  // ==================== 상품 가격 계산 ====================

  async calculateProductPrice(dto: CalculateProductPriceDto): Promise<PriceCalculationResultDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: {
        specifications: true,
        bindings: true,
        papers: true,
        covers: true,
        foils: true,
        finishings: true,
      },
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다');
    }

    let basePrice = Number(product.basePrice);
    let optionPrice = 0;
    let paperType = 'normal';

    // 옵션 가격 계산
    if (dto.options) {
      for (const option of dto.options) {
        switch (option.type) {
          case 'specification': {
            const spec = product.specifications.find(s => s.id === option.optionId);
            if (spec) optionPrice += Number(spec.price);
            break;
          }
          case 'binding': {
            const binding = product.bindings.find(b => b.id === option.optionId);
            if (binding) optionPrice += Number(binding.price);
            break;
          }
          case 'paper': {
            const paper = product.papers.find(p => p.id === option.optionId);
            if (paper) {
              optionPrice += Number(paper.price);
              paperType = paper.type;
            }
            break;
          }
          case 'cover': {
            const cover = product.covers.find(c => c.id === option.optionId);
            if (cover) optionPrice += Number(cover.price);
            break;
          }
          case 'foil': {
            const foil = product.foils.find(f => f.id === option.optionId);
            if (foil) optionPrice += Number(foil.price);
            break;
          }
          case 'finishing': {
            const finishing = product.finishings.find(f => f.id === option.optionId);
            if (finishing) optionPrice += Number(finishing.price);
            break;
          }
        }
      }
    }

    const unitPrice = basePrice + optionPrice;
    let discountRate = 1.0;
    let appliedPolicy = '표준 단가';

    // 거래처별 가격 정책 적용
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        include: { group: true },
      });

      if (client?.group) {
        // 1. 그룹 개별 상품 가격 확인
        const groupPrice = await this.prisma.groupProductPrice.findUnique({
          where: {
            groupId_productId: {
              groupId: client.group.id,
              productId: dto.productId,
            },
          },
        });

        if (groupPrice) {
          const customUnitPrice = Number(groupPrice.price);
          discountRate = customUnitPrice / unitPrice;
          appliedPolicy = '그룹 개별 단가';
        } else {
          // 2. 그룹 할인율 적용
          switch (paperType) {
            case 'premium':
              discountRate = client.group.premiumDiscount / 100;
              appliedPolicy = '그룹 프리미엄 할인율';
              break;
            case 'imported':
              discountRate = client.group.importedDiscount / 100;
              appliedPolicy = '그룹 수입 할인율';
              break;
            default:
              discountRate = client.group.generalDiscount / 100;
              appliedPolicy = '그룹 일반 할인율';
          }
        }
      }
    }

    const discountAmount = unitPrice * (1 - discountRate);
    const finalUnitPrice = unitPrice * discountRate;
    const totalPrice = finalUnitPrice * dto.quantity;

    return {
      basePrice,
      optionPrice,
      unitPrice,
      quantity: dto.quantity,
      discountRate,
      discountAmount,
      finalUnitPrice,
      totalPrice,
      appliedPolicy,
    };
  }

  // ==================== 반제품 가격 계산 ====================

  async calculateHalfProductPrice(dto: CalculateHalfProductPriceDto): Promise<PriceCalculationResultDto> {
    const halfProduct = await this.prisma.halfProduct.findUnique({
      where: { id: dto.halfProductId },
      include: {
        specifications: true,
        priceTiers: { orderBy: { minQuantity: 'asc' } },
        options: true,
      },
    });

    if (!halfProduct) {
      throw new NotFoundException('반제품을 찾을 수 없습니다');
    }

    let basePrice = Number(halfProduct.basePrice);
    let optionPrice = 0;

    // 규격 가격 추가
    if (dto.specificationId) {
      const spec = halfProduct.specifications.find(s => s.id === dto.specificationId);
      if (spec) optionPrice += Number(spec.price);
    }

    // 옵션 가격 추가
    if (dto.optionSelections) {
      for (const selection of dto.optionSelections) {
        const option = halfProduct.options.find(o => o.id === selection.optionId);
        if (option && option.values) {
          const optionValues = option.values as { name: string; price?: number }[];
          const selectedValue = optionValues.find(v => v.name === selection.value);
          if (selectedValue?.price) {
            optionPrice += selectedValue.price;
          }
        }
      }
    }

    const unitPrice = basePrice + optionPrice;
    let discountRate = 1.0;
    let appliedPolicy = '표준 단가';

    // 수량별 할인율 적용
    for (const tier of halfProduct.priceTiers) {
      if (dto.quantity >= tier.minQuantity && (!tier.maxQuantity || dto.quantity <= tier.maxQuantity)) {
        discountRate = tier.discountRate;
        appliedPolicy = `수량 할인 (${tier.minQuantity}개 이상)`;
        break;
      }
    }

    // 거래처별 가격 정책 적용
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        include: { group: true },
      });

      if (client?.group) {
        // 그룹 개별 반제품 가격 확인
        const groupPrice = await this.prisma.groupHalfProductPrice.findUnique({
          where: {
            groupId_halfProductId: {
              groupId: client.group.id,
              halfProductId: dto.halfProductId,
            },
          },
        });

        if (groupPrice) {
          const customUnitPrice = Number(groupPrice.price);
          discountRate = customUnitPrice / unitPrice;
          appliedPolicy = '그룹 개별 단가';
        }
      }
    }

    const discountAmount = unitPrice * (1 - discountRate);
    const finalUnitPrice = unitPrice * discountRate;
    const totalPrice = finalUnitPrice * dto.quantity;

    return {
      basePrice,
      optionPrice,
      unitPrice,
      quantity: dto.quantity,
      discountRate,
      discountAmount,
      finalUnitPrice,
      totalPrice,
      appliedPolicy,
    };
  }

  // ==================== 그룹 가격 관리 ====================

  async setGroupProductPrice(dto: SetGroupProductPriceDto) {
    return this.prisma.groupProductPrice.upsert({
      where: {
        groupId_productId: {
          groupId: dto.groupId,
          productId: dto.productId,
        },
      },
      create: {
        groupId: dto.groupId,
        productId: dto.productId,
        price: dto.price,
      },
      update: {
        price: dto.price,
      },
    });
  }

  async deleteGroupProductPrice(groupId: string, productId: string) {
    return this.prisma.groupProductPrice.delete({
      where: {
        groupId_productId: { groupId, productId },
      },
    });
  }

  async setGroupHalfProductPrice(dto: SetGroupHalfProductPriceDto) {
    return this.prisma.groupHalfProductPrice.upsert({
      where: {
        groupId_halfProductId: {
          groupId: dto.groupId,
          halfProductId: dto.halfProductId,
        },
      },
      create: {
        groupId: dto.groupId,
        halfProductId: dto.halfProductId,
        price: dto.price,
      },
      update: {
        price: dto.price,
      },
    });
  }

  async deleteGroupHalfProductPrice(groupId: string, halfProductId: string) {
    return this.prisma.groupHalfProductPrice.delete({
      where: {
        groupId_halfProductId: { groupId, halfProductId },
      },
    });
  }

  // ==================== 그룹별 가격 목록 조회 ====================

  async getGroupProductPrices(groupId: string) {
    return this.prisma.groupProductPrice.findMany({
      where: { groupId },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            basePrice: true,
          },
        },
      },
    });
  }

  async getGroupHalfProductPrices(groupId: string) {
    return this.prisma.groupHalfProductPrice.findMany({
      where: { groupId },
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
    });
  }
}
