import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateFabricDto,
  UpdateFabricDto,
  CreateFabricSupplierDto,
  UpdateFabricSupplierDto,
} from '../dto/fabric.dto';

@Injectable()
export class FabricService {
  constructor(private prisma: PrismaService) {}

  // ==================== 원단 공급업체 ====================

  // 공급업체 목록 조회
  async findAllSuppliers(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.fabricSupplier.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  // 공급업체 상세 조회
  async findSupplier(id: string) {
    const supplier = await this.prisma.fabricSupplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { fabrics: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('공급업체를 찾을 수 없습니다.');
    }

    return supplier;
  }

  // 공급업체 등록
  async createSupplier(dto: CreateFabricSupplierDto) {
    // 코드 중복 체크
    const existing = await this.prisma.fabricSupplier.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 공급업체 코드입니다.');
    }

    return this.prisma.fabricSupplier.create({
      data: dto,
    });
  }

  // 공급업체 수정
  async updateSupplier(id: string, dto: UpdateFabricSupplierDto) {
    await this.findSupplier(id);

    // 코드 중복 체크 (자기 자신 제외)
    if (dto.code) {
      const existing = await this.prisma.fabricSupplier.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 공급업체 코드입니다.');
      }
    }

    return this.prisma.fabricSupplier.update({
      where: { id },
      data: dto,
    });
  }

  // 공급업체 삭제
  async deleteSupplier(id: string) {
    const supplier = await this.findSupplier(id);

    if (supplier._count.fabrics > 0) {
      throw new ConflictException('해당 공급업체에 연결된 원단이 있어 삭제할 수 없습니다.');
    }

    return this.prisma.fabricSupplier.delete({
      where: { id },
    });
  }

  // ==================== 원단 ====================

  // 원단 목록 조회
  async findAll(params: {
    search?: string;
    category?: string;
    material?: string;
    supplierId?: string;
    includeInactive?: boolean;
    forAlbumCover?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      category,
      material,
      supplierId,
      includeInactive = false,
      forAlbumCover,
      page = 1,
      limit = 20,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { colorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (material) {
      where.material = material;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (forAlbumCover) {
      where.forAlbumCover = true;
    }

    const [data, total] = await Promise.all([
      this.prisma.fabric.findMany({
        where,
        include: {
          supplier: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      this.prisma.fabric.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 원단 상세 조회
  async findOne(id: string) {
    const fabric = await this.prisma.fabric.findUnique({
      where: { id },
      include: {
        supplier: true,
      },
    });

    if (!fabric) {
      throw new NotFoundException('원단을 찾을 수 없습니다.');
    }

    return fabric;
  }

  // 원단 등록
  async create(dto: CreateFabricDto) {
    // 코드 중복 체크
    const existing = await this.prisma.fabric.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 원단 코드입니다.');
    }

    return this.prisma.fabric.create({
      data: {
        code: dto.code,
        name: dto.name,
        category: dto.category || 'fabric',
        material: dto.material || 'cotton',
        colorCode: dto.colorCode,
        colorName: dto.colorName,
        widthCm: dto.widthCm,
        thickness: dto.thickness,
        weight: dto.weight,
        supplierId: dto.supplierId,
        basePrice: dto.basePrice || 0,
        unitType: dto.unitType || 'm',
        discountRate: dto.discountRate || 0,
        discountPrice: dto.discountPrice,
        stockQuantity: dto.stockQuantity || 0,
        minStockLevel: dto.minStockLevel || 0,
        forAlbumCover: dto.forAlbumCover || false,
        forBoxCover: dto.forBoxCover || false,
        forFrameCover: dto.forFrameCover || false,
        forOther: dto.forOther || false,
        imageUrl: dto.imageUrl,
        thumbnailUrl: dto.thumbnailUrl,
        description: dto.description,
        memo: dto.memo,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  // 원단 수정
  async update(id: string, dto: UpdateFabricDto) {
    await this.findOne(id);

    // 코드 중복 체크 (자기 자신 제외)
    if (dto.code) {
      const existing = await this.prisma.fabric.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 원단 코드입니다.');
      }
    }

    return this.prisma.fabric.update({
      where: { id },
      data: dto,
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  // 원단 삭제
  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.fabric.delete({ where: { id } });
  }

  // 재고 업데이트
  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set') {
    const fabric = await this.findOne(id);

    let newQuantity: number;
    switch (operation) {
      case 'add':
        newQuantity = fabric.stockQuantity + quantity;
        break;
      case 'subtract':
        newQuantity = Math.max(0, fabric.stockQuantity - quantity);
        break;
      case 'set':
        newQuantity = quantity;
        break;
    }

    return this.prisma.fabric.update({
      where: { id },
      data: { stockQuantity: newQuantity },
    });
  }

  // 재고 부족 원단 조회
  async findLowStock() {
    return this.prisma.fabric.findMany({
      where: {
        isActive: true,
        stockQuantity: {
          lte: this.prisma.fabric.fields.minStockLevel,
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { stockQuantity: 'asc' },
    });
  }

  // 순서 변경
  async reorder(id: string, direction: 'up' | 'down') {
    const fabric = await this.findOne(id);
    const category = fabric.category;

    // 같은 카테고리의 원단 목록 조회
    const fabrics = await this.prisma.fabric.findMany({
      where: { category },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const currentIndex = fabrics.findIndex((f) => f.id === id);
    if (currentIndex === -1) return fabric;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= fabrics.length) return fabric;

    // 순서 교환
    const currentFabric = fabrics[currentIndex];
    const targetFabric = fabrics[targetIndex];

    await this.prisma.$transaction([
      this.prisma.fabric.update({
        where: { id: currentFabric.id },
        data: { sortOrder: targetFabric.sortOrder },
      }),
      this.prisma.fabric.update({
        where: { id: targetFabric.id },
        data: { sortOrder: currentFabric.sortOrder },
      }),
    ]);

    return this.findOne(id);
  }
}
