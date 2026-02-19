import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto, UpdateProductDto } from '../dto';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) { }

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

  // 조회수 증가
  async incrementViewCount(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
      select: { viewCount: true },
    });
  }

  // 주문수 증가
  async incrementOrderCount(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { orderCount: { increment: 1 } },
      select: { orderCount: true },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        specifications: {
          include: {
            specification: {
              select: { id: true, isActive: true, forIndigo: true, forInkjet: true, forAlbum: true, forFrame: true, forBooklet: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
        bindings: { orderBy: { sortOrder: 'asc' } },
        papers: {
          orderBy: { sortOrder: 'asc' },
          include: { paper: { select: { id: true, name: true, printMethods: true, colorType: true, isActive: true } } },
        },
        covers: { orderBy: { sortOrder: 'asc' } },
        foils: { orderBy: { sortOrder: 'asc' } },
        fabrics: {
          orderBy: { sortOrder: 'asc' },
          include: {
            fabric: {
              select: { id: true, name: true, category: true, colorCode: true, colorName: true, thumbnailUrl: true, isActive: true },
            },
          },
        },
        finishings: {
          orderBy: { sortOrder: 'asc' },
          include: {
            productionGroup: {
              include: {
                settings: {
                  where: { isActive: true },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    prices: {
                      orderBy: [{ specificationId: 'asc' }, { minQuantity: 'asc' }],
                    },
                  },
                },
              },
            },
          },
        },
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
        publicCopperPlates: {
          include: {
            publicCopperPlate: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다');
    }

    // 상품 outputPriceSettings 기반으로 활성 규격만 필터링
    const outputSettings = product.outputPriceSettings as any[];
    if (outputSettings && Array.isArray(outputSettings) && outputSettings.length > 0) {
      const hasIndigo = outputSettings.some((s: any) => s.outputMethod === 'INDIGO');
      const hasInkjet = outputSettings.some((s: any) => s.outputMethod === 'INKJET');

      (product as any).specifications = product.specifications
        .filter((ps: any) => {
          if (!ps.specification) return false;
          if (!ps.specification.isActive) return false;
          if (hasIndigo && !hasInkjet) return ps.specification.forIndigo;
          if (hasInkjet && !hasIndigo) {
            return ps.specification.forInkjet || ps.specification.forAlbum ||
                   ps.specification.forFrame || ps.specification.forBooklet;
          }
          return true;
        })
        .map(({ specification, ...rest }: any) => ({
          ...rest,
          forIndigo: specification?.forIndigo ?? false,
          forInkjet: specification?.forInkjet ?? false,
        }));
    } else {
      (product as any).specifications = product.specifications
        .filter((ps: any) => !ps.specification || ps.specification.isActive)
        .map(({ specification, ...rest }: any) => ({
          ...rest,
          forIndigo: specification?.forIndigo ?? false,
          forInkjet: specification?.forInkjet ?? false,
        }));
    }

    return this.convertDecimalToNumber(product);
  }

  async create(dto: CreateProductDto) {
    const { specifications, bindings, papers, covers, foils, finishings, outputPriceSettings, fabricIds, ...productData } = dto;

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
        fabrics: fabricIds?.length
          ? { create: fabricIds.map((fabricId, idx) => ({ fabricId, sortOrder: idx })) }
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
        fabrics: { include: { fabric: { select: { id: true, name: true, category: true, colorCode: true, thumbnailUrl: true, isActive: true } } } },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);

    const { specifications, bindings, papers, covers, foils, finishings, outputPriceSettings, fabricIds, categoryId, ...productData } = dto;

    // 기존 옵션들 삭제
    if (specifications !== undefined) {
      await this.prisma.productSpecification.deleteMany({ where: { productId: id } });
    }
    if (bindings !== undefined) {
      await this.prisma.productBinding.deleteMany({ where: { productId: id } });
    }
    if (papers !== undefined) {
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
    if (fabricIds !== undefined) {
      await this.prisma.productFabric.deleteMany({ where: { productId: id } });
    }

    // 상품 업데이트
    return this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
        ...(outputPriceSettings !== undefined && { outputPriceSettings: JSON.parse(JSON.stringify(outputPriceSettings)) }),
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
        fabrics: fabricIds !== undefined && fabricIds.length > 0
          ? { create: fabricIds.map((fabricId, idx) => ({ fabricId, sortOrder: idx })) }
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
        fabrics: { include: { fabric: { select: { id: true, name: true, category: true, colorCode: true, thumbnailUrl: true, isActive: true } } } },
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.product.delete({
      where: { id },
    });
  }

  // ==================== 옵션 개별 관리 ====================

  async addSpecification(productId: string, data: Prisma.ProductSpecificationUncheckedCreateWithoutProductInput) {
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
    const { productionGroup, ...rest } = data as any;
    return this.prisma.productFinishing.create({
      data: {
        ...rest,
        productId,
        ...(rest.productionGroupId ? { productionGroupId: rest.productionGroupId } : {}),
      },
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

  // ==================== 용지 마스터 동기화 ====================

  /**
   * 상품의 outputPriceSettings(출력방식)에 맞는 마스터 용지를 ProductPaper에 동기화
   * - 이미 연결된 용지(paperId)는 건너뜀
   * - paperId 없는 기존 항목은 이름 매칭으로 연결
   * - 누락된 마스터 용지는 새 ProductPaper로 추가
   * - 선택 해제된 출력방식의 용지는 비활성화, 선택된 출력방식의 용지는 재활성화
   * @param requestedPrintMethods 외부에서 명시적으로 전달하는 출력방식 목록 (선택적)
   */
  async syncProductPapers(productId: string, requestedPrintMethods?: string[]) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { papers: true },
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다');
    }

    // 1. 출력방식 결정: 외부 파라미터 우선, 없으면 DB의 outputPriceSettings에서 파악
    let printMethods: string[] = [];
    if (requestedPrintMethods && requestedPrintMethods.length > 0) {
      printMethods = requestedPrintMethods;
    } else {
      const outputSettings = product.outputPriceSettings as any[];
      if (outputSettings && Array.isArray(outputSettings)) {
        if (outputSettings.some((s: any) => s.outputMethod === 'INDIGO')) printMethods.push('indigo');
        if (outputSettings.some((s: any) => s.outputMethod === 'INKJET')) printMethods.push('inkjet');
      }
    }

    // 출력방식이 없으면 전체 용지 대상
    const masterPapers = await this.prisma.paper.findMany({
      where: {
        isActive: true,
        ...(printMethods.length > 0 && { printMethods: { hasSome: printMethods } }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { grammage: 'asc' }],
    });

    const existingPapers = product.papers;
    const linkedPaperIds = new Set(existingPapers.filter(p => p.paperId).map(p => p.paperId));

    let addedCount = 0;
    let linkedCount = 0;
    const details: { paperId: string; paperName: string; action: 'added' | 'linked' }[] = [];

    // 2. paperId 없는 기존 항목 → 이름+평량 정확 매칭으로 paperId 연결
    for (const pp of existingPapers) {
      if (pp.paperId) continue;

      const matchedMaster = masterPapers.find(mp => {
        // 정확한 이름+평량 매칭만 허용
        const ppNameNorm = pp.name.replace(/\s+/g, '').toLowerCase();
        const masterExact = `${mp.name}${mp.grammage}g`.replace(/\s+/g, '').toLowerCase();
        if (ppNameNorm === masterExact) return true;
        // 이름이 정확히 같고 평량도 같은 경우
        const ppBaseName = pp.name.replace(/\s*\d+g?$/i, '').trim().toLowerCase();
        return ppBaseName === mp.name.toLowerCase() && pp.grammage === mp.grammage;
      });

      if (matchedMaster && !linkedPaperIds.has(matchedMaster.id)) {
        await this.prisma.productPaper.update({
          where: { id: pp.id },
          data: { paperId: matchedMaster.id },
        }).catch(() => { /* unique constraint 무시 */ });
        linkedPaperIds.add(matchedMaster.id);
        linkedCount++;
        details.push({ paperId: matchedMaster.id, paperName: matchedMaster.name, action: 'linked' });
      }
    }

    // 3. 누락된 마스터 용지 → 새 ProductPaper 생성
    const maxSortOrder = existingPapers.length > 0
      ? Math.max(...existingPapers.map(p => p.sortOrder))
      : -1;

    let sortIdx = maxSortOrder + 1;
    for (const mp of masterPapers) {
      if (linkedPaperIds.has(mp.id)) continue;

      const displayName = mp.grammage ? `${mp.name} ${mp.grammage}g` : mp.name;
      const paperPrintMethod = printMethods.length === 1
        ? printMethods[0]
        : mp.printMethods.find(m => printMethods.includes(m)) || mp.printMethods[0] || null;

      await this.prisma.productPaper.create({
        data: {
          productId,
          paperId: mp.id,
          name: displayName,
          type: mp.paperType === 'roll' ? 'roll' : 'normal',
          grammage: mp.grammage,
          printMethod: paperPrintMethod,
          frontCoating: mp.jdfFrontCoating,
          grade: mp.jdfGrade,
          price: 0,
          isDefault: false,
          isActive: true,
          isActive4: true,
          isActive6: true,
          sortOrder: sortIdx++,
        },
      });

      addedCount++;
      details.push({ paperId: mp.id, paperName: displayName, action: 'added' });
    }

    // 4. 출력방식 변경에 따른 기존 용지 활성화/비활성화
    // printMethods가 명시된 경우에만 실행 (출력방식 변경 시)
    let deactivatedCount = 0;
    let reactivatedCount = 0;
    if (requestedPrintMethods && requestedPrintMethods.length > 0) {
      // 최신 용지 목록 조회 (새로 추가된 용지 포함)
      const latestPapers = await this.prisma.productPaper.findMany({
        where: { productId },
      });

      for (const paper of latestPapers) {
        if (!paper.printMethod) continue;

        const isMethodSelected = printMethods.includes(paper.printMethod);

        if (!isMethodSelected) {
          // 선택 해제된 출력방식의 용지 → 비활성화
          await this.prisma.productPaper.update({
            where: { id: paper.id },
            data: {
              isActive: false,
              isActive4: paper.printMethod === 'indigo' ? false : paper.isActive4,
              isActive6: paper.printMethod === 'indigo' ? false : paper.isActive6,
            },
          });
          deactivatedCount++;
        } else {
          // 선택된 출력방식의 용지 → 재활성화
          await this.prisma.productPaper.update({
            where: { id: paper.id },
            data: {
              isActive: true,
              isActive4: paper.printMethod === 'indigo' ? true : paper.isActive4,
              isActive6: paper.printMethod === 'indigo' ? true : paper.isActive6,
            },
          });
          reactivatedCount++;
        }
      }
    }

    return {
      productId,
      productName: product.productName,
      existingCount: existingPapers.length,
      addedCount,
      linkedCount,
      deactivatedCount,
      reactivatedCount,
      totalCount: existingPapers.length + addedCount,
      details,
    };
  }

  /**
   * 전체 상품의 용지를 마스터와 일괄 동기화
   */
  async syncAllProductPapers() {
    const products = await this.prisma.product.findMany({
      select: { id: true, productName: true },
    });

    const results = [];
    for (const product of products) {
      const result = await this.syncProductPapers(product.id);
      if (result.addedCount > 0 || result.linkedCount > 0) {
        results.push(result);
      }
    }

    return {
      totalProducts: products.length,
      syncedProducts: results.length,
      details: results,
    };
  }

  // ==================== 규격 정리 ====================

  /**
   * 상품의 outputPriceSettings(출력방식)에 맞는 규격만 남기고 나머지 삭제
   * - INDIGO 전용 상품 → forIndigo인 규격만 유지
   * - INKJET 전용 상품 → forInkjet/forAlbum/forFrame/forBooklet인 규격만 유지
   */
  async cleanupProductSpecifications(productId?: string) {
    const globalSpecs = await this.prisma.specification.findMany();

    const where = productId ? { id: productId } : {};
    const products = await this.prisma.product.findMany({
      where,
      include: { specifications: true },
    });

    const results: Array<{
      productId: string;
      productName: string;
      before: number;
      after: number;
      deleted: number;
      updatedIds: number;
    }> = [];

    for (const product of products) {
      if (!product.specifications.length) continue;

      const outputSettings = product.outputPriceSettings as any[];
      if (!outputSettings || !Array.isArray(outputSettings) || outputSettings.length === 0) continue;

      const hasIndigo = outputSettings.some((s: any) => s.outputMethod === 'INDIGO');
      const hasInkjet = outputSettings.some((s: any) => s.outputMethod === 'INKJET');

      // 출력방식이 혼합이면 건너뜀
      if ((hasIndigo && hasInkjet) || (!hasIndigo && !hasInkjet)) continue;

      const isRelevant = hasIndigo
        ? (gs: any) => gs.forIndigo === true
        : (gs: any) => gs.forInkjet === true || gs.forAlbum === true || gs.forFrame === true || gs.forBooklet === true;

      const specsToDelete: string[] = [];
      const specsToUpdateId: { id: string; specificationId: string }[] = [];

      for (const productSpec of product.specifications) {
        // 글로벌 규격 매칭
        let globalSpec = productSpec.specificationId
          ? globalSpecs.find(gs => gs.id === productSpec.specificationId)
          : null;

        if (!globalSpec) {
          // name + dimensions으로 매칭
          globalSpec = globalSpecs.find(gs =>
            gs.name === productSpec.name &&
            Math.abs(Number(gs.widthMm) - Number(productSpec.widthMm)) < 0.1 &&
            Math.abs(Number(gs.heightMm) - Number(productSpec.heightMm)) < 0.1
          ) || null;
        }

        if (!globalSpec) {
          specsToDelete.push(productSpec.id);
          continue;
        }

        // specificationId가 없으면 업데이트
        if (!productSpec.specificationId) {
          specsToUpdateId.push({ id: productSpec.id, specificationId: globalSpec.id });
        }

        // 출력방식에 맞지 않으면 삭제
        if (!isRelevant(globalSpec)) {
          specsToDelete.push(productSpec.id);
        }
      }

      // specificationId 업데이트
      for (const upd of specsToUpdateId) {
        await this.prisma.productSpecification.update({
          where: { id: upd.id },
          data: { specificationId: upd.specificationId },
        }).catch(() => { /* unique constraint 무시 */ });
      }

      // 불필요한 규격 삭제
      if (specsToDelete.length > 0) {
        await this.prisma.productSpecification.deleteMany({
          where: { id: { in: specsToDelete } },
        });
      }

      if (specsToDelete.length > 0 || specsToUpdateId.length > 0) {
        results.push({
          productId: product.id,
          productName: product.productName,
          before: product.specifications.length,
          after: product.specifications.length - specsToDelete.length,
          deleted: specsToDelete.length,
          updatedIds: specsToUpdateId.length,
        });
      }
    }

    return {
      totalProducts: products.length,
      cleanedProducts: results.length,
      details: results,
    };
  }
}
