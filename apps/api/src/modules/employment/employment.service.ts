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
  CreateClientDepartmentDto,
  UpdateClientDepartmentDto,
} from './dto/employment.dto';

@Injectable()
export class EmploymentService {
  private readonly logger = new Logger(EmploymentService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  private generateClientCode(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `E${ts}${rand}`;
  }

  // ==================== 직원 목록 ====================

  async getEmployeesByClient(clientId: string) {
    return this.prisma.employment.findMany({
      where: { companyClientId: clientId },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            clientName: true,
            phone: true,
            profileImage: true,
            lastLoginAt: true,
            lastLoginIp: true,
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

    // 이미 소속 직원인지 확인 (Client 이메일로 검색)
    const existingClient = await this.prisma.client.findFirst({
      where: { email: dto.inviteeEmail },
    });
    if (existingClient) {
      const existingEmployment = await this.prisma.employment.findUnique({
        where: {
          memberClientId_companyClientId: {
            memberClientId: existingClient.id,
            companyClientId: clientId,
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
            <p>역할: ${dto.role === 'MANAGER' ? '관리자' : dto.role === 'EDITOR' ? '편집자' : '직원'}</p>
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

  /** 아이디 중복 확인 */
  async checkLoginIdAvailable(loginId: string) {
    const existing = await this.prisma.client.findFirst({
      where: { email: loginId },
    });
    return { available: !existing };
  }

  /** 초대 수락 - 신규 계정 (Client 생성) */
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

    // 아이디 중복 확인
    const existingByLoginId = await this.prisma.client.findFirst({
      where: { email: dto.loginId },
    });
    if (existingByLoginId) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }

    // 이메일로 기존 계정 확인
    const existingClient = await this.prisma.client.findFirst({
      where: { email: invitation.inviteeEmail },
    });

    // 기존 계정이 있으면 같은 스튜디오 소속 여부만 확인 (다른 스튜디오는 허용)
    if (existingClient) {
      const existingEmployment = await this.prisma.employment.findUnique({
        where: {
          memberClientId_companyClientId: {
            memberClientId: existingClient.id,
            companyClientId: invitation.clientId,
          },
        },
      });
      if (existingEmployment) {
        throw new ConflictException('이미 해당 거래처에 소속되어 있습니다.');
      }
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 트랜잭션: Client 생성 또는 기존 Client 사용 + Employment 생성 + Invitation 상태 변경
    const result = await this.prisma.$transaction(async (tx) => {
      let client;
      if (existingClient) {
        // 기존 계정 재사용 (비밀번호 업데이트, 이름/전화번호 반영)
        client = await tx.client.update({
          where: { id: existingClient.id },
          data: {
            ...(dto.name && { clientName: dto.name }),
            ...(dto.phone && { phone: dto.phone }),
            email: dto.loginId,
            password: hashedPassword,
          },
        });
      } else {
        // 신규 계정 생성
        const clientCode = this.generateClientCode();
        client = await tx.client.create({
          data: {
            clientCode,
            clientName: dto.name,
            email: dto.loginId,
            password: hashedPassword,
            phone: dto.phone,
            contactEmail: dto.email,
            memberType: 'individual',
            status: 'active',
          },
        });
      }

      const employment = await tx.employment.create({
        data: {
          memberClientId: client.id,
          companyClientId: invitation.clientId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });

      return { client, employment };
    });

    return {
      success: true,
      message: '초대를 수락했습니다. 로그인해주세요.',
      clientId: result.client.id,
      employmentId: result.employment.id,
    };
  }

  /** 초대 수락 - 기존 계정 연결 (Client 이메일/비밀번호 확인) */
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

    // Client 조회 + 비밀번호 확인
    const client = await this.prisma.client.findFirst({
      where: { email: dto.email },
    });
    if (!client || !client.password) {
      throw new BadRequestException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    const isValid = await bcrypt.compare(dto.password, client.password);
    if (!isValid) {
      throw new BadRequestException(
        '이메일 또는 비밀번호가 일치하지 않습니다.',
      );
    }

    // 이미 소속인지 확인
    const existingEmployment = await this.prisma.employment.findUnique({
      where: {
        memberClientId_companyClientId: {
          memberClientId: client.id,
          companyClientId: invitation.clientId,
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
          memberClientId: client.id,
          companyClientId: invitation.clientId,
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
      clientId: client.id,
      employmentId: result.id,
    };
  }

  /** 초대 수락 - 소셜 로그인 (OAuth 인증 후 호출) */
  async acceptInvitationOAuth(dto: {
    token: string;
    oauthProvider: string;
    oauthId: string;
    email: string;
    name: string;
  }) {
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

    // OAuth로 기존 Client 검색 (oauthProvider + oauthId로만 검색)
    let client = await this.prisma.client.findFirst({
      where: { oauthProvider: dto.oauthProvider, oauthId: dto.oauthId },
    });

    if (!client) {
      // 새 Client 생성 (이메일 폴백 없음 - 다른 사용자 계정에 연결되는 보안 이슈 방지)
      const clientCode = this.generateClientCode();
      client = await this.prisma.client.create({
        data: {
          clientCode,
          clientName: dto.name,
          email: dto.email,
          oauthProvider: dto.oauthProvider,
          oauthId: dto.oauthId,
          memberType: 'individual',
          status: 'active',
        },
      });
    }

    // 이미 소속인지 확인
    const existingEmployment = await this.prisma.employment.findUnique({
      where: {
        memberClientId_companyClientId: {
          memberClientId: client.id,
          companyClientId: invitation.clientId,
        },
      },
    });
    if (existingEmployment) {
      throw new ConflictException('이미 해당 거래처에 소속되어 있습니다.');
    }

    // Employment 생성 + Invitation 수락
    await this.prisma.$transaction(async (tx) => {
      await tx.employment.create({
        data: {
          memberClientId: client!.id,
          companyClientId: invitation.clientId,
          role: invitation.role,
        },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return {
      success: true,
      message: '초대를 수락했습니다. 로그인해주세요.',
      clientId: client.id,
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

    // 최고관리자(최초가입자)는 권한 변경 불가
    if (employment.memberClientId === employment.companyClientId) {
      throw new BadRequestException('최고관리자의 권한은 변경할 수 없습니다.');
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
        ...(dto.department !== undefined && {
          department: dto.department?.trim() || null,
        }),
      },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            clientName: true,
            phone: true,
          },
        },
      },
    });
  }

  private static readonly DEFAULT_DEPARTMENTS = [
    { name: 'Photography', sortOrder: 1 },
    { name: 'Design', sortOrder: 2 },
    { name: 'Sales & Concierge', sortOrder: 3 },
  ];

  async getDepartmentsByClient(clientId: string) {
    let departments = await this.prisma.clientDepartment.findMany({
      where: { clientId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    // 부서가 없으면 기본 부서 자동 생성
    if (departments.length === 0) {
      await this.prisma.clientDepartment.createMany({
        data: EmploymentService.DEFAULT_DEPARTMENTS.map((d) => ({
          clientId,
          name: d.name,
          sortOrder: d.sortOrder,
        })),
        skipDuplicates: true,
      });
      departments = await this.prisma.clientDepartment.findMany({
        where: { clientId },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    }

    return departments;
  }

  // ==================== 거래처 부서 관리 ====================

  async getDepartmentById(id: string) {
    const dept = await this.prisma.clientDepartment.findUnique({
      where: { id },
    });
    if (!dept) {
      throw new NotFoundException('부서를 찾을 수 없습니다.');
    }
    return dept;
  }

  async createClientDepartment(dto: CreateClientDepartmentDto) {
    const existing = await this.prisma.clientDepartment.findUnique({
      where: { clientId_name: { clientId: dto.clientId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException('이미 존재하는 부서명입니다.');
    }
    return this.prisma.clientDepartment.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateClientDepartment(id: string, dto: UpdateClientDepartmentDto) {
    const dept = await this.prisma.clientDepartment.findUnique({
      where: { id },
    });
    if (!dept) {
      throw new NotFoundException('부서를 찾을 수 없습니다.');
    }
    if (dto.name && dto.name !== dept.name) {
      const existing = await this.prisma.clientDepartment.findUnique({
        where: { clientId_name: { clientId: dept.clientId, name: dto.name } },
      });
      if (existing) {
        throw new ConflictException('이미 존재하는 부서명입니다.');
      }
    }
    return this.prisma.clientDepartment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteClientDepartment(id: string) {
    const dept = await this.prisma.clientDepartment.findUnique({
      where: { id },
    });
    if (!dept) {
      throw new NotFoundException('부서를 찾을 수 없습니다.');
    }
    await this.prisma.clientDepartment.delete({ where: { id } });
    return { success: true, message: '부서가 삭제되었습니다.' };
  }

  async removeEmployment(employmentId: string) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
    });
    if (!employment) {
      throw new NotFoundException('직원 정보를 찾을 수 없습니다.');
    }

    // 최고관리자(최초가입자)는 제거 불가
    if (employment.memberClientId === employment.companyClientId) {
      throw new BadRequestException('최고관리자는 제거할 수 없습니다.');
    }

    await this.prisma.employment.delete({ where: { id: employmentId } });
    return { success: true, message: '직원이 제거되었습니다.' };
  }
}
