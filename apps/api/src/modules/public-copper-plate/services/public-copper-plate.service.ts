import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePublicCopperPlateDto, UpdatePublicCopperPlateDto } from '../dto';

@Injectable()
export class PublicCopperPlateService {
  constructor(private prisma: PrismaService) { }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: string;
    plateType?: string;
  }) {
    const { skip = 0, take = 20, search, status, plateType } = params;

    const where: Prisma.PublicCopperPlateWhereInput = {
      ...(search && {
        OR: [
          { plateName: { contains: search } },
          { plateCode: { contains: search } },
        ],
      }),
      ...(status && { status }),
      ...(plateType && { plateType }),
    };

    const [data, total] = await Promise.all([
      this.prisma.publicCopperPlate.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.publicCopperPlate.count({ where }),
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
    const plate = await this.prisma.publicCopperPlate.findUnique({
      where: { id },
      include: {
        productPlates: {
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

    if (!plate) {
      throw new NotFoundException('공용동판을 찾을 수 없습니다');
    }

    return plate;
  }

  async create(dto: CreatePublicCopperPlateDto) {
    // 자동 코드 생성
    if (!dto.plateCode) {
      const lastPlate = await this.prisma.publicCopperPlate.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { plateCode: true },
      });

      let nextNum = 1;
      if (lastPlate?.plateCode) {
        const match = lastPlate.plateCode.match(/PCP(\d+)/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      dto.plateCode = `PCP${String(nextNum).padStart(4, '0')}`;
    }

    return this.prisma.publicCopperPlate.create({
      data: {
        plateName: dto.plateName,
        plateCode: dto.plateCode,
        plateType: dto.plateType,
        widthMm: dto.widthMm,
        heightMm: dto.heightMm,
        storageLocation: dto.storageLocation,
        imageUrl: dto.imageUrl,
        aiFileUrl: dto.aiFileUrl,
        designFileUrl: dto.designFileUrl,
        description: dto.description,
        defaultEngravingText: dto.defaultEngravingText,
        status: dto.status,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async update(id: string, dto: UpdatePublicCopperPlateDto) {
    await this.findOne(id);

    return this.prisma.publicCopperPlate.update({
      where: { id },
      data: {
        ...(dto.plateName !== undefined && { plateName: dto.plateName }),
        ...(dto.plateCode !== undefined && { plateCode: dto.plateCode }),
        ...(dto.plateType !== undefined && { plateType: dto.plateType }),
        ...(dto.widthMm !== undefined && { widthMm: dto.widthMm }),
        ...(dto.heightMm !== undefined && { heightMm: dto.heightMm }),
        ...(dto.storageLocation !== undefined && { storageLocation: dto.storageLocation }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.aiFileUrl !== undefined && { aiFileUrl: dto.aiFileUrl }),
        ...(dto.designFileUrl !== undefined && { designFileUrl: dto.designFileUrl }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.defaultEngravingText !== undefined && { defaultEngravingText: dto.defaultEngravingText }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.publicCopperPlate.delete({
      where: { id },
    });
  }

  // 상품에 공용동판 연결
  async linkToProduct(
    productId: string,
    publicCopperPlateId: string,
    data: { engravingText?: string },
  ) {
    return this.prisma.productPublicCopperPlate.upsert({
      where: {
        productId_publicCopperPlateId: { productId, publicCopperPlateId },
      },
      create: {
        productId,
        publicCopperPlateId,
        ...data,
      },
      update: data,
    });
  }

  // 상품에서 공용동판 연결 해제
  async unlinkFromProduct(productId: string, publicCopperPlateId: string) {
    return this.prisma.productPublicCopperPlate.delete({
      where: {
        productId_publicCopperPlateId: { productId, publicCopperPlateId },
      },
    });
  }

  // 상품의 공용동판 목록 조회
  async getProductPlates(productId: string) {
    return this.prisma.productPublicCopperPlate.findMany({
      where: { productId },
      include: {
        publicCopperPlate: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
