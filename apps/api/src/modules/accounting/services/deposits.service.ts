import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  DepositQueryDto,
  DepositResponseDto,
  DepositsListResponseDto,
  CreateDepositDto,
  UpdateDepositDto,
} from '../dto/deposits.dto';

@Injectable()
export class DepositsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 고객별 입금내역 조회 (SalesReceipt 기반)
   */
  async findDepositsByClient(
    query: DepositQueryDto,
  ): Promise<DepositsListResponseDto> {
    const { clientId, startDate, endDate, paymentMethod } = query;

    console.log('[Deposits] 입금내역 조회 요청:', {
      clientId,
      startDate,
      endDate,
      paymentMethod,
    });

    // WHERE 조건 구성 (SalesReceipt 기반)
    const whereClause: any = {
      salesLedger: {
        clientId,
      },
      receiptDate: {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      },
    };

    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod;
    }

    console.log('[Deposits] WHERE 조건:', JSON.stringify(whereClause, null, 2));

    // SalesReceipt 조회 (입금 기록 테이블)
    const receipts = await this.prisma.salesReceipt.findMany({
      where: whereClause,
      include: {
        salesLedger: {
          select: {
            orderId: true,
            orderNumber: true,
            totalAmount: true,
            client: {
              select: {
                clientName: true,
              },
            },
          },
        },
      },
      orderBy: {
        receiptDate: 'desc',
      },
    });

    console.log(`[Deposits] 조회된 입금 수: ${receipts.length}건`);

    // DepositResponseDto로 변환
    const data: DepositResponseDto[] = receipts.map((receipt) => {
      return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        receiptDate: receipt.receiptDate.toISOString(),
        orderNumber: receipt.salesLedger.orderNumber,
        orderId: receipt.salesLedger.orderId,
        orderAmount: parseFloat(receipt.salesLedger.totalAmount.toString()),
        depositAmount: parseFloat(receipt.amount.toString()),
        paymentMethod: receipt.paymentMethod,
        bankName: receipt.bankName || undefined,
        depositorName: receipt.depositorName || undefined,
        note: receipt.note || undefined,
        createdAt: receipt.createdAt.toISOString(),
        createdBy: receipt.createdBy,
      };
    });

    // 요약 정보 계산
    const summary = {
      totalCount: data.length,
      totalAmount: data.reduce((sum, d) => sum + d.depositAmount, 0),
      totalOrderAmount: data.reduce((sum, d) => sum + d.orderAmount, 0),
    };

    return {
      data,
      summary,
    };
  }

  /**
   * 입금 상세 조회
   */
  async findOne(id: string): Promise<DepositResponseDto> {
    const receipt = await this.prisma.salesReceipt.findUnique({
      where: { id },
      include: {
        salesLedger: {
          select: {
            orderId: true,
            orderNumber: true,
            totalAmount: true,
            client: {
              select: {
                clientName: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('입금 내역을 찾을 수 없습니다');
    }

    return {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptDate: receipt.receiptDate.toISOString(),
      orderNumber: receipt.salesLedger.orderNumber,
      orderId: receipt.salesLedger.orderId,
      orderAmount: parseFloat(receipt.salesLedger.totalAmount.toString()),
      depositAmount: parseFloat(receipt.amount.toString()),
      paymentMethod: receipt.paymentMethod,
      bankName: receipt.bankName || undefined,
      depositorName: receipt.depositorName || undefined,
      note: receipt.note || undefined,
      createdAt: receipt.createdAt.toISOString(),
      createdBy: receipt.createdBy,
    };
  }

  /**
   * 입금 등록
   */
  async createDeposit(dto: CreateDepositDto, userId: string) {
    // 1. SalesLedger 조회 및 검증
    const ledger = await this.prisma.salesLedger.findUnique({
      where: { id: dto.salesLedgerId },
      include: {
        order: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!ledger) {
      throw new NotFoundException('매출원장을 찾을 수 없습니다');
    }

    // 2. 입금액 검증 (미수금 초과 여부)
    if (dto.amount > Number(ledger.outstandingAmount)) {
      throw new BadRequestException('입금액이 미수금을 초과합니다');
    }

    // 3. 트랜잭션 실행
    return await this.prisma.$transaction(async (tx) => {
      // 3-1. 수금번호 생성
      const receiptNumber = await this.generateReceiptNumber();

      // 3-2. SalesReceipt 생성
      const receipt = await tx.salesReceipt.create({
        data: {
          salesLedgerId: dto.salesLedgerId,
          receiptNumber,
          receiptDate: new Date(dto.receiptDate),
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          bankName: dto.bankName,
          depositorName: dto.depositorName,
          note: dto.note,
          createdBy: userId,
        },
      });

      // 3-3. SalesLedger 금액 업데이트
      const newReceived = Number(ledger.receivedAmount) + dto.amount;
      const newOutstanding = Number(ledger.totalAmount) - newReceived;
      const newStatus =
        newOutstanding <= 0 ? 'paid' : newReceived > 0 ? 'partial' : 'unpaid';

      await tx.salesLedger.update({
        where: { id: dto.salesLedgerId },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      // 3-4. Order.paymentStatus 동기화
      await tx.order.update({
        where: { id: ledger.order.id },
        data: { paymentStatus: newStatus },
      });

      return receipt;
    });
  }

  /**
   * 입금 수정
   */
  async updateDeposit(id: string, dto: UpdateDepositDto, userId: string) {
    // 1. 기존 입금 조회
    const receipt = await this.prisma.salesReceipt.findUnique({
      where: { id },
      include: {
        salesLedger: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('입금 내역을 찾을 수 없습니다');
    }

    // 2. 트랜잭션 실행
    return await this.prisma.$transaction(async (tx) => {
      const ledger = receipt.salesLedger;

      // 2-1. 기존 입금액 롤백
      const receivedWithoutThis =
        Number(ledger.receivedAmount) - Number(receipt.amount);

      // 2-2. 새 입금액 검증
      const newAmount = dto.amount !== undefined ? dto.amount : Number(receipt.amount);
      const newReceived = receivedWithoutThis + newAmount;

      if (newReceived > Number(ledger.totalAmount)) {
        throw new BadRequestException('입금액이 총액을 초과합니다');
      }

      // 2-3. SalesReceipt 수정
      const updated = await tx.salesReceipt.update({
        where: { id },
        data: {
          ...(dto.receiptDate && { receiptDate: new Date(dto.receiptDate) }),
          ...(dto.amount !== undefined && { amount: dto.amount }),
          ...(dto.paymentMethod && { paymentMethod: dto.paymentMethod }),
          ...(dto.bankName !== undefined && { bankName: dto.bankName }),
          ...(dto.depositorName !== undefined && {
            depositorName: dto.depositorName,
          }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      // 2-4. SalesLedger 재계산
      const newOutstanding = Number(ledger.totalAmount) - newReceived;
      const newStatus =
        newOutstanding <= 0 ? 'paid' : newReceived > 0 ? 'partial' : 'unpaid';

      await tx.salesLedger.update({
        where: { id: ledger.id },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      // 2-5. Order 업데이트
      await tx.order.update({
        where: { id: ledger.order.id },
        data: { paymentStatus: newStatus },
      });

      return updated;
    });
  }

  /**
   * 입금 삭제
   */
  async deleteDeposit(id: string): Promise<void> {
    // 1. 기존 입금 조회
    const receipt = await this.prisma.salesReceipt.findUnique({
      where: { id },
      include: {
        salesLedger: {
          include: {
            order: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('입금 내역을 찾을 수 없습니다');
    }

    // 2. 트랜잭션 실행
    await this.prisma.$transaction(async (tx) => {
      // 2-1. SalesReceipt 삭제
      await tx.salesReceipt.delete({ where: { id } });

      // 2-2. SalesLedger 금액 롤백
      const ledger = receipt.salesLedger;
      const newReceived = Number(ledger.receivedAmount) - Number(receipt.amount);
      const newOutstanding = Number(ledger.totalAmount) - newReceived;
      const newStatus =
        newReceived <= 0 ? 'unpaid' : newOutstanding <= 0 ? 'paid' : 'partial';

      await tx.salesLedger.update({
        where: { id: ledger.id },
        data: {
          receivedAmount: newReceived,
          outstandingAmount: newOutstanding,
          paymentStatus: newStatus,
        },
      });

      // 2-3. Order 업데이트
      await tx.order.update({
        where: { id: ledger.order.id },
        data: { paymentStatus: newStatus },
      });
    });
  }

  /**
   * 수금번호 생성 (SR-YYYYMMDD-NNN)
   */
  private async generateReceiptNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `SR-${dateStr}-`;

    const lastReceipt = await this.prisma.salesReceipt.findFirst({
      where: { receiptNumber: { startsWith: prefix } },
      orderBy: { receiptNumber: 'desc' },
    });

    let sequence = 1;
    if (lastReceipt) {
      const lastSeq = parseInt(lastReceipt.receiptNumber.split('-')[2]);
      sequence = lastSeq + 1;
    }

    return `${prefix}${sequence.toString().padStart(3, '0')}`;
  }
}
