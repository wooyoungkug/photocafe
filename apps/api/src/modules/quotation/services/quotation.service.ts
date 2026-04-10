import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { SmsService } from '../../../common/sms/sms.service';
import { KakaoAlimtalkService } from '../../../common/kakao-alimtalk/kakao-alimtalk.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  QuotationQueryDto,
  SendQuotationDto,
  PriceLookupDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuotationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly kakaoService: KakaoAlimtalkService,
  ) {}

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

  private mapItemFields(item: any) {
    return {
      itemName: item.itemName,
      specification: item.specification,
      categoryId: item.categoryId,
      specificationId: item.specificationId,
      printSide: item.printSide,
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
    };
  }

  async create(dto: CreateQuotationDto) {
    const quotationNumber = await this.generateQuotationNumber();

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
          create: items.map((item) => this.mapItemFields(item)),
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

    if (query.status) where.status = query.status;
    if (query.quotationType) where.quotationType = query.quotationType;
    if (query.clientId) where.clientId = query.clientId;
    if (query.staffId) where.staffId = query.staffId;

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
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { sortOrder: 'asc' } },
        client: {
          select: {
            id: true, clientName: true, clientCode: true,
            phone: true, mobile: true, email: true,
            groupId: true,
            group: { select: { id: true, groupName: true, groupCode: true } },
          },
        },
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

      await this.prisma.quotationItem.deleteMany({ where: { quotationId: id } });

      return this.prisma.quotation.update({
        where: { id },
        data: {
          ...updateData,
          items: {
            create: items.map((item) => this.mapItemFields(item)),
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
      this.prisma.quotation.groupBy({ by: ['status'], _count: true }),
      this.prisma.quotation.groupBy({ by: ['quotationType'], _count: true }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc: Record<string, number>, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      byType: byType.reduce((acc: Record<string, number>, item) => {
        acc[item.quotationType] = item._count;
        return acc;
      }, {}),
    };
  }

  // ==================== 견적 발송 ====================

  async send(id: string, dto: SendQuotationDto) {
    const quotation = await this.findOne(id);

    const recipientPhone = dto.recipientPhone || quotation.client?.mobile || quotation.client?.phone || quotation.clientPhone;
    const recipientEmail = dto.recipientEmail || quotation.client?.email || quotation.clientEmail;
    const customerName = quotation.client?.clientName || quotation.clientName || '고객';

    const totalAmount = Number(quotation.totalAmount);
    const tax = Number(quotation.tax);
    const finalAmount = Number(quotation.finalAmount);

    const itemsSummary = (quotation.items || [])
      .map((item) => `- ${item.itemName} (${item.specification || '-'}) x${item.quantity} = ${Number(item.totalPrice).toLocaleString('ko-KR')}원`)
      .join('\n');

    switch (dto.method) {
      case 'email': {
        if (!recipientEmail) throw new BadRequestException('수신 이메일이 없습니다.');

        const html = this.buildQuotationHtml(quotation, customerName, totalAmount, tax, finalAmount, dto.message);

        await this.emailService.sendEmail({
          to: recipientEmail,
          subject: `[견적서] ${quotation.title} (${quotation.quotationNumber})`,
          html,
        });
        break;
      }

      case 'sms': {
        if (!recipientPhone) throw new BadRequestException('수신 전화번호가 없습니다.');

        const smsText = [
          `[Printing114 견적서]`,
          `견적번호: ${quotation.quotationNumber}`,
          `제목: ${quotation.title}`,
          `총 금액: ${finalAmount.toLocaleString('ko-KR')}원`,
          dto.message ? `\n${dto.message}` : '',
        ].filter(Boolean).join('\n');

        await this.smsService.sendSms(recipientPhone.replace(/-/g, ''), smsText);
        break;
      }

      case 'kakao': {
        if (!recipientPhone) throw new BadRequestException('수신 전화번호가 없습니다.');

        const kakaoMsg = [
          `[Printing114 견적서]`,
          ``,
          `견적번호: ${quotation.quotationNumber}`,
          `제목: ${quotation.title}`,
          `고객: ${customerName}`,
          ``,
          itemsSummary,
          ``,
          `공급가액: ${totalAmount.toLocaleString('ko-KR')}원`,
          `부가세: ${tax.toLocaleString('ko-KR')}원`,
          `총 견적금액: ${finalAmount.toLocaleString('ko-KR')}원`,
          dto.message ? `\n${dto.message}` : '',
        ].filter(Boolean).join('\n');

        // 카카오 알림톡 → SMS → 이메일 fallback
        await this.kakaoService.send({
          templateCode: 'QUOTATION_SEND',
          recipients: [{
            phone: recipientPhone.replace(/-/g, ''),
            email: recipientEmail || undefined,
            name: customerName,
          }],
          variables: { '#{내용}': kakaoMsg },
          emailFallback: recipientEmail ? {
            subject: `[견적서] ${quotation.title} (${quotation.quotationNumber})`,
            html: this.buildQuotationHtml(quotation, customerName, totalAmount, tax, finalAmount, dto.message),
          } : undefined,
        });
        break;
      }

      default:
        throw new BadRequestException(`지원하지 않는 발송 방법: ${dto.method}`);
    }

    // 상태 업데이트
    return this.prisma.quotation.update({
      where: { id },
      data: {
        status: quotation.status === 'draft' ? 'sent' : quotation.status,
        sentAt: new Date(),
        sentMethod: dto.method,
      },
      include: { items: true, client: true, staff: true },
    });
  }

  private buildQuotationHtml(
    quotation: any, customerName: string,
    totalAmount: number, tax: number, finalAmount: number,
    additionalMessage?: string,
  ): string {
    const itemsRows = (quotation.items || []).map((item: any, idx: number) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${idx + 1}</td>
        <td style="padding:8px;border:1px solid #ddd">${item.itemName}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.specification || '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.printSide === 'double' ? '양면' : item.printSide === 'single' ? '단면' : '-'}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(item.unitPrice).toLocaleString('ko-KR')}원</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">${Number(item.totalPrice).toLocaleString('ko-KR')}원</td>
      </tr>
    `).join('');

    return `
      <div style="max-width:700px;margin:0 auto;font-family:'Malgun Gothic','맑은 고딕',sans-serif">
        <h2 style="color:#333;border-bottom:2px solid #e91e63;padding-bottom:10px">견적서</h2>
        <table style="width:100%;margin-bottom:20px">
          <tr><td style="padding:4px 0"><strong>견적번호:</strong> ${quotation.quotationNumber}</td></tr>
          <tr><td style="padding:4px 0"><strong>제목:</strong> ${quotation.title}</td></tr>
          <tr><td style="padding:4px 0"><strong>고객:</strong> ${customerName}</td></tr>
          ${quotation.validUntil ? `<tr><td style="padding:4px 0"><strong>유효기한:</strong> ${new Date(quotation.validUntil).toLocaleDateString('ko-KR')}</td></tr>` : ''}
        </table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;border:1px solid #ddd">#</th>
              <th style="padding:8px;border:1px solid #ddd">품목명</th>
              <th style="padding:8px;border:1px solid #ddd">규격</th>
              <th style="padding:8px;border:1px solid #ddd">양면/단면</th>
              <th style="padding:8px;border:1px solid #ddd">수량</th>
              <th style="padding:8px;border:1px solid #ddd">단가</th>
              <th style="padding:8px;border:1px solid #ddd">소계</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
        <div style="text-align:right;margin-bottom:20px">
          <p>공급가액: <strong>${totalAmount.toLocaleString('ko-KR')}원</strong></p>
          <p>부가세(10%): <strong>${tax.toLocaleString('ko-KR')}원</strong></p>
          <p style="font-size:18px;color:#e91e63">총 견적금액: <strong>${finalAmount.toLocaleString('ko-KR')}원</strong></p>
        </div>
        ${additionalMessage ? `<div style="background:#f9f9f9;padding:15px;border-radius:4px;margin-bottom:20px"><p style="margin:0">${additionalMessage}</p></div>` : ''}
        ${quotation.memo ? `<div style="background:#fff3e0;padding:15px;border-radius:4px"><p style="margin:0"><strong>메모:</strong> ${quotation.memo}</p></div>` : ''}
        <hr style="margin-top:30px;border:none;border-top:1px solid #ddd">
        <p style="color:#999;font-size:12px">Printing114 - 포토북/앨범 인쇄 전문</p>
      </div>
    `;
  }

  // ==================== 단가 조회 ====================

  async priceLookup(dto: PriceLookupDto) {
    if (!dto.specificationId) {
      return { unitPrice: 0, priceSource: 'none' };
    }

    // 규격 정보
    const spec = await this.prisma.specification.findUnique({
      where: { id: dto.specificationId },
    });
    if (!spec) return { unitPrice: 0, priceSource: 'none' };

    // 표준 단가 조회
    const standardPrice = await this.prisma.productionSettingPrice.findFirst({
      where: { specificationId: dto.specificationId },
      orderBy: { minQuantity: 'asc' },
    });

    let unitPrice = standardPrice ? Number(standardPrice.fourColorDoublePrice || standardPrice.doubleSidedPrice || 0) : 0;
    let priceSource = 'standard';

    // 그룹 ID 결정: 거래처의 그룹 또는 직접 지정된 그룹
    let effectiveGroupId = dto.groupId || null;

    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: dto.clientId },
        select: { groupId: true, group: { select: { generalDiscount: true } } },
      });

      if (client) {
        // 거래처 개별 단가
        const clientPrice = await this.prisma.clientProductionSettingPrice.findFirst({
          where: { clientId: dto.clientId, specificationId: dto.specificationId },
        });

        if (clientPrice) {
          unitPrice = Number(clientPrice.fourColorDoublePrice || clientPrice.doubleSidedPrice || 0);
          priceSource = 'client';
          return { unitPrice, priceSource, specName: spec.name };
        }

        // 거래처의 그룹 우선
        if (client.groupId) effectiveGroupId = client.groupId;
      }
    }

    // 그룹 단가 조회 (거래처 그룹 또는 비회원 직접 선택 그룹)
    if (effectiveGroupId) {
      const groupPrice = await this.prisma.groupProductionSettingPrice.findFirst({
        where: { clientGroupId: effectiveGroupId, specificationId: dto.specificationId },
      });

      if (groupPrice) {
        unitPrice = Number(groupPrice.fourColorDoublePrice || groupPrice.doubleSidedPrice || 0);
        priceSource = 'group';
      } else {
        const group = await this.prisma.clientGroup.findUnique({
          where: { id: effectiveGroupId },
          select: { generalDiscount: true },
        });
        if (group?.generalDiscount && Number(group.generalDiscount) !== 100) {
          unitPrice = Math.round(unitPrice * Number(group.generalDiscount) / 100);
          priceSource = 'group_discount';
        }
      }
    }

    return { unitPrice, priceSource, specName: spec.name };
  }
}
