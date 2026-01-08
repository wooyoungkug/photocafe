import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateProductionGroupDto,
  UpdateProductionGroupDto,
  ProductionGroupQueryDto,
  CreateProductionSettingDto,
  UpdateProductionSettingDto,
  ProductionSettingQueryDto,
  UpdateSpecificationsDto,
  UpdatePricesDto,
} from '../dto';

@Injectable()
export class ProductionGroupService {
  constructor(private prisma: PrismaService) { }

  // ==================== 생산그룹 ====================

  async findAllGroups(query: ProductionGroupQueryDto) {
    const { parentId, depth, isActive, search } = query;

    const where: any = {};

    if (parentId !== undefined) {
      where.parentId = parentId || null;
    }
    if (depth !== undefined) {
      where.depth = depth;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.productionGroup.findMany({
      where,
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { settings: true, children: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findGroupTree() {
    const allGroups = await this.prisma.productionGroup.findMany({
      where: { isActive: true },
      include: {
        settings: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: {
              select: { specifications: true, prices: true },
            },
          },
        },
        _count: {
          select: { settings: true, children: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // 트리 구조로 변환
    const rootGroups = allGroups.filter(g => !g.parentId);
    const childMap = new Map<string, typeof allGroups>();

    for (const group of allGroups) {
      if (group.parentId) {
        const siblings = childMap.get(group.parentId) || [];
        siblings.push(group);
        childMap.set(group.parentId, siblings);
      }
    }

    return rootGroups.map(parent => ({
      ...parent,
      children: childMap.get(parent.id) || [],
    }));
  }

  async findGroupById(id: string) {
    const group = await this.prisma.productionGroup.findUnique({
      where: { id },
      include: {
        parent: true,
        children: {
          orderBy: { sortOrder: 'asc' },
        },
        settings: {
          orderBy: { sortOrder: 'asc' },
          include: {
            specifications: {
              include: { specification: true },
            },
            _count: {
              select: { prices: true },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`생산그룹을 찾을 수 없습니다: ${id}`);
    }

    return group;
  }

  // 다음 코드 자동 생성
  private async generateNextCode(parentId?: string): Promise<string> {
    if (parentId) {
      // 소분류: 부모코드 + 2자리 순번 (예: 01 -> 0101, 0102, ...)
      const parent = await this.prisma.productionGroup.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException(`상위 그룹을 찾을 수 없습니다: ${parentId}`);
      }

      const siblings = await this.prisma.productionGroup.findMany({
        where: { parentId },
        orderBy: { code: 'desc' },
        take: 1,
      });

      if (siblings.length === 0) {
        return `${parent.code}01`;
      }

      const lastCode = siblings[0].code;
      const suffix = lastCode.substring(parent.code.length);
      const nextNum = parseInt(suffix, 10) + 1;
      return `${parent.code}${nextNum.toString().padStart(2, '0')}`;
    } else {
      // 대분류: 2자리 순번 (예: 01, 02, 03, ...)
      const roots = await this.prisma.productionGroup.findMany({
        where: { parentId: null },
        orderBy: { code: 'desc' },
        take: 1,
      });

      if (roots.length === 0) {
        return '01';
      }

      const lastCode = roots[0].code;
      const nextNum = parseInt(lastCode.substring(0, 2), 10) + 1;
      return nextNum.toString().padStart(2, '0');
    }
  }

  async createGroup(data: CreateProductionGroupDto) {
    // depth 계산
    let depth = 1;
    if (data.parentId) {
      const parent = await this.prisma.productionGroup.findUnique({
        where: { id: data.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`상위 그룹을 찾을 수 없습니다: ${data.parentId}`);
      }
      depth = parent.depth + 1;
    }

    // 코드 자동 생성 (입력된 코드가 없거나 빈 문자열인 경우)
    let code = data.code?.trim();
    if (!code) {
      code = await this.generateNextCode(data.parentId);
    } else {
      // 입력된 코드가 있으면 중복 확인
      const existing = await this.prisma.productionGroup.findUnique({
        where: { code },
      });
      if (existing) {
        throw new BadRequestException(`이미 사용 중인 코드입니다: ${code}`);
      }
    }

    // sortOrder 자동 할당
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const lastSibling = await this.prisma.productionGroup.findFirst({
        where: { parentId: data.parentId ?? null },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastSibling?.sortOrder ?? -1) + 1;
    }

    return this.prisma.productionGroup.create({
      data: {
        code,
        name: data.name,
        depth,
        parentId: data.parentId,
        sortOrder,
        isActive: data.isActive ?? true,
      },
      include: {
        parent: true,
      },
    });
  }

  async updateGroup(id: string, data: UpdateProductionGroupDto) {
    await this.findGroupById(id);

    // 코드 변경 시 중복 확인
    if (data.code) {
      const existing = await this.prisma.productionGroup.findFirst({
        where: { code: data.code, NOT: { id } },
      });
      if (existing) {
        throw new BadRequestException(`이미 사용 중인 코드입니다: ${data.code}`);
      }
    }

    // parentId 변경은 허용하지 않음
    const { parentId, ...updateData } = data;

    return this.prisma.productionGroup.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async deleteGroup(id: string) {
    const group = await this.findGroupById(id);

    // 하위 그룹이 있으면 삭제 불가
    if (group.children.length > 0) {
      throw new BadRequestException('하위 그룹이 있어 삭제할 수 없습니다.');
    }

    // 설정이 있으면 삭제 불가
    if (group.settings.length > 0) {
      throw new BadRequestException('생산설정이 있어 삭제할 수 없습니다.');
    }

    return this.prisma.productionGroup.delete({
      where: { id },
    });
  }

  async moveGroupUp(id: string) {
    const group = await this.findGroupById(id);

    const prevSibling = await this.prisma.productionGroup.findFirst({
      where: {
        parentId: group.parentId,
        sortOrder: { lt: group.sortOrder },
      },
      orderBy: { sortOrder: 'desc' },
    });

    if (!prevSibling) return group;

    await this.prisma.$transaction([
      this.prisma.productionGroup.update({
        where: { id: prevSibling.id },
        data: { sortOrder: group.sortOrder },
      }),
      this.prisma.productionGroup.update({
        where: { id },
        data: { sortOrder: prevSibling.sortOrder },
      }),
    ]);

    return this.findGroupById(id);
  }

  async moveGroupDown(id: string) {
    const group = await this.findGroupById(id);

    const nextSibling = await this.prisma.productionGroup.findFirst({
      where: {
        parentId: group.parentId,
        sortOrder: { gt: group.sortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!nextSibling) return group;

    await this.prisma.$transaction([
      this.prisma.productionGroup.update({
        where: { id: nextSibling.id },
        data: { sortOrder: group.sortOrder },
      }),
      this.prisma.productionGroup.update({
        where: { id },
        data: { sortOrder: nextSibling.sortOrder },
      }),
    ]);

    return this.findGroupById(id);
  }

  // ==================== 생산설정 ====================

  async findAllSettings(query: ProductionSettingQueryDto) {
    const { groupId, pricingType, isActive } = query;

    const where: any = {};

    if (groupId) {
      where.groupId = groupId;
    }
    if (pricingType) {
      where.pricingType = pricingType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    return this.prisma.productionSetting.findMany({
      where,
      include: {
        group: true,
        specifications: {
          include: { specification: true },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { prices: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findSettingById(id: string) {
    const setting = await this.prisma.productionSetting.findUnique({
      where: { id },
      include: {
        group: {
          include: { parent: true },
        },
        specifications: {
          include: { specification: true },
          orderBy: { sortOrder: 'asc' },
        },
        prices: {
          orderBy: [{ specificationId: 'asc' }, { minQuantity: 'asc' }],
        },
      },
    });

    if (!setting) {
      throw new NotFoundException(`생산설정을 찾을 수 없습니다: ${id}`);
    }

    return setting;
  }

  async createSetting(data: CreateProductionSettingDto) {
    // 그룹 확인
    const group = await this.prisma.productionGroup.findUnique({
      where: { id: data.groupId },
    });
    if (!group) {
      throw new NotFoundException(`생산그룹을 찾을 수 없습니다: ${data.groupId}`);
    }

    // sortOrder 자동 할당
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined || sortOrder === null) {
      const lastSetting = await this.prisma.productionSetting.findFirst({
        where: { groupId: data.groupId },
        orderBy: { sortOrder: 'desc' },
      });
      sortOrder = (lastSetting?.sortOrder ?? -1) + 1;
    }

    const { specificationIds, ...settingData } = data;

    // 생산설정 생성
    const setting = await this.prisma.productionSetting.create({
      data: {
        ...settingData,
        sortOrder,
        settingFee: data.settingFee ?? 0,
        basePrice: data.basePrice ?? 0,
        workDays: data.workDays ?? 0,
        isActive: data.isActive ?? true,
      },
    });

    // 규격 연결
    if (specificationIds && specificationIds.length > 0) {
      await this.prisma.productionSettingSpecification.createMany({
        data: specificationIds.map((specId, index) => ({
          productionSettingId: setting.id,
          specificationId: specId,
          sortOrder: index,
        })),
      });
    }

    return this.findSettingById(setting.id);
  }

  async updateSetting(id: string, data: UpdateProductionSettingDto) {
    await this.findSettingById(id);

    const { specificationIds, groupId, ...updateData } = data;

    // 설정 업데이트
    await this.prisma.productionSetting.update({
      where: { id },
      data: updateData,
    });

    // 규격 연결 업데이트
    if (specificationIds !== undefined) {
      // 기존 연결 삭제
      await this.prisma.productionSettingSpecification.deleteMany({
        where: { productionSettingId: id },
      });

      // 새 연결 생성
      if (specificationIds.length > 0) {
        await this.prisma.productionSettingSpecification.createMany({
          data: specificationIds.map((specId, index) => ({
            productionSettingId: id,
            specificationId: specId,
            sortOrder: index,
          })),
        });
      }
    }

    return this.findSettingById(id);
  }

  async deleteSetting(id: string) {
    await this.findSettingById(id);

    return this.prisma.productionSetting.delete({
      where: { id },
    });
  }

  async updateSettingSpecifications(id: string, data: UpdateSpecificationsDto) {
    await this.findSettingById(id);

    // 기존 연결 삭제
    await this.prisma.productionSettingSpecification.deleteMany({
      where: { productionSettingId: id },
    });

    // 새 연결 생성
    if (data.specificationIds.length > 0) {
      await this.prisma.productionSettingSpecification.createMany({
        data: data.specificationIds.map((specId, index) => ({
          productionSettingId: id,
          specificationId: specId,
          sortOrder: index,
        })),
      });
    }

    return this.findSettingById(id);
  }

  async updateSettingPrices(id: string, data: UpdatePricesDto) {
    await this.findSettingById(id);

    // 기존 가격 삭제
    await this.prisma.productionSettingPrice.deleteMany({
      where: { productionSettingId: id },
    });

    // 새 가격 생성
    if (data.prices.length > 0) {
      await this.prisma.productionSettingPrice.createMany({
        data: data.prices.map(price => ({
          productionSettingId: id,
          specificationId: price.specificationId,
          minQuantity: price.minQuantity,
          maxQuantity: price.maxQuantity,
          price: price.price,
        })),
      });
    }

    return this.findSettingById(id);
  }

  async moveSettingUp(id: string) {
    const setting = await this.findSettingById(id);

    const prevSibling = await this.prisma.productionSetting.findFirst({
      where: {
        groupId: setting.groupId,
        sortOrder: { lt: setting.sortOrder },
      },
      orderBy: { sortOrder: 'desc' },
    });

    if (!prevSibling) return setting;

    await this.prisma.$transaction([
      this.prisma.productionSetting.update({
        where: { id: prevSibling.id },
        data: { sortOrder: setting.sortOrder },
      }),
      this.prisma.productionSetting.update({
        where: { id },
        data: { sortOrder: prevSibling.sortOrder },
      }),
    ]);

    return this.findSettingById(id);
  }

  async moveSettingDown(id: string) {
    const setting = await this.findSettingById(id);

    const nextSibling = await this.prisma.productionSetting.findFirst({
      where: {
        groupId: setting.groupId,
        sortOrder: { gt: setting.sortOrder },
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (!nextSibling) return setting;

    await this.prisma.$transaction([
      this.prisma.productionSetting.update({
        where: { id: nextSibling.id },
        data: { sortOrder: setting.sortOrder },
      }),
      this.prisma.productionSetting.update({
        where: { id },
        data: { sortOrder: nextSibling.sortOrder },
      }),
    ]);

    return this.findSettingById(id);
  }
}
