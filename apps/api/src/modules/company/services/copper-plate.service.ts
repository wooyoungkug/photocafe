import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateCopperPlateDto,
  UpdateCopperPlateDto,
  RecordCopperPlateUsageDto,
  ChangeCopperPlateLocationDto,
  ChangeCopperPlateStatusDto,
  CopperPlateActionType,
} from '../dto/copper-plate.dto';

@Injectable()
export class CopperPlateService {
  constructor(private prisma: PrismaService) {}

  // 회원별 동판 목록 조회
  async findByClientId(clientId: string) {
    return this.prisma.copperPlate.findMany({
      where: { clientId },
      include: {
        histories: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // 동판 상세 조회
  async findOne(id: string) {
    const copperPlate = await this.prisma.copperPlate.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            clientName: true,
          },
        },
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!copperPlate) {
      throw new NotFoundException('동판을 찾을 수 없습니다.');
    }

    return copperPlate;
  }

  // 동판 등록
  async create(dto: CreateCopperPlateDto) {
    const copperPlate = await this.prisma.copperPlate.create({
      data: {
        clientId: dto.clientId,
        plateName: dto.plateName,
        plateCode: dto.plateCode,
        foilColor: dto.foilColor,
        foilColorName: dto.foilColorName,
        widthMm: dto.widthMm,
        heightMm: dto.heightMm,
        storageLocation: dto.storageLocation,
        imageUrl: dto.imageUrl,
        designFileUrl: dto.designFileUrl,
        notes: dto.notes,
        registeredById: dto.registeredById,
        registeredBy: dto.registeredBy,
        status: 'stored',
      },
    });

    // 등록 이력 추가
    await this.prisma.copperPlateHistory.create({
      data: {
        copperPlateId: copperPlate.id,
        actionType: CopperPlateActionType.REGISTERED,
        newStatus: 'stored',
        newLocation: dto.storageLocation,
        description: `동판 "${dto.plateName}" 등록`,
        actionById: dto.registeredById,
        actionBy: dto.registeredBy,
      },
    });

    return copperPlate;
  }

  // 동판 수정
  async update(id: string, dto: UpdateCopperPlateDto) {
    const existing = await this.findOne(id);

    const copperPlate = await this.prisma.copperPlate.update({
      where: { id },
      data: {
        ...(dto.plateName && { plateName: dto.plateName }),
        ...(dto.plateCode !== undefined && { plateCode: dto.plateCode }),
        ...(dto.foilColor && { foilColor: dto.foilColor }),
        ...(dto.foilColorName !== undefined && { foilColorName: dto.foilColorName }),
        ...(dto.widthMm !== undefined && { widthMm: dto.widthMm }),
        ...(dto.heightMm !== undefined && { heightMm: dto.heightMm }),
        ...(dto.storageLocation !== undefined && { storageLocation: dto.storageLocation }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.designFileUrl !== undefined && { designFileUrl: dto.designFileUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status }),
        ...(dto.firstUsedAt && { firstUsedAt: new Date(dto.firstUsedAt) }),
        ...(dto.returnedAt && { returnedAt: new Date(dto.returnedAt) }),
      },
    });

    return copperPlate;
  }

  // 동판 삭제
  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.copperPlate.delete({ where: { id } });
  }

  // 사용 기록 추가
  async recordUsage(id: string, dto: RecordCopperPlateUsageDto) {
    const copperPlate = await this.findOne(id);

    // 사용 횟수 증가 및 마지막 사용일 업데이트
    const updateData: any = {
      usageCount: { increment: 1 },
      lastUsedAt: new Date(),
    };

    // 최초 사용일이 없으면 설정
    if (!copperPlate.firstUsedAt) {
      updateData.firstUsedAt = new Date();
    }

    await this.prisma.copperPlate.update({
      where: { id },
      data: updateData,
    });

    // 사용 이력 추가
    return this.prisma.copperPlateHistory.create({
      data: {
        copperPlateId: id,
        actionType: CopperPlateActionType.USED,
        orderId: dto.orderId,
        orderNumber: dto.orderNumber,
        description: dto.description || '동판 사용',
        actionById: dto.actionById,
        actionBy: dto.actionBy,
      },
    });
  }

  // 위치 변경
  async changeLocation(id: string, dto: ChangeCopperPlateLocationDto) {
    const copperPlate = await this.findOne(id);
    const previousLocation = copperPlate.storageLocation;

    await this.prisma.copperPlate.update({
      where: { id },
      data: { storageLocation: dto.newLocation },
    });

    // 위치 변경 이력 추가
    return this.prisma.copperPlateHistory.create({
      data: {
        copperPlateId: id,
        actionType: CopperPlateActionType.LOCATION_CHANGED,
        previousLocation,
        newLocation: dto.newLocation,
        description: `위치 변경: ${previousLocation || '미지정'} → ${dto.newLocation}`,
        actionById: dto.actionById,
        actionBy: dto.actionBy,
      },
    });
  }

  // 상태 변경
  async changeStatus(id: string, dto: ChangeCopperPlateStatusDto) {
    const copperPlate = await this.findOne(id);
    const previousStatus = copperPlate.status;

    const updateData: any = { status: dto.newStatus };

    // 반환 상태로 변경 시 반환일 설정
    if (dto.newStatus === 'returned' && !copperPlate.returnedAt) {
      updateData.returnedAt = new Date();
    }

    await this.prisma.copperPlate.update({
      where: { id },
      data: updateData,
    });

    // 상태 변경 이력 추가
    return this.prisma.copperPlateHistory.create({
      data: {
        copperPlateId: id,
        actionType: CopperPlateActionType.STATUS_CHANGED,
        previousStatus,
        newStatus: dto.newStatus,
        description: dto.description || `상태 변경: ${previousStatus} → ${dto.newStatus}`,
        actionById: dto.actionById,
        actionBy: dto.actionBy,
      },
    });
  }

  // 이력 조회
  async getHistories(id: string, limit?: number) {
    return this.prisma.copperPlateHistory.findMany({
      where: { copperPlateId: id },
      orderBy: { createdAt: 'desc' },
      ...(limit && { take: limit }),
    });
  }

  // 순서 변경 (위로/아래로)
  async reorder(id: string, direction: 'up' | 'down') {
    const copperPlate = await this.findOne(id);
    const clientId = copperPlate.clientId;

    // 같은 회원의 동판 목록 조회
    const plates = await this.prisma.copperPlate.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const currentIndex = plates.findIndex((p: { id: string }) => p.id === id);
    if (currentIndex === -1) return copperPlate;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= plates.length) return copperPlate;

    // 순서 교환
    const currentPlate = plates[currentIndex];
    const targetPlate = plates[targetIndex];

    await this.prisma.$transaction([
      this.prisma.copperPlate.update({
        where: { id: currentPlate.id },
        data: { sortOrder: targetPlate.sortOrder },
      }),
      this.prisma.copperPlate.update({
        where: { id: targetPlate.id },
        data: { sortOrder: currentPlate.sortOrder },
      }),
    ]);

    return this.findOne(id);
  }

  // 전체 동판 검색 (관리자용)
  async search(params: {
    search?: string;
    status?: string;
    foilColor?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, foilColor, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { plateName: { contains: search, mode: 'insensitive' } },
        { plateCode: { contains: search, mode: 'insensitive' } },
        { storageLocation: { contains: search, mode: 'insensitive' } },
        { client: { clientName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (foilColor) {
      where.foilColor = foilColor;
    }

    const [data, total] = await Promise.all([
      this.prisma.copperPlate.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              clientCode: true,
              clientName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.copperPlate.count({ where }),
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
}
