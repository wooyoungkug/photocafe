import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreatePaperDto, UpdatePaperDto, PaperQueryDto } from '../dto';

@Injectable()
export class PaperService {
  constructor(private prisma: PrismaService) { }

  // Decimal을 number로 변환하는 헬퍼 함수
  private convertDecimalToNumber<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
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

  async findAll(query: PaperQueryDto) {
    const { page = 1, limit = 20, search, paperType, printMethods, manufacturerId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PaperWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(paperType && { paperType }),
      ...(printMethods && { printMethods: { hasSome: printMethods.split(',') } }),
      ...(manufacturerId && { manufacturerId }),
      ...(isActive !== undefined && { isActive }),
    };

    const [data, total] = await Promise.all([
      this.prisma.paper.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ name: 'asc' }, { grammage: 'asc' }],
        include: {
          manufacturer: {
            select: { id: true, name: true, code: true },
          },
          supplier: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.paper.count({ where }),
    ]);

    return {
      data: this.convertDecimalToNumber(data),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const paper = await this.prisma.paper.findUnique({
      where: { id },
      include: {
        manufacturer: true,
        supplier: true,
        prices: true,
      },
    });

    if (!paper) {
      throw new NotFoundException('용지를 찾을 수 없습니다');
    }

    return this.convertDecimalToNumber(paper);
  }

  async create(dto: CreatePaperDto) {
    // 코드 자동 생성
    const code = dto.code || `PAPER${Date.now().toString(36).toUpperCase()}`;

    // 코드 중복 검사
    const existing = await this.prisma.paper.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 용지 코드입니다');
    }

    const paper = await this.prisma.paper.create({
      data: {
        code,
        name: dto.name,
        manufacturerId: dto.manufacturerId,
        supplierId: dto.supplierId,
        paperType: dto.paperType,
        sheetSize: dto.sheetSize,
        sheetWidthMm: dto.sheetWidthMm,
        sheetHeightMm: dto.sheetHeightMm,
        customSheetName: dto.customSheetName,
        rollWidth: dto.rollWidth,
        rollWidthInch: dto.rollWidthInch,
        rollLength: dto.rollLength,
        rollLengthM: dto.rollLengthM,
        grammage: dto.grammage,
        grammageDisplay: dto.grammageDisplay || (dto.grammage ? `${dto.grammage}g/m²` : null),
        finish: dto.finish,
        finishDisplay: dto.finishDisplay,
        printMethods: dto.printMethods || [],
        colorType: dto.colorType,
        thickness: dto.thickness,
        basePrice: dto.basePrice || 0,
        unitType: dto.unitType || 'sheet',
        discountRate: dto.discountRate || 0,
        discountPrice: dto.discountPrice,
        stockQuantity: dto.stockQuantity || 0,
        minStockLevel: dto.minStockLevel || 0,
        description: dto.description,
        memo: dto.memo,
        sortOrder: dto.sortOrder || 0,
        isActive: dto.isActive ?? true,
      },
      include: {
        manufacturer: true,
        supplier: true,
      },
    });

    return this.convertDecimalToNumber(paper);
  }

  async update(id: string, dto: UpdatePaperDto) {
    const paper = await this.prisma.paper.findUnique({
      where: { id },
    });

    if (!paper) {
      throw new NotFoundException('용지를 찾을 수 없습니다');
    }

    // 코드 변경 시 중복 검사
    if (dto.code && dto.code !== paper.code) {
      const existing = await this.prisma.paper.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 용지 코드입니다');
      }
    }

    // grammageDisplay 자동 생성
    if (dto.grammage !== undefined && !dto.grammageDisplay) {
      dto.grammageDisplay = `${dto.grammage}g/m²`;
    }

    const updated = await this.prisma.paper.update({
      where: { id },
      data: dto,
      include: {
        manufacturer: true,
      },
    });

    return this.convertDecimalToNumber(updated);
  }

  async remove(id: string) {
    const paper = await this.prisma.paper.findUnique({
      where: { id },
    });

    if (!paper) {
      throw new NotFoundException('용지를 찾을 수 없습니다');
    }

    return this.prisma.paper.delete({
      where: { id },
    });
  }

  // 용지 타입별 목록 조회
  async findByType(paperType: 'roll' | 'sheet') {
    const papers = await this.prisma.paper.findMany({
      where: {
        paperType,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        manufacturer: {
          select: { id: true, name: true },
        },
      },
    });

    return this.convertDecimalToNumber(papers);
  }

  // 출력 방식별 목록 조회
  async findByPrintMethod(printMethod: string) {
    const papers = await this.prisma.paper.findMany({
      where: {
        printMethods: { has: printMethod },
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        manufacturer: {
          select: { id: true, name: true },
        },
        supplier: {
          select: { id: true, name: true },
        },
      },
    });

    return this.convertDecimalToNumber(papers);
  }
}
