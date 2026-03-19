import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CalculateProductPriceDto,
  CalculateHalfProductPriceDto,
  PriceCalculationResultDto,
  SetGroupProductPriceDto,
  SetGroupHalfProductPriceDto,
  SetGroupProductionSettingPricesDto,
  SetClientProductionSettingPricesDto,
  GetAlbumPagePriceDto,
  CalculateAlbumOrderPriceDto,
  AlbumOrderPriceResultDto,
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

  // ==================== 앨범 페이지 단가 조회 ====================

  /**
   * 앨범 업로드 시 DB 기반 실제 페이지 단가 조회
   * 우선순위: 1) 거래처 개별 단가 → 2) 그룹 단가 → 3) 0원 반환
   */
  async getAlbumPagePrice(
    clientId: string | null,
    dto: GetAlbumPagePriceDto,
  ): Promise<{ pricePerPage: number }> {
    const { productionSettingId, specificationId, colorMode, pageLayout } = dto;

    // 색상+레이아웃 조합에 따른 필드명 결정
    const priceField = this.getColorLayoutPriceField(colorMode, pageLayout);

    // 1. 거래처 개별 단가 조회
    if (clientId) {
      const clientPrice = await this.prisma.clientProductionSettingPrice.findFirst({
        where: {
          clientId,
          productionSettingId,
          specificationId,
        },
      });

      if (clientPrice && clientPrice[priceField] != null) {
        return { pricePerPage: Number(clientPrice[priceField]) };
      }

      // 2. 거래처의 그룹 단가 조회
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: { groupId: true },
      });

      if (client?.groupId) {
        const groupPrice = await this.prisma.groupProductionSettingPrice.findFirst({
          where: {
            clientGroupId: client.groupId,
            productionSettingId,
            specificationId,
          },
        });

        if (groupPrice && groupPrice[priceField] != null) {
          return { pricePerPage: Number(groupPrice[priceField]) };
        }
      }
    }

    // 3. 값이 없으면 0원 반환
    return { pricePerPage: 0 };
  }

  /**
   * 색상 모드와 페이지 레이아웃에 따른 가격 필드명 반환
   */
  private getColorLayoutPriceField(
    colorMode: '4c' | '6c',
    pageLayout: 'single' | 'spread',
  ): 'fourColorSinglePrice' | 'fourColorDoublePrice' | 'sixColorSinglePrice' | 'sixColorDoublePrice' {
    if (colorMode === '4c') {
      return pageLayout === 'single' ? 'fourColorSinglePrice' : 'fourColorDoublePrice';
    }
    return pageLayout === 'single' ? 'sixColorSinglePrice' : 'sixColorDoublePrice';
  }

  // ==================== 앨범 주문 가격 계산 ====================

  /**
   * 앨범 주문 가격 계산
   * 1. Product → outputPriceSettings에서 productionSettingId 추출
   * 2. Specification에서 widthInch + heightInch + forIndigoAlbum 매칭
   * 3. ProductionSettingPrice 조회 (또는 거래처/그룹 override)
   * 4. rangePrices 우선 → 없으면 basePrice + pricePerPage * pageCount
   */
  async calculateAlbumOrderPrice(dto: CalculateAlbumOrderPriceDto): Promise<AlbumOrderPriceResultDto> {
    // 1. 상품 조회 (bindings 포함 - 제본 단가의 productionSettingId 확보)
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        productName: true,
        outputPriceSettings: true,
        bindings: {
          select: { productionSettingId: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    // 2. 규격 조회 (widthInch + heightInch + forIndigoAlbum)
    const specification = await this.prisma.specification.findFirst({
      where: {
        widthInch: dto.widthInch,
        heightInch: dto.heightInch,
        forIndigoAlbum: true,
        isActive: true,
      },
    });

    if (!specification) {
      throw new NotFoundException(
        `규격을 찾을 수 없습니다 (${dto.widthInch}" x ${dto.heightInch}", 인디고앨범).`,
      );
    }

    // 3. productionSettingId 목록 수집: bindings 우선, 없으면 outputPriceSettings JSON
    const bindingSettingIds = (product.bindings || [])
      .map((b: any) => b.productionSettingId)
      .filter(Boolean) as string[];

    const outputSettings = (product.outputPriceSettings as any[]) || [];
    const outputSettingIds = outputSettings
      .filter((s: any) => s?.productionSettingId)
      .map((s: any) => s.productionSettingId as string);

    const productionSettingIds = [...new Set([...bindingSettingIds, ...outputSettingIds])];

    if (productionSettingIds.length === 0) {
      throw new NotFoundException('상품에 제본/출력단가 설정이 없습니다.');
    }

    // 4. 가격 조회: 거래처 개별 → 그룹 → 표준 순서
    let priceRecord: any = null;
    let matchedProductionSettingId: string | null = null;
    let appliedPolicy = '표준 단가';

    // 4-1. 거래처 개별 단가 조회
    if (dto.clientId) {
      const clientPrice = await this.prisma.clientProductionSettingPrice.findFirst({
        where: {
          clientId: dto.clientId,
          productionSettingId: { in: productionSettingIds },
          specificationId: specification.id,
        },
      });

      if (clientPrice) {
        priceRecord = clientPrice;
        matchedProductionSettingId = clientPrice.productionSettingId;
        appliedPolicy = '거래처 개별 단가';
      }

      // 4-2. 거래처 그룹 단가 조회
      if (!priceRecord) {
        const client = await this.prisma.client.findUnique({
          where: { id: dto.clientId },
          select: { groupId: true },
        });

        if (client?.groupId) {
          const groupPrice = await this.prisma.groupProductionSettingPrice.findFirst({
            where: {
              clientGroupId: client.groupId,
              productionSettingId: { in: productionSettingIds },
              specificationId: specification.id,
            },
          });

          if (groupPrice) {
            priceRecord = groupPrice;
            matchedProductionSettingId = groupPrice.productionSettingId;
            appliedPolicy = '그룹 단가';
          }
        }
      }
    }

    // 4-3. 표준 단가 조회 (ProductionSettingPrice)
    if (!priceRecord) {
      const standardPrice = await this.prisma.productionSettingPrice.findFirst({
        where: {
          productionSettingId: { in: productionSettingIds },
          specificationId: specification.id,
        },
      });

      if (standardPrice) {
        priceRecord = standardPrice;
        matchedProductionSettingId = standardPrice.productionSettingId;
        appliedPolicy = '표준 단가';
      }
    }

    if (!priceRecord) {
      throw new NotFoundException(
        `해당 규격(${specification.nup || specification.code})에 대한 가격 정보가 없습니다.`,
      );
    }

    // 5. 가격 계산
    const coverPrice = Number(priceRecord.basePrice) || 0;
    const rangePrices = priceRecord.rangePrices as Record<string, any> | null;

    // 색상+레이아웃에 따른 pricePerPage 결정
    const colorLayoutField = this.getColorLayoutPriceField(dto.colorMode, dto.pageLayout);
    let pricePerPage = Number(priceRecord[colorLayoutField]) || Number(priceRecord.pricePerPage) || 0;

    let printPrice: number;
    let unitPrice: number;

    // rangePrices에 pageCount 키가 있으면 해당 값 사용
    const pageCountKey = String(dto.pageCount);
    if (rangePrices && pageCountKey in rangePrices && rangePrices[pageCountKey] != null) {
      // rangePrices 값은 표지 포함 총액
      unitPrice = Number(rangePrices[pageCountKey]);
      // __coverPrice가 rangePrices에 저장되어 있을 수 있음
      const storedCoverPrice = rangePrices['__coverPrice'] != null
        ? Number(rangePrices['__coverPrice'])
        : coverPrice;
      printPrice = unitPrice - storedCoverPrice;
      // pricePerPage 역산 (참고용)
      if (dto.pageCount > 0) {
        pricePerPage = printPrice / dto.pageCount;
      }
    } else {
      // 기본 계산: coverPrice + pricePerPage * pageCount
      printPrice = pricePerPage * dto.pageCount;
      unitPrice = coverPrice + printPrice;
    }

    // 6. 용지 추가금 계산
    let paperPrice = 0;
    if (dto.paperId) {
      const specPrice = await this.prisma.specificationPrice.findFirst({
        where: {
          specificationId: specification.id,
          groupId: dto.paperId,
        },
      });

      if (specPrice) {
        paperPrice = Number(specPrice.price) * dto.pageCount;
      }
    }

    // 7. 제본비 (현재 별도 제본비 모델 없음 → 0)
    const bindingPrice = 0;

    // 총 단가에 용지금+제본비 합산
    unitPrice = unitPrice + paperPrice + bindingPrice;

    return {
      coverPrice,
      pricePerPage: Math.round(pricePerPage * 100) / 100,
      printPrice,
      paperPrice,
      bindingPrice,
      unitPrice,
      specificationId: specification.id,
      nup: specification.nup || '',
      appliedPolicy,
    };
  }

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
            const spec = product.specifications.find((s: { id: string }) => s.id === option.optionId);
            if (spec) optionPrice += Number(spec.price);
            break;
          }
          case 'binding': {
            const binding = product.bindings.find((b: { id: string }) => b.id === option.optionId);
            if (binding) optionPrice += Number(binding.price);
            break;
          }
          case 'paper': {
            const paper = product.papers.find((p: { id: string }) => p.id === option.optionId);
            if (paper) {
              optionPrice += Number(paper.price);
              paperType = paper.type;
            }
            break;
          }
          case 'cover': {
            const cover = product.covers.find((c: { id: string }) => c.id === option.optionId);
            if (cover) optionPrice += Number(cover.price);
            break;
          }
          case 'foil': {
            const foil = product.foils.find((f: { id: string }) => f.id === option.optionId);
            if (foil) optionPrice += Number(foil.price);
            break;
          }
          case 'finishing': {
            const finishing = product.finishings.find((f: { id: string }) => f.id === option.optionId);
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
      const spec = halfProduct.specifications.find((s: { id: string }) => s.id === dto.specificationId);
      if (spec) optionPrice += Number(spec.price);
    }

    // 옵션 가격 추가
    if (dto.optionSelections) {
      for (const selection of dto.optionSelections) {
        const option = halfProduct.options.find((o: { id: string }) => o.id === selection.optionId);
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

  // ==================== 그룹 생산설정 단가 관리 ====================

  /**
   * 그룹별 생산설정 단가 조회
   */
  async getGroupProductionSettingPrices(clientGroupId: string, productionSettingId?: string) {
    const where: any = { clientGroupId };
    if (productionSettingId) {
      where.productionSettingId = productionSettingId;
    }

    return this.prisma.groupProductionSettingPrice.findMany({
      where,
      include: {
        productionSetting: {
          select: {
            id: true,
            codeName: true,
            settingName: true,
            pricingType: true,
            printMethod: true,
          },
        },
      },
      orderBy: [
        { productionSettingId: 'asc' },
        { minQuantity: 'asc' },
        { specificationId: 'asc' },
      ],
    });
  }

  /**
   * 그룹별 생산설정 단가 설정 (upsert) - 트랜잭션 배치 처리
   */
  async setGroupProductionSettingPrices(dto: SetGroupProductionSettingPricesDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. 기존 레코드 한번에 조회
      const existingRecords = await tx.groupProductionSettingPrice.findMany({
        where: {
          clientGroupId: dto.clientGroupId,
          productionSettingId: dto.productionSettingId,
        },
      });

      // 기존 레코드를 복합키로 맵핑
      const existingMap = new Map(
        existingRecords.map(r => [
          `${r.specificationId || ''}|${r.priceGroupId || ''}|${r.minQuantity ?? ''}`,
          r,
        ])
      );

      const results = [];

      // 2. 생성/업데이트 분리
      const toCreate: any[] = [];
      const updateOps: Promise<any>[] = [];

      for (const priceData of dto.prices) {
        const key = `${priceData.specificationId || ''}|${priceData.priceGroupId || ''}|${priceData.minQuantity ?? ''}`;
        const data = {
          clientGroupId: dto.clientGroupId,
          productionSettingId: dto.productionSettingId,
          specificationId: priceData.specificationId,
          priceGroupId: priceData.priceGroupId,
          minQuantity: priceData.minQuantity,
          maxQuantity: priceData.maxQuantity,
          weight: priceData.weight,
          price: priceData.price || 0,
          singleSidedPrice: priceData.singleSidedPrice,
          doubleSidedPrice: priceData.doubleSidedPrice,
          fourColorSinglePrice: priceData.fourColorSinglePrice,
          fourColorDoublePrice: priceData.fourColorDoublePrice,
          sixColorSinglePrice: priceData.sixColorSinglePrice,
          sixColorDoublePrice: priceData.sixColorDoublePrice,
          basePages: priceData.basePages,
          basePrice: priceData.basePrice,
          pricePerPage: priceData.pricePerPage,
          rangePrices: (() => {
            const rp = priceData.rangePrices ? JSON.parse(JSON.stringify(priceData.rangePrices)) : {};
            if (priceData.coverPrice != null) rp.__coverPrice = priceData.coverPrice;
            return Object.keys(rp).length > 0 ? rp : null;
          })(),
        };

        const existing = existingMap.get(key);
        if (existing) {
          updateOps.push(
            tx.groupProductionSettingPrice.update({
              where: { id: existing.id },
              data,
            })
          );
        } else {
          toCreate.push(data);
        }
      }

      // 3. 업데이트 병렬 실행
      if (updateOps.length > 0) {
        const updated = await Promise.all(updateOps);
        results.push(...updated);
      }

      // 4. 신규 건 배치 생성
      if (toCreate.length > 0) {
        await tx.groupProductionSettingPrice.createMany({ data: toCreate });
        // createMany는 레코드를 반환하지 않으므로 다시 조회
        const created = await tx.groupProductionSettingPrice.findMany({
          where: {
            clientGroupId: dto.clientGroupId,
            productionSettingId: dto.productionSettingId,
          },
          orderBy: { createdAt: 'desc' },
          take: toCreate.length,
        });
        results.push(...created);
      }

      return results;
    });
  }

  /**
   * 그룹별 생산설정 단가 삭제
   */
  async deleteGroupProductionSettingPrice(id: string) {
    return this.prisma.groupProductionSettingPrice.delete({
      where: { id },
    });
  }

  /**
   * 그룹별 생산설정 단가 전체 삭제 (특정 설정에 대해)
   */
  async deleteGroupProductionSettingPrices(clientGroupId: string, productionSettingId: string) {
    return this.prisma.groupProductionSettingPrice.deleteMany({
      where: {
        clientGroupId,
        productionSettingId,
      },
    });
  }
  // ==================== 거래처 개별 생산설정 단가 관리 ====================

  /**
   * 거래처별 개별 생산설정 단가 목록 조회
   */
  async getClientProductionSettingPrices(clientId: string, productionSettingId?: string) {
    const where: any = { clientId };
    if (productionSettingId) {
      where.productionSettingId = productionSettingId;
    }

    return this.prisma.clientProductionSettingPrice.findMany({
      where,
      include: {
        productionSetting: {
          select: {
            id: true,
            codeName: true,
            settingName: true,
            pricingType: true,
            printMethod: true,
            group: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { productionSettingId: 'asc' },
        { minQuantity: 'asc' },
        { specificationId: 'asc' },
      ],
    });
  }

  /**
   * 거래처별 개별 생산설정 단가 설정 (upsert) - 트랜잭션 배치 처리
   */
  async setClientProductionSettingPrices(dto: SetClientProductionSettingPricesDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. 기존 레코드 한번에 조회
      const existingRecords = await tx.clientProductionSettingPrice.findMany({
        where: {
          clientId: dto.clientId,
          productionSettingId: dto.productionSettingId,
        },
      });

      const existingMap = new Map(
        existingRecords.map(r => [
          `${r.specificationId || ''}|${r.priceGroupId || ''}|${r.minQuantity ?? ''}`,
          r,
        ])
      );

      const results = [];
      const toCreate: any[] = [];
      const updateOps: Promise<any>[] = [];

      for (const priceData of dto.prices) {
        const key = `${priceData.specificationId || ''}|${priceData.priceGroupId || ''}|${priceData.minQuantity ?? ''}`;
        const data = {
          clientId: dto.clientId,
          productionSettingId: dto.productionSettingId,
          specificationId: priceData.specificationId,
          priceGroupId: priceData.priceGroupId,
          minQuantity: priceData.minQuantity,
          maxQuantity: priceData.maxQuantity,
          weight: priceData.weight,
          price: priceData.price || 0,
          singleSidedPrice: priceData.singleSidedPrice,
          doubleSidedPrice: priceData.doubleSidedPrice,
          fourColorSinglePrice: priceData.fourColorSinglePrice,
          fourColorDoublePrice: priceData.fourColorDoublePrice,
          sixColorSinglePrice: priceData.sixColorSinglePrice,
          sixColorDoublePrice: priceData.sixColorDoublePrice,
          basePages: priceData.basePages,
          basePrice: priceData.basePrice,
          pricePerPage: priceData.pricePerPage,
          rangePrices: (() => {
            const rp = priceData.rangePrices ? JSON.parse(JSON.stringify(priceData.rangePrices)) : {};
            if (priceData.coverPrice != null) rp.__coverPrice = priceData.coverPrice;
            return Object.keys(rp).length > 0 ? rp : null;
          })(),
        };

        const existing = existingMap.get(key);
        if (existing) {
          updateOps.push(
            tx.clientProductionSettingPrice.update({
              where: { id: existing.id },
              data,
            })
          );
        } else {
          toCreate.push(data);
        }
      }

      if (updateOps.length > 0) {
        const updated = await Promise.all(updateOps);
        results.push(...updated);
      }

      if (toCreate.length > 0) {
        await tx.clientProductionSettingPrice.createMany({ data: toCreate });
        const created = await tx.clientProductionSettingPrice.findMany({
          where: {
            clientId: dto.clientId,
            productionSettingId: dto.productionSettingId,
          },
          orderBy: { createdAt: 'desc' },
          take: toCreate.length,
        });
        results.push(...created);
      }

      return results;
    });
  }

  /**
   * 거래처별 개별 생산설정 단가 개별 삭제
   */
  async deleteClientProductionSettingPrice(id: string) {
    return this.prisma.clientProductionSettingPrice.delete({
      where: { id },
    });
  }

  /**
   * 거래처별 개별 생산설정 단가 전체 삭제 (특정 설정에 대해)
   */
  async deleteClientProductionSettingPrices(clientId: string, productionSettingId: string) {
    return this.prisma.clientProductionSettingPrice.deleteMany({
      where: {
        clientId,
        productionSettingId,
      },
    });
  }

  /**
   * 거래처별 개별 단가 설정된 생산설정 목록 조회 (카테고리별 구분용)
   */
  async getClientProductionSettingSummary(clientId: string) {
    const prices = await this.prisma.clientProductionSettingPrice.findMany({
      where: { clientId },
      select: {
        productionSettingId: true,
        productionSetting: {
          select: {
            id: true,
            codeName: true,
            settingName: true,
            pricingType: true,
            printMethod: true,
            group: {
              select: {
                id: true,
                name: true,
                parentId: true,
                parent: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      distinct: ['productionSettingId'],
    });

    return prices.map((p) => ({
      productionSettingId: p.productionSettingId,
      ...p.productionSetting,
    }));
  }
}
