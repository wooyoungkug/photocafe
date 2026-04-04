import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  QuotationQueryDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuotationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 견적번호 생성: QT-YYYYMMDD-NNN
   */
  private async generateQuotationNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `QT-${dateStr}-`;

    const lastQuotation = await this.prisma.quotation.findFirst({
      where: { quotationNumber: { startsWith: prefix } },
      orderBy: { quotationNumber: 'desc' },
    });

    let seq = 1;
    if (lastQuotation) {
      const lastSeq = parseInt(lastQuotation.quotationNumber.slice(-3), 10);
      seq = lastSeq + 1;
    }

    return `${prefix}${seq.toString().padStart(3, '0')}`;
  }

  async create(dto: CreateQuotationDto) {
    const quotationNumber = await this.generateQuotationNumber();

    // 항목 금액 계산
    const items = (dto.items || []).map((item, idx) => ({
      ...item,
      totalPrice: item.unitPrice * item.quantity,
      sortOrder: item.sortOrder ?? idx,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = Math.round(totalAmount * 0.1);
    const finalAmount = totalAmount + tax;

    return this.prisma.quotation.create({
      data: {
        quotationNumber,
        title: dto.title,
        quotationType: dto.quotationType,
        subType: dto.subType,
        clientId: dto.clientId,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientEmail: dto.clientEmail,
        staffId: dto.staffId,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        memo: dto.memo,
        totalAmount,
        tax,
        finalAmount,
        items: {
          create: items.map((item) => ({
            itemName: item.itemName,
            specification: item.specification,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            albumType: item.albumType,
            compressedType: item.compressedType,
            coverType: item.coverType,
            coverMaterial: item.coverMaterial,
            coverPrice: item.coverPrice,
            printMethod: item.printMethod,
            pages: item.pages,
            printPrice: item.printPrice,
            innerPageThickness: item.innerPageThickness,
            bindingType: item.bindingType,
            bindingPrice: item.bindingPrice,
            paperType: item.paperType,
            colorType: item.colorType,
            finishing: item.finishing,
            memo: item.memo,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: { items: true, client: true, staff: true },
    });
  }

  async findAll(query: QuotationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QuotationWhereInput = {};

    if (query.search) {
      where.OR = [
        { quotationNumber: { contains: query.search, mode: 'insensitive' } },
        { title: { contains: query.search, mode: 'insensitive' } },
        { clientName: { contains: query.search, mode: 'insensitive' } },
        { client: { clientName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.quotationType) {
      where.quotationType = query.quotationType;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.staffId) {
      where.staffId = query.staffId;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, clientName: true, clientCode: true } },
          staff: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        client: { select: { id: true, clientName: true, clientCode: true, phone: true, email: true } },
        staff: { select: { id: true, name: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException('견적을 찾을 수 없습니다.');
    }

    return quotation;
  }

  async update(id: string, dto: UpdateQuotationDto) {
    await this.findOne(id);

    const updateData: any = { ...dto };
    delete updateData.items;

    if (dto.validUntil) {
      updateData.validUntil = new Date(dto.validUntil);
    }

    // 항목이 있으면 교체
    if (dto.items) {
      const items = dto.items.map((item, idx) => ({
        ...item,
        totalPrice: item.unitPrice * item.quantity,
        sortOrder: item.sortOrder ?? idx,
      }));

      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const tax = Math.round(totalAmount * 0.1);
      const finalAmount = totalAmount + tax;

      updateData.totalAmount = totalAmount;
      updateData.tax = tax;
      updateData.finalAmount = finalAmount;

      // 기존 항목 삭제 후 재생성
      await this.prisma.quotationItem.deleteMany({ where: { quotationId: id } });

      return this.prisma.quotation.update({
        where: { id },
        data: {
          ...updateData,
          items: {
            create: items.map((item) => ({
              itemName: item.itemName,
              specification: item.specification,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              albumType: item.albumType,
              compressedType: item.compressedType,
              coverType: item.coverType,
              coverMaterial: item.coverMaterial,
              coverPrice: item.coverPrice,
              printMethod: item.printMethod,
              pages: item.pages,
              printPrice: item.printPrice,
              innerPageThickness: item.innerPageThickness,
              bindingType: item.bindingType,
              bindingPrice: item.bindingPrice,
              paperType: item.paperType,
              colorType: item.colorType,
              finishing: item.finishing,
              memo: item.memo,
              sortOrder: item.sortOrder,
            })),
          },
        },
        include: { items: true, client: true, staff: true },
      });
    }

    return this.prisma.quotation.update({
      where: { id },
      data: updateData,
      include: { items: true, client: true, staff: true },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.quotation.update({
      where: { id },
      data: { status },
      include: { items: true, client: true, staff: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.quotation.delete({ where: { id } });
  }

  async getStats() {
    const [total, byStatus, byType] = await Promise.all([
      this.prisma.quotation.count(),
      this.prisma.quotation.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.quotation.groupBy({
        by: ['quotationType'],
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        acc[item.quotationType] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
