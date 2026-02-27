import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateInvitationDto,
  UpdateEmploymentDto,
  AcceptInvitationDto,
  AcceptInvitationExistingDto,
} from './dto/employment.dto';

@Injectable()
export class EmploymentService {
  private readonly logger = new Logger(EmploymentService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  // ==================== 직원 목록 ====================

  async getEmployeesByClient(clientId: string) {
    return this.prisma.employment.findMany({
      where: { clientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            profileImage: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    });
  }

  // ==================== 초대 관리 ====================

  async createInvitation(
    clientId: string,
    dto: CreateInvitationDto,
    sentById?: string,
  ) {
    // 거래처 존재 확인
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });
    if (!client) {
      throw new NotFoundException('거래처를 찾을 수 없습니다.');
    }

    // 이미 소속 직원인지 확인
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.inviteeEmail },
    });
    if (existingUser) {
      const existingEmployment = await this.prisma.employment.findUnique({
        where: {
          userId_clientId: {
            userId: existingUser.id,
            clientId,
          },
        },
      });
      if (existingEmployment) {
        throw new ConflictException('이미 소속된 직원입니다.');
      }
    }

    // 기존 대기 초대 확인 → 있으면 업데이트
    const existingInvitation = await this.prisma.invitation.findUnique({
      where: {
        clientId_inviteeEmail: {
          clientId,
          inviteeEmail: dto.inviteeEmail,
        },
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    let invitation;
    if (existingInvitation && existingInvitation.status === 'PENDING') {
      invitation = await this.prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          role: dto.role,
          expiresAt,
          sentById,
        },
      });
    } else if (existingInvitation) {
      // 이미 수락/만료된 초대 → 삭제 후 재생성
      await this.prisma.invitation.delete({
        where: { id: existingInvitation.id },
      });
      invitation = await this.prisma.invitation.create({
        data: {
          clientId,
          inviteeEmail: dto.inviteeEmail,
          role: dto.role,
          expiresAt,
          sentById,
        },
      });
    } else {
      invitation = await this.prisma.invitation.create({
        data: {
          clientId,
          inviteeEmail: dto.inviteeEmail,
          role: dto.role,
          expiresAt,
          sentById,
        },
      });
    }

    // 이메일 발송 시도 (실패해도 초대는 생성)
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    const inviteLink = `${frontendUrl}/invite/${invitation.token}`;

    if (this.emailService.isConfigured()) {
      try {
        await this.emailService.sendEmail({
          to: dto.inviteeEmail,
          subject: `[${client.clientName}] 직원 초대`,
          html: `
            <h2>${client.clientName}에서 직원으로 초대했습니다.</h2>
            <p>역할: ${dto.role === 'MANAGER' ? '관리자' : '직원'}</p>
            <p>아래 링크를 클릭하여 초대를 수락해주세요:</p>
            <a href="${inviteLink}" style="display:inline-block;padding:12px 24px;background:#E4007F;color:#fff;text-decoration:none;border-radius:6px;">초대 수락하기</a>
            <p style="color:#666;font-size:12px;margin-top:16px;">이 초대는 7일 후 만료됩니다.</p>
          `,
        });
      } catch (e) {
        this.logger.warn(`초대 이메일 발송 실패: ${dto.inviteeEmail}`, e);
      }
    }

    return {
      invitation,
      inviteLink,
    };
  }

  async getInvitationsByClient(clientId: string) {
    return this.prisma.invitation.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvitation(invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException('초대를 찾을 수 없습니다.');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('대기 중인 초대만 취소할 수 있습니다.');
    }
    await this.prisma.invitation.delete({ where: { id: invitationId } });
    return { success: true, message: '초대가 취소되었습니다.' };
  }

  // ==================== 초대 수락 ====================

  async getInvitationByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: {
        client: {
          select: { id: true, clientName: true },
        },
      },
    });

    if (!invitation) {
      return { valid: false, expired: false, alreadyAccepted: false };
    }

    if (invitation.status === 'ACCEPTED') {
      return { valid: false, alreadyAccepted: true };
    }

    if (invitation.status === 'EXPIRED' || invitation.expiresAt < new Date()) {
      // 만료 상태 업데이트
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      return { valid: false, expired: true };
    }

    return {
      valid: true,
      invitation: {
        id: invitation.id,
        inviteeEmail: invitation.inviteeEmail,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
      client: invitation.client,
    };
  }

  async acceptInvitation(dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('유효하지 않은 초대입니다.');
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('만료된 초대입니다.');
    }

    // 이메일 중복 확인 (User 테이블)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.inviteeEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        '이미 등록된 이메일입니다. "기존 계정으로 연결"을 사용해주세요.',
      );
    }

    // 트랜잭션: User 생성 + Employment 생성 + Invitation 상태 변경
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: invitation.inviteeEmail,
          name: dto.name,
          passwordHash: hashedPassword,
          phone: dto.phone,
        },
      });

      const employment = await tx.employment.create({
        data: {
          userId: user.id,
          clientId: invitation.clientId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return { user, employment };
    });

    return {
      success: true,
      message: '초대를 수락했습니다. 로그인해주세요.',
      userId: result.user.id,
      employmentId: result.employment.id,
    };
  }

  async acceptInvitationExisting(dto: AcceptInvitationExistingDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('유효하지 않은 초대입니다.');
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('만료된 초대입니다.');
    }

    // User 조회 + 비밀번호 확인
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new BadRequestException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    // 이미 소속인지 확인
    const existingEmployment = await this.prisma.employment.findUnique({
      where: {
        userId_clientId: {
          userId: user.id,
          clientId: invitation.clientId,
        },
      },
    });
    if (existingEmployment) {
      throw new ConflictException('이미 해당 거래처에 소속되어 있습니다.');
    }

    // 트랜잭션: Employment 생성 + Invitation 상태 변경
    const result = await this.prisma.$transaction(async (tx) => {
      const employment = await tx.employment.create({
        data: {
          userId: user.id,
          clientId: invitation.clientId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return employment;
    });

    return {
      success: true,
      message: '초대를 수락했습니다. 로그인해주세요.',
      userId: user.id,
      employmentId: result.id,
    };
  }

  // ==================== 직원 관리 ====================

  async updateEmployment(employmentId: string, dto: UpdateEmploymentDto) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
    });
    if (!employment) {
      throw new NotFoundException('직원 정보를 찾을 수 없습니다.');
    }

    return this.prisma.employment.update({
      where: { id: employmentId },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.canViewAllOrders !== undefined && {
          canViewAllOrders: dto.canViewAllOrders,
        }),
        ...(dto.canManageProducts !== undefined && {
          canManageProducts: dto.canManageProducts,
        }),
        ...(dto.canViewSettlement !== undefined && {
          canViewSettlement: dto.canViewSettlement,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  async removeEmployment(employmentId: string) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
    });
    if (!employment) {
      throw new NotFoundException('직원 정보를 찾을 수 없습니다.');
    }

    await this.prisma.employment.delete({ where: { id: employmentId } });
    return { success: true, message: '직원이 제거되었습니다.' };
  }
}
