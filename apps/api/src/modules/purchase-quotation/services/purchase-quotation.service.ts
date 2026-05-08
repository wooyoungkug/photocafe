import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  CreatePurchaseQuotationDto,
  UpdatePurchaseQuotationDto,
  PurchaseQuotationQueryDto,
} from '../dto';

@Injectable()
export class PurchaseQuotationService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PurchaseQuotationQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseQuotationWhereInput = {};

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { vendorName: { contains: term, mode: 'insensitive' } },
        { manager: { contains: term, mode: 'insensitive' } },
        { department: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.receivedAt = {};
      if (query.startDate) {
        (where.receivedAt as Prisma.DateTimeFilter).gte = new Date(
          query.startDate,
        );
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        (where.receivedAt as Prisma.DateTimeFilter).lte = end;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseQuotation.findMany({
        where,
        orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          staff: { select: { id: true, name: true, staffId: true } },
        },
      }),
      this.prisma.purchaseQuotation.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.purchaseQuotation.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true, staffId: true } },
      },
    });
    if (!item) {
      throw new NotFoundException('매입처 견적을 찾을 수 없습니다.');
    }
    return item;
  }

  async create(dto: CreatePurchaseQuotationDto, staffId?: string) {
    return this.prisma.purchaseQuotation.create({
      data: {
        vendorName: dto.vendorName,
        receivedAt: new Date(dto.receivedAt),
        manager: dto.manager,
        department: dto.department,
        title: dto.title,
        note: dto.note,
        files: (dto.files ?? []) as unknown as Prisma.InputJsonValue,
        staffId: staffId ?? null,
      },
      include: {
        staff: { select: { id: true, name: true, staffId: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePurchaseQuotationDto) {
    await this.findOne(id);

    const data: Prisma.PurchaseQuotationUpdateInput = {};
    if (dto.vendorName !== undefined) data.vendorName = dto.vendorName;
    if (dto.receivedAt !== undefined) data.receivedAt = new Date(dto.receivedAt);
    if (dto.manager !== undefined) data.manager = dto.manager;
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.files !== undefined)
      data.files = dto.files as unknown as Prisma.InputJsonValue;

    return this.prisma.purchaseQuotation.update({
      where: { id },
      data,
      include: {
        staff: { select: { id: true, name: true, staffId: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.purchaseQuotation.delete({ where: { id } });
    return { success: true };
  }
}
