import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';
import { BusinessUpgradeRequestDto, ProcessBusinessUpgradeDto } from '../dto';

@Injectable()
export class BusinessUpgradeService {
  private readonly logger = new Logger(BusinessUpgradeService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private b2Storage: B2StorageService,
  ) {}

  // ==================== 회원 본인 ====================

  async requestUpgrade(clientId: string, dto: BusinessUpgradeRequestDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');
    if (client.memberType === 'business') {
      throw new BadRequestException('이미 사업자 회원입니다');
    }
    if ((client as any).businessUpgradeStatus === 'pending') {
      throw new ConflictException('이미 승인 대기 중인 신청이 있습니다');
    }

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        businessNumber: dto.businessNumber,
        representative: dto.representative,
        ...(dto.businessType !== undefined ? { businessType: dto.businessType } : {}),
        ...(dto.businessCategory !== undefined ? { businessCategory: dto.businessCategory } : {}),
        ...(dto.taxInvoiceEmail !== undefined ? { taxInvoiceEmail: dto.taxInvoiceEmail } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.addressDetail !== undefined ? { addressDetail: dto.addressDetail } : {}),
        ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone } : {}),
        ...(dto.paymentContactName !== undefined ? { paymentContactName: dto.paymentContactName } : {}),
        ...(dto.paymentContactPhone !== undefined ? { paymentContactPhone: dto.paymentContactPhone } : {}),
        businessUpgradeStatus: 'pending',
        businessUpgradeAt: new Date(),
        businessRegCertPath: dto.certUploadKey,
        businessUpgradeRejectReason: null,
      } as any,
    });

    return { success: true, message: '사업자 회원 전환 신청이 접수되었습니다. 관리자 승인 후 확정됩니다.' };
  }

  async getMyUpgradeStatus(clientId: string) {
    const client = (await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        memberType: true,
        businessNumber: true,
        representative: true,
        businessType: true,
        businessCategory: true,
        taxInvoiceEmail: true,
        postalCode: true,
        address: true,
        addressDetail: true,
        businessUpgradeStatus: true,
        businessUpgradeAt: true,
        businessUpgradeRejectReason: true,
        businessRegCertPath: true,
      } as any,
    })) as any;
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');

    return {
      status: client.businessUpgradeStatus ?? 'none',
      memberType: client.memberType,
      submittedAt: client.businessUpgradeAt ?? null,
      rejectReason: client.businessUpgradeRejectReason ?? null,
      businessNumber: client.businessNumber ?? null,
      representative: client.representative ?? null,
      businessType: client.businessType ?? null,
      businessCategory: client.businessCategory ?? null,
      taxInvoiceEmail: client.taxInvoiceEmail ?? null,
      postalCode: client.postalCode ?? null,
      address: client.address ?? null,
      addressDetail: client.addressDetail ?? null,
      hasCert: !!client.businessRegCertPath,
    };
  }

  async getMyCertUrl(clientId: string) {
    const client = (await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { businessRegCertPath: true } as any,
    })) as any;
    if (!client || !client.businessRegCertPath) {
      throw new NotFoundException('등록된 사업자등록증이 없습니다');
    }
    const url = await this.b2Storage.getPrivatePresignedUrl(client.businessRegCertPath, 300);
    return { url };
  }

  // ==================== 관리자 ====================

  async listRequests(status: string = 'pending') {
    return this.prisma.client.findMany({
      where: { businessUpgradeStatus: status } as any,
      orderBy: { businessUpgradeAt: 'asc' } as any,
      select: {
        id: true,
        clientCode: true,
        clientName: true,
        email: true,
        contactEmail: true,
        mobile: true,
        memberType: true,
        businessNumber: true,
        representative: true,
        businessType: true,
        businessCategory: true,
        taxInvoiceEmail: true,
        postalCode: true,
        address: true,
        addressDetail: true,
        businessUpgradeStatus: true,
        businessUpgradeAt: true,
        businessUpgradeRejectReason: true,
        businessRegCertPath: true,
      } as any,
    });
  }

  async getCertUrl(clientId: string) {
    const client = (await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { businessRegCertPath: true } as any,
    })) as any;
    if (!client || !client.businessRegCertPath) {
      throw new NotFoundException('등록된 사업자등록증이 없습니다');
    }
    const url = await this.b2Storage.getPrivatePresignedUrl(client.businessRegCertPath, 300);
    return { url };
  }

  async process(clientId: string, dto: ProcessBusinessUpgradeDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');
    if ((client as any).businessUpgradeStatus !== 'pending') {
      throw new BadRequestException('승인 대기 상태의 신청이 아닙니다');
    }

    if (dto.action === 'approve') {
      // 사업자 전용 기본 그룹 조회 (있으면 미지정 회원에 배정)
      const businessGroup = await this.prisma.clientGroup.findFirst({
        where: { groupName: '스튜디오회원' },
      });
      await this.prisma.client.update({
        where: { id: clientId },
        data: {
          memberType: 'business',
          businessUpgradeStatus: 'approved',
          businessUpgradeAt: new Date(),
          businessUpgradeRejectReason: null,
          ...(businessGroup && !client.groupId ? { groupId: businessGroup.id } : {}),
        } as any,
      });
      await this.sendResultEmail(client, 'approved');
      return { success: true, message: '사업자 회원으로 전환되었습니다' };
    }

    // reject
    if (!dto.rejectReason || !dto.rejectReason.trim()) {
      throw new BadRequestException('반려 사유를 입력해주세요');
    }
    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        businessUpgradeStatus: 'rejected',
        businessUpgradeAt: new Date(),
        businessUpgradeRejectReason: dto.rejectReason.trim(),
      } as any,
    });
    await this.sendResultEmail(client, 'rejected', dto.rejectReason.trim());
    return { success: true, message: '신청이 반려되었습니다' };
  }

  private async sendResultEmail(client: any, result: 'approved' | 'rejected', rejectReason?: string) {
    try {
      const to = client.contactEmail || client.email;
      if (!to) return;
      const name = client.clientName || '회원';
      let subject: string;
      let html: string;
      let text: string;
      if (result === 'approved') {
        subject = '[Photocafe] 사업자 회원 전환이 승인되었습니다';
        html = `
          <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
            <h2 style="margin: 0 0 16px;">사업자 회원 전환 승인 안내</h2>
            <p style="line-height: 1.6;">${name}님의 사업자 회원 전환 신청이 승인되었습니다.<br/>
            이제 세금계산서 발행이 가능합니다.</p>
          </div>`;
        text = `${name}님의 사업자 회원 전환 신청이 승인되었습니다. 이제 세금계산서 발행이 가능합니다.`;
      } else {
        subject = '[Photocafe] 사업자 회원 전환 신청이 반려되었습니다';
        html = `
          <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
            <h2 style="margin: 0 0 16px;">사업자 회원 전환 반려 안내</h2>
            <p style="line-height: 1.6;">${name}님의 사업자 회원 전환 신청이 반려되었습니다.</p>
            <p style="line-height: 1.6;"><strong>반려 사유:</strong> ${rejectReason ?? ''}</p>
            <p style="line-height: 1.6;">내용을 확인하신 후 마이페이지에서 다시 신청해 주세요.</p>
          </div>`;
        text = `${name}님의 사업자 회원 전환 신청이 반려되었습니다.\n반려 사유: ${rejectReason ?? ''}\n마이페이지에서 다시 신청해 주세요.`;
      }
      const r = await this.emailService.sendEmail({ to, subject, html, text });
      if (!r.success) {
        this.logger.warn(`사업자 전환 결과 메일 발송 실패 (${to}): ${r.error}`);
      }
    } catch (e: any) {
      this.logger.warn(`사업자 전환 결과 메일 발송 중 오류: ${e?.message}`);
    }
  }
}
