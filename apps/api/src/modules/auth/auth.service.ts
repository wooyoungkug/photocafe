import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '@/common/email/email.service';

interface OAuthTokenData {
  accessToken: string;
  refreshToken: string;
  user: any;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  // OAuth 일회용 코드 → 토큰 교환 저장소 (TTL 60초)
  private readonly oauthCodeStore = new Map<string, OAuthTokenData>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) { }

  /** OAuth 콜백용: 토큰을 임시 코드로 저장 (60초 TTL) */
  generateOAuthCode(tokens: { accessToken: string; refreshToken: string; user: any }): string {
    const code = crypto.randomBytes(32).toString('hex');
    this.oauthCodeStore.set(code, {
      ...tokens,
      expiresAt: Date.now() + 60_000,
    });
    this.cleanupExpiredCodes();
    return code;
  }

  /** OAuth 코드 → 토큰 교환 (1회 사용) */
  exchangeOAuthCode(code: string): { accessToken: string; refreshToken: string; user: any } {
    const data = this.oauthCodeStore.get(code);
    if (!data) {
      throw new UnauthorizedException('유효하지 않은 인증 코드입니다.');
    }
    if (Date.now() > data.expiresAt) {
      this.oauthCodeStore.delete(code);
      throw new UnauthorizedException('인증 코드가 만료되었습니다.');
    }
    this.oauthCodeStore.delete(code);
    return { accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user };
  }

  private cleanupExpiredCodes() {
    const now = Date.now();
    for (const [key, value] of this.oauthCodeStore.entries()) {
      if (now > value.expiresAt) {
        this.oauthCodeStore.delete(key);
      }
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type === 'staff') {
        const staff = await this.prisma.staff.findUnique({
          where: { id: payload.sub },
          include: { branch: true, department: true },
        });

        if (!staff || !staff.isActive || (staff.status && staff.status !== 'active')) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        const newPayload = {
          sub: staff.id,
          staffId: staff.staffId,
          name: staff.name,
          role: 'admin',
          type: 'staff',
          branchId: staff.branchId,
          departmentId: staff.departmentId,
        };

        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: this.jwtService.sign(newPayload, { expiresIn: '30d' }),
          user: {
            id: staff.id, staffId: staff.staffId, name: staff.name, role: 'admin',
            email: staff.companyEmail || staff.email, isSuperAdmin: staff.isSuperAdmin ?? false,
            canEditMemberInfo: staff.canEditMemberInfo ?? false,
            profileImage: staff.profileImage,
            menuPermissions: (staff.menuPermissions as Record<string, boolean>) ?? {},
          },
        };
      }

      if (payload.type === 'client') {
        const client = await this.prisma.client.findUnique({
          where: { id: payload.sub },
        });

        if (!client) {
          throw new UnauthorizedException('Invalid refresh token');
        }

        const newPayload = {
          sub: client.id,
          email: client.email,
          role: 'client',
          type: 'client',
        };

        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: this.jwtService.sign(newPayload, { expiresIn: '30d' }),
          user: {
            id: client.id,
            email: client.email,
            name: client.clientName,
            role: 'client',
            clientId: client.id,
            clientName: client.clientName,
            mobile: client.mobile,
            businessNumber: client.businessNumber,
            representative: client.representative,
            address: client.address,
            addressDetail: client.addressDetail,
            contactPerson: client.contactPerson,
          },
        };
      }

      if (payload.type === 'employee') {
        const client = await this.prisma.client.findUnique({
          where: { id: payload.sub },
        });

        if (!client || client.status !== 'active') {
          throw new UnauthorizedException('Invalid refresh token');
        }

        const employment = await this.prisma.employment.findUnique({
          where: { id: payload.employmentId },
          include: {
            company: { select: { id: true, clientName: true } },
          },
        });

        if (!employment || employment.status !== 'ACTIVE') {
          throw new UnauthorizedException('Invalid refresh token');
        }

        const newPayload = {
          sub: client.id,
          email: client.email,
          type: 'employee',
          role: employment.role,
          clientId: employment.companyClientId,
          employmentId: employment.id,
          canViewAllOrders: employment.canViewAllOrders,
          canManageProducts: employment.canManageProducts,
          canViewSettlement: employment.canViewSettlement,
        };

        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: this.jwtService.sign(newPayload, { expiresIn: '30d' }),
          user: {
            id: client.id,
            email: client.email,
            name: client.clientName,
            role: employment.role,
            type: 'employee',
            clientId: employment.companyClientId,
            clientName: employment.company.clientName,
            employmentId: employment.id,
            employeeRole: employment.role,
            isOwner: employment.memberClientId === employment.companyClientId,
            canViewAllOrders: employment.canViewAllOrders,
            canManageProducts: employment.canManageProducts,
            canViewSettlement: employment.canViewSettlement,
          },
        };
      }

      // 기존 User 토큰 (레거시)
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return {
        accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string, type?: string, companyClientId?: string, staffId?: string) {
    const mapStaff = (staff: any) => ({
      ...staff,
      type: 'staff' as const,
    });

    const getStaffProfile = async () => {
      const staffById = await this.prisma.staff.findUnique({
        where: { id: userId },
        select: {
          id: true, staffId: true, name: true, email: true, role: true,
          isSuperAdmin: true, isActive: true, position: true,
          branchId: true, departmentId: true, menuPermissions: true,
          canLoginAsManager: true, canEditInManagerView: true,
          canChangeDepositStage: true, canChangeReceptionStage: true,
          canChangeCancelStage: true, canEditMemberInfo: true,
          canViewSettlement: true, canChangeOrderAmount: true,
          canManageDepartments: true, canBulkImportStaff: true,
          canViewAuditLogs: true, memberViewScope: true, salesViewScope: true,
        },
      });
      if (staffById) return mapStaff(staffById);

      if (!staffId) return null;

      const staffByStaffId = await this.prisma.staff.findFirst({
        where: { staffId },
        select: {
          id: true, staffId: true, name: true, email: true, role: true,
          isSuperAdmin: true, isActive: true, position: true,
          branchId: true, departmentId: true, menuPermissions: true,
          canLoginAsManager: true, canEditInManagerView: true,
          canChangeDepositStage: true, canChangeReceptionStage: true,
          canChangeCancelStage: true, canEditMemberInfo: true,
          canViewSettlement: true, canChangeOrderAmount: true,
          canManageDepartments: true, canBulkImportStaff: true,
          canViewAuditLogs: true, memberViewScope: true, salesViewScope: true,
        },
      });
      return staffByStaffId ? mapStaff(staffByStaffId) : null;
    };

    // staff 타입: Staff 테이블에서 조회
    if (type === 'staff') {
      const staffProfile = await getStaffProfile();
      if (!staffProfile) throw new UnauthorizedException('User not found');
      return staffProfile;
    }

    // client / employee 타입: Client 테이블에서 최신 설정값 반환
    if (type === 'client' || type === 'employee') {
      // employee는 소속 회사(companyClientId) 기준, client는 본인 ID
      const lookupId = type === 'employee' && companyClientId ? companyClientId : userId;
      const client = await this.prisma.client.findUnique({
        where: { id: lookupId },
        select: { id: true, email: true, clientName: true, businessNumber: true, representative: true, address: true, addressDetail: true, contactPerson: true, mobile: true, enableSchedule: true, enableRecruitment: true },
      });
      if (!client) throw new UnauthorizedException('User not found');
      return {
        id: client.id,
        email: client.email,
        name: client.clientName,
        businessNumber: client.businessNumber,
        representative: client.representative,
        address: client.address,
        addressDetail: client.addressDetail,
        contactPerson: client.contactPerson,
        mobile: client.mobile,
        enableSchedule: client.enableSchedule ?? true,
        enableRecruitment: client.enableRecruitment ?? true,
      };
    }

    // 타입 누락/레거시 토큰 대응: staff 우선 재조회
    const fallbackStaffProfile = await getStaffProfile();
    if (fallbackStaffProfile) {
      return fallbackStaffProfile;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // ========== OAuth 유틸 ==========

  private normalizeOAuthBirthday(birthday?: string, birthyear?: string): string | undefined {
    if (!birthday) return undefined;
    const cleanBirthday = birthday.replace(/-/g, '');
    const mm = cleanBirthday.slice(0, 2);
    const dd = cleanBirthday.slice(2, 4);
    if (birthyear) return `${birthyear}-${mm}-${dd}`;
    return `${mm}-${dd}`;
  }

  private normalizeOAuthGender(gender?: string): string | undefined {
    if (!gender) return undefined;
    const g = gender.toLowerCase();
    if (g === 'male' || g === 'm') return 'male';
    if (g === 'female' || g === 'f') return 'female';
    return gender;
  }

  private normalizeOAuthMobile(mobile?: string): string | undefined {
    if (!mobile) return undefined;
    return mobile.replace(/^\+82\s?/, '0').replace(/\s/g, '');
  }

  // ========== 고객 OAuth 로그인 ==========

  private readonly PROVIDER_LABELS: Record<string, string> = {
    naver: '네이버',
    kakao: '카카오',
    google: 'Google',
  };

  private async checkEmailDuplicate(email: string, currentProvider: string): Promise<{ provider: string; date: string } | null> {
    if (!email || email.includes(`${currentProvider}_`)) return null; // 가짜 이메일은 스킵

    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        oauthProvider: { not: currentProvider },
      },
      select: { oauthProvider: true, createdAt: true },
    });

    if (existing) {
      return {
        provider: existing.oauthProvider || '',
        date: existing.createdAt.toISOString().split('T')[0],
      };
    }
    return null;
  }

  async validateNaverUser(data: {
    oauthId: string; email: string; name: string;
    profileImage?: string; gender?: string; birthday?: string; birthyear?: string; mobile?: string;
  }) {
    let client = await this.prisma.client.findFirst({
      where: { oauthProvider: 'naver', oauthId: data.oauthId },
    });

    const gender = this.normalizeOAuthGender(data.gender);
    const birthday = this.normalizeOAuthBirthday(data.birthday, data.birthyear);
    const mobile = this.normalizeOAuthMobile(data.mobile);

    let isNew = false;
    if (!client) {
      const dup = await this.checkEmailDuplicate(data.email, 'naver');
      if (dup) {
        const providerLabel = this.PROVIDER_LABELS[dup.provider] || dup.provider;
        return {
          _emailDuplicate: true,
          _dupMessage: `이미 ${providerLabel}(으)로 가입된 이메일입니다. (가입일: ${dup.date})`,
        } as any;
      }
      isNew = true;
      const clientCode = `N${Date.now().toString().slice(-8)}`;
      client = await this.prisma.client.create({
        data: {
          clientCode, clientName: data.name, email: data.email,
          oauthProvider: 'naver', oauthId: data.oauthId, profileImage: data.profileImage,
          gender, birthday, ...(mobile && { mobile }),
          memberType: 'individual', priceType: 'standard', paymentType: 'order', status: 'active',
        },
      });
    } else {
      const updateData: any = {};
      if (!client.profileImage && data.profileImage) updateData.profileImage = data.profileImage;
      if (!client.gender && gender) updateData.gender = gender;
      if (!client.birthday && birthday) updateData.birthday = birthday;
      if (!client.mobile && mobile) updateData.mobile = mobile;
      if (!client.email && data.email) updateData.email = data.email;
      if (Object.keys(updateData).length > 0) {
        client = await this.prisma.client.update({ where: { id: client.id }, data: updateData });
      }
    }

    return { ...client, _isNew: isNew };
  }

  async validateKakaoUser(data: {
    oauthId: string; email: string; name: string;
    profileImage?: string; gender?: string; birthday?: string; birthyear?: string; mobile?: string;
  }) {
    let client = await this.prisma.client.findFirst({
      where: { oauthProvider: 'kakao', oauthId: data.oauthId },
    });

    const gender = this.normalizeOAuthGender(data.gender);
    const birthday = this.normalizeOAuthBirthday(data.birthday, data.birthyear);
    const mobile = this.normalizeOAuthMobile(data.mobile);

    let isNew = false;
    if (!client) {
      const dup = await this.checkEmailDuplicate(data.email, 'kakao');
      if (dup) {
        const providerLabel = this.PROVIDER_LABELS[dup.provider] || dup.provider;
        return {
          _emailDuplicate: true,
          _dupMessage: `이미 ${providerLabel}(으)로 가입된 이메일입니다. (가입일: ${dup.date})`,
        } as any;
      }
      isNew = true;
      const clientCode = `K${Date.now().toString().slice(-8)}`;
      client = await this.prisma.client.create({
        data: {
          clientCode, clientName: data.name, email: data.email,
          oauthProvider: 'kakao', oauthId: data.oauthId, profileImage: data.profileImage,
          gender, birthday, ...(mobile && { mobile }),
          memberType: 'individual', priceType: 'standard', paymentType: 'order', status: 'active',
        },
      });
    } else {
      const updateData: any = {};
      if (!client.profileImage && data.profileImage) updateData.profileImage = data.profileImage;
      if (!client.gender && gender) updateData.gender = gender;
      if (!client.birthday && birthday) updateData.birthday = birthday;
      if (!client.mobile && mobile) updateData.mobile = mobile;
      if (!client.email && data.email) updateData.email = data.email;
      if (Object.keys(updateData).length > 0) {
        client = await this.prisma.client.update({ where: { id: client.id }, data: updateData });
      }
    }

    return { ...client, _isNew: isNew };
  }

  async validateGoogleUser(data: {
    oauthId: string; email: string; name: string;
    profileImage?: string;
  }) {
    let client = await this.prisma.client.findFirst({
      where: { oauthProvider: 'google', oauthId: data.oauthId },
    });

    let isNew = false;
    if (!client) {
      const dup = await this.checkEmailDuplicate(data.email, 'google');
      if (dup) {
        const providerLabel = this.PROVIDER_LABELS[dup.provider] || dup.provider;
        return {
          _emailDuplicate: true,
          _dupMessage: `이미 ${providerLabel}(으)로 가입된 이메일입니다. (가입일: ${dup.date})`,
        } as any;
      }
      isNew = true;
      const clientCode = `G${Date.now().toString().slice(-8)}`;
      client = await this.prisma.client.create({
        data: {
          clientCode, clientName: data.name, email: data.email,
          oauthProvider: 'google', oauthId: data.oauthId, profileImage: data.profileImage,
          memberType: 'individual', priceType: 'standard', paymentType: 'order', status: 'active',
        },
      });
    } else {
      const updateData: any = {};
      if (!client.profileImage && data.profileImage) updateData.profileImage = data.profileImage;
      if (!client.email && data.email) updateData.email = data.email;
      if (Object.keys(updateData).length > 0) {
        client = await this.prisma.client.update({ where: { id: client.id }, data: updateData });
      }
    }

    return { ...client, _isNew: isNew };
  }

  /** 로그인 전용 모드에서 자동 생성된 신규 회원을 롤백 */
  async rollbackNewClient(clientId: string) {
    try {
      await this.prisma.client.delete({ where: { id: clientId } });
    } catch (e: any) {
      this.logger.warn(`Failed to rollback client ${clientId}: ${e.message}`);
    }
  }

  async loginClient(client: any, rememberMe: boolean = false, ip?: string) {
    await this.prisma.client.update({
      where: { id: client.id },
      data: { lastLoginAt: new Date(), ...(ip && { lastLoginIp: ip }) },
    });

    const payload = { sub: client.id, email: client.email, role: 'client', type: 'client', clientId: client.id };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: rememberMe ? '30d' : '7d' });

    return {
      accessToken, refreshToken,
      user: {
        id: client.id, email: client.email, name: client.clientName, role: 'client',
        clientId: client.id, clientName: client.clientName, mobile: client.mobile,
        businessNumber: client.businessNumber, representative: client.representative,
        address: client.address, addressDetail: client.addressDetail, contactPerson: client.contactPerson,
        enableSchedule: client.enableSchedule ?? true, enableRecruitment: client.enableRecruitment ?? true,
      },
    };
  }

  // ========== 관리자 대리 로그인 ==========

  async impersonateStaff(targetStaffId: string, adminStaffId: string) {
    const adminStaff = await this.prisma.staff.findUnique({ where: { id: adminStaffId } });
    if (!adminStaff || !adminStaff.isActive) {
      throw new ForbiddenException('활성 직원만 대리 로그인할 수 있습니다');
    }
    if (!adminStaff.isSuperAdmin) {
      throw new ForbiddenException('최고관리자만 대리 로그인할 수 있습니다');
    }

    const targetStaff = await this.prisma.staff.findUnique({
      where: { id: targetStaffId },
      include: { branch: true, department: true },
    });

    if (!targetStaff) throw new BadRequestException('직원을 찾을 수 없습니다');
    if (!targetStaff.isActive) throw new BadRequestException('비활성 직원은 대리 로그인할 수 없습니다');

    const payload = {
      sub: targetStaff.id, staffId: targetStaff.staffId, name: targetStaff.name,
      role: 'admin', type: 'staff', branchId: targetStaff.branchId,
      departmentId: targetStaff.departmentId, impersonatedBy: adminStaffId,
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
      user: {
        id: targetStaff.id, staffId: targetStaff.staffId, name: targetStaff.name,
        role: 'admin', email: targetStaff.email, branch: targetStaff.branch, department: targetStaff.department,
        isSuperAdmin: targetStaff.isSuperAdmin ?? false,
        canEditMemberInfo: targetStaff.canEditMemberInfo ?? false,
        profileImage: targetStaff.profileImage,
        menuPermissions: (targetStaff.menuPermissions as Record<string, boolean>) ?? {},
      },
      impersonated: true,
    };
  }

  // ========== 고객 이메일/PW 로그인 ==========

  async loginClientWithPassword(loginId: string, password: string, ip?: string) {
    const client = await this.prisma.client.findFirst({
      where: { email: loginId },
    });

    if (!client) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다');
    }

    if (!client.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다. 소셜 로그인을 이용해주세요.');
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다');
    }

    if (client.status !== 'active') {
      throw new UnauthorizedException('비활성 계정입니다');
    }

    // 소속(employment)이 있으면 컨텍스트 선택 필요
    const employments = await this.getActiveEmployments(client.id);
    if (employments.length > 0) {
      const tempToken = this.generateTempAuthToken(client);
      return { needsContext: true, tempToken };
    }

    return this.loginClient(client, false, ip);
  }

  async checkLoginIdAvailable(loginId: string) {
    if (!loginId || loginId.length < 4) {
      throw new BadRequestException('아이디는 4자 이상이어야 합니다');
    }

    const existing = await this.prisma.client.findFirst({
      where: { email: loginId },
    });

    return { available: !existing };
  }

  async registerClientWithPassword(
    loginId: string,
    password: string,
    name: string,
    contactEmail: string,
    verificationId?: string,
    phone?: string,
  ) {
    // 이메일 인증 확인 (verificationId가 있을 때만)
    if (verificationId) {
      const verification = await this.prisma.emailVerification.findUnique({
        where: { id: verificationId },
      });
      if (!verification || !verification.verified || verification.email !== contactEmail) {
        throw new BadRequestException('이메일 인증이 완료되지 않았습니다');
      }
      if (verification.expiresAt < new Date()) {
        throw new BadRequestException('인증이 만료되었습니다. 다시 인증해주세요');
      }
    }

    // 아이디 중복 확인
    const existing = await this.prisma.client.findFirst({
      where: { email: loginId },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const clientCode = `P${Date.now().toString().slice(-8)}`;

    await this.prisma.client.create({
      data: {
        clientCode,
        clientName: name,
        email: loginId,
        password: hashedPassword,
        contactEmail,
        mobile: phone || undefined,
        memberType: 'individual',
        priceType: 'standard',
        paymentType: 'order',
        status: 'active',
      },
    });

    // 사용된 인증 레코드 삭제
    if (verificationId) {
      await this.prisma.emailVerification.delete({ where: { id: verificationId } }).catch(() => {});
    }

    return { success: true, message: '회원가입이 완료되었습니다' };
  }

  // ========== 이메일 인증 ==========

  async sendEmailVerification(email: string) {
    // 1분 이내 동일 이메일 요청 확인 (스팸 방지)
    const recent = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new BadRequestException('1분 후에 다시 시도해주세요');
    }

    // 6자리 인증코드 생성
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3분

    await this.prisma.emailVerification.create({
      data: { email, code, expiresAt },
    });

    // 이메일 발송
    const result = await this.emailService.sendEmail({
      to: email,
      subject: '[Printing114] 회원가입 인증코드',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #E4007F;">Printing114 인증코드</h2>
          <p>아래 인증코드를 입력해주세요.</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
          </div>
          <p style="color: #888; font-size: 13px;">이 코드는 3분 후 만료됩니다.</p>
        </div>
      `,
    });

    if (!result.success) {
      this.logger.warn(`이메일 발송 실패 (${email}): ${result.error}`);
    }

    this.logger.log(`[개발용] 이메일 인증코드 - ${email}: ${code}`);

    return { success: true, message: '인증코드가 발송되었습니다' };
  }

  async verifyEmailCode(email: string, code: string) {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      throw new BadRequestException('인증코드가 올바르지 않거나 만료되었습니다');
    }

    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    return { verified: true, verificationId: verification.id };
  }

  // ========== 직원 ID/PW 로그인 ==========

  // ========== 통합 비밀번호 변경 (staff/client 공용) ==========

  async changeCurrentUserPassword(
    userId: string,
    type: 'staff' | 'client',
    currentPassword: string,
    newPassword: string,
  ) {
    if (type === 'staff') {
      const staff = await this.prisma.staff.findUnique({ where: { id: userId } });
      if (!staff) throw new NotFoundException('직원을 찾을 수 없습니다');
      if (!staff.password) {
        throw new BadRequestException('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다');
      }
      const ok = await bcrypt.compare(currentPassword, staff.password);
      if (!ok) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');

      const hashed = await bcrypt.hash(newPassword, 10);
      await this.prisma.staff.update({ where: { id: userId }, data: { password: hashed } });
      return { success: true, message: '비밀번호가 변경되었습니다' };
    }

    if (type === 'client') {
      const client = await this.prisma.client.findUnique({ where: { id: userId } });
      if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');
      if (!client.password) {
        throw new BadRequestException('소셜 로그인 계정은 비밀번호를 변경할 수 없습니다');
      }
      const ok = await bcrypt.compare(currentPassword, client.password);
      if (!ok) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다');

      const hashed = await bcrypt.hash(newPassword, 10);
      await this.prisma.client.update({ where: { id: userId }, data: { password: hashed } });
      return { success: true, message: '비밀번호가 변경되었습니다' };
    }

    throw new BadRequestException('지원하지 않는 사용자 유형입니다');
  }

  async loginStaffWithPassword(staffId: string, password: string, ip?: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { staffId },
    });

    if (!staff) {
      throw new UnauthorizedException('직원 ID 또는 비밀번호가 올바르지 않습니다');
    }

    if (!staff.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다. 소셜 로그인을 이용해주세요.');
    }

    const isValid = await bcrypt.compare(password, staff.password);
    if (!isValid) {
      throw new UnauthorizedException('직원 ID 또는 비밀번호가 올바르지 않습니다');
    }

    if (staff.status !== 'active' || !staff.isActive) {
      throw new UnauthorizedException('비활성 계정입니다');
    }

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date(), ...(ip && { lastLoginIp: ip }) },
    });

    const payload = {
      sub: staff.id, staffId: staff.staffId, name: staff.name,
      role: 'admin', type: 'staff', branchId: staff.branchId, departmentId: staff.departmentId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: {
        id: staff.id, staffId: staff.staffId, name: staff.name, role: 'admin',
        email: staff.companyEmail || staff.email, isSuperAdmin: staff.isSuperAdmin ?? false,
        canEditMemberInfo: staff.canEditMemberInfo ?? false,
        profileImage: staff.profileImage,
        menuPermissions: (staff.menuPermissions as Record<string, boolean>) ?? {},
      },
    };
  }

  // ========== 직원 소셜 로그인 ==========

  async validateStaffOAuth(data: {
    oauthProvider: string; oauthId: string; email: string; name: string; profileImage?: string;
    gender?: string; birthday?: string; birthyear?: string; mobile?: string;
  }): Promise<{ staff: any; isNew: boolean }> {
    let staff = await this.prisma.staff.findFirst({
      where: { oauthProvider: data.oauthProvider, oauthId: data.oauthId },
    });

    if (staff) {
      if (staff.status === 'rejected') throw new UnauthorizedException('가입 거절된 계정입니다');
      if (staff.status === 'suspended') throw new UnauthorizedException('정지된 계정입니다');
      return { staff, isNew: false };
    }

    staff = await this.prisma.staff.create({
      data: {
        name: data.name, email: data.email, companyEmail: data.email,
        oauthProvider: data.oauthProvider, oauthId: data.oauthId, profileImage: data.profileImage,
        status: 'pending', role: 'employee', isActive: false, canLoginAsManager: false,
      },
    });

    return { staff, isNew: true };
  }

  async loginStaffOAuth(staff: any, ip?: string) {
    if (staff.status === 'pending') {
      return { status: 'pending', message: '가입 승인 대기 중입니다. 관리자에게 문의하세요.', staffId: staff.id };
    }

    if (staff.status !== 'active' || !staff.isActive) {
      throw new UnauthorizedException('비활성 계정입니다');
    }

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date(), ...(ip && { lastLoginIp: ip }) },
    });

    const payload = {
      sub: staff.id, staffId: staff.staffId, name: staff.name,
      role: 'admin', type: 'staff', branchId: staff.branchId, departmentId: staff.departmentId,
    };

    return {
      status: 'active',
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '30d' }),
      user: {
        id: staff.id, staffId: staff.staffId, name: staff.name, role: 'admin',
        email: staff.companyEmail || staff.email, isSuperAdmin: staff.isSuperAdmin ?? false,
        canEditMemberInfo: staff.canEditMemberInfo ?? false,
        profileImage: staff.profileImage,
        menuPermissions: (staff.menuPermissions as Record<string, boolean>) ?? {},
      },
    };
  }

  async registerStaffCompanyEmail(staffId: string, companyEmail: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('직원을 찾을 수 없습니다');
    if (staff.status !== 'pending') throw new BadRequestException('이미 처리된 가입 요청입니다');
    await this.prisma.staff.update({ where: { id: staffId }, data: { companyEmail } });
    return { success: true, message: '회사 이메일이 등록되었습니다. 관리자 승인을 기다려주세요.' };
  }

  async getPendingStaff() {
    return this.prisma.staff.findMany({
      where: { status: 'pending' },
      select: {
        id: true, name: true, email: true, companyEmail: true,
        oauthProvider: true, profileImage: true, status: true, role: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveStaff(staffId: string, adminId: string, role: string = 'employee') {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('직원을 찾을 수 없습니다');
    if (staff.status !== 'pending') throw new BadRequestException('승인 대기 상태가 아닙니다');
    if (!['admin', 'employee'].includes(role)) throw new BadRequestException('유효하지 않은 역할입니다');

    return this.prisma.staff.update({
      where: { id: staffId },
      data: { status: 'active', isActive: true, canLoginAsManager: true, role, isSuperAdmin: false, approvedBy: adminId, approvedAt: new Date() },
    });
  }

  async rejectStaff(staffId: string, adminId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('직원을 찾을 수 없습니다');
    if (staff.status !== 'pending') throw new BadRequestException('승인 대기 상태가 아닙니다');
    return this.prisma.staff.update({
      where: { id: staffId },
      data: { status: 'rejected', approvedBy: adminId, approvedAt: new Date() },
    });
  }

  async suspendStaff(staffId: string, adminId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('직원을 찾을 수 없습니다');
    return this.prisma.staff.update({
      where: { id: staffId },
      data: { status: 'suspended', isActive: false, approvedBy: adminId, approvedAt: new Date() },
    });
  }

  async changeStaffRole(staffId: string, adminId: string, role: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) throw new NotFoundException('직원을 찾을 수 없습니다');
    if (!['super_admin', 'admin', 'employee'].includes(role)) throw new BadRequestException('유효하지 않은 역할입니다');
    return this.prisma.staff.update({
      where: { id: staffId },
      data: { role, isSuperAdmin: role === 'super_admin' },
    });
  }

  // ========== 컨텍스트 선택 ==========

  async getActiveEmployments(clientId: string) {
    const employments = await this.prisma.employment.findMany({
      where: { memberClientId: clientId, status: 'ACTIVE' },
      include: {
        company: { select: { id: true, clientName: true, clientCode: true, status: true } },
      },
    });
    return employments.filter((e) => e.company.status === 'active');
  }

  generateTempAuthToken(client: any): string {
    return this.jwtService.sign(
      { sub: client.id, email: client.email, purpose: 'context-selection' },
      { expiresIn: '5m' },
    );
  }

  async getContextsFromTempToken(tempToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    if (payload.purpose !== 'context-selection') throw new UnauthorizedException('유효하지 않은 토큰입니다.');

    const client = await this.prisma.client.findUnique({ where: { id: payload.sub } });
    if (!client || client.status !== 'active') throw new UnauthorizedException('비활성 계정입니다.');

    const employments = await this.getActiveEmployments(client.id);
    const hasOwnerEmployment = employments.some((e: any) => e.memberClientId === e.companyClientId);

    const employeeContexts = employments.map((e: any) => ({
      type: 'employee', employmentId: e.id, companyClientId: e.companyClientId,
      companyName: e.company.clientName, clientName: client.clientName,
      role: e.role, isOwner: e.memberClientId === e.companyClientId,
    }));

    return {
      email: client.email,
      contexts: [
        ...(!hasOwnerEmployment ? [{ type: 'personal', label: '내 계정', clientName: client.clientName, clientId: client.id }] : []),
        ...employeeContexts,
      ],
    };
  }

  async loginWithContext(tempToken: string, contextType: string, employmentId?: string, rememberMe?: boolean, ip?: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }
    if (payload.purpose !== 'context-selection') throw new UnauthorizedException('유효하지 않은 토큰입니다.');

    const client = await this.prisma.client.findUnique({ where: { id: payload.sub } });
    if (!client || client.status !== 'active') throw new UnauthorizedException('비활성 계정입니다.');

    if (contextType === 'personal') {
      return this.loginClient(client, rememberMe ?? false, ip);
    }

    if (!employmentId) throw new BadRequestException('employmentId가 필요합니다.');

    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: { company: { select: { id: true, clientName: true, clientCode: true, enableSchedule: true, enableRecruitment: true } } },
    });

    if (!employment || employment.memberClientId !== client.id || employment.status !== 'ACTIVE') {
      throw new UnauthorizedException('유효하지 않은 선택입니다.');
    }

    return this.loginEmployeeAsClient(client, employment, rememberMe ?? false, ip);
  }

  async loginEmployeeAsClient(client: any, employment: any, rememberMe: boolean = false, ip?: string) {
    await this.prisma.client.update({
      where: { id: client.id },
      data: { lastLoginAt: new Date(), ...(ip && { lastLoginIp: ip }) },
    });

    const payload = {
      sub: client.id, email: client.email, type: 'employee', role: employment.role,
      clientId: employment.companyClientId, employmentId: employment.id,
      canViewAllOrders: employment.canViewAllOrders, canManageProducts: employment.canManageProducts,
      canViewSettlement: employment.canViewSettlement,
      canManageSchedule: employment.canManageSchedule, canManageRecruitment: employment.canManageRecruitment,
      enableSchedule: employment.company.enableSchedule, enableRecruitment: employment.company.enableRecruitment,
    };

    const isOwner = employment.memberClientId === employment.companyClientId;

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: rememberMe ? '30d' : '7d' }),
      user: {
        id: client.id, email: client.email, name: client.clientName,
        role: employment.role, type: 'employee', clientId: employment.companyClientId,
        clientName: employment.company.clientName, employmentId: employment.id,
        employeeRole: employment.role, isOwner,
        canViewAllOrders: employment.canViewAllOrders, canManageProducts: employment.canManageProducts,
        canViewSettlement: employment.canViewSettlement,
        canManageSchedule: employment.canManageSchedule, canManageRecruitment: employment.canManageRecruitment,
        enableSchedule: employment.company.enableSchedule, enableRecruitment: employment.company.enableRecruitment,
      },
    };
  }

  async impersonateEmployee(targetEmploymentId: string, requestorSub: string, requestorClientId: string) {
    // 요청자의 employment 확인 (최고관리자인지)
    const requestorEmployment = await this.prisma.employment.findFirst({
      where: { companyClientId: requestorClientId, memberClientId: requestorSub, status: 'ACTIVE' },
    });
    if (!requestorEmployment || requestorEmployment.memberClientId !== requestorEmployment.companyClientId) {
      throw new ForbiddenException('최고관리자만 대리 로그인할 수 있습니다');
    }

    // 대상 employment 조회
    const targetEmployment = await this.prisma.employment.findUnique({
      where: { id: targetEmploymentId },
      include: { member: true, company: true },
    });
    if (!targetEmployment) throw new BadRequestException('직원을 찾을 수 없습니다');
    if (targetEmployment.companyClientId !== requestorClientId) {
      throw new ForbiddenException('같은 거래처 직원만 대리 로그인할 수 있습니다');
    }
    if (targetEmployment.status !== 'ACTIVE') throw new BadRequestException('비활성 직원은 대리 로그인할 수 없습니다');
    if (targetEmployment.memberClientId === targetEmployment.companyClientId) {
      throw new BadRequestException('최고관리자 계정은 대리 로그인 대상이 아닙니다');
    }

    const client = targetEmployment.member;
    const payload = {
      sub: client.id, email: client.email, type: 'employee', role: targetEmployment.role,
      clientId: targetEmployment.companyClientId, employmentId: targetEmployment.id,
      canViewAllOrders: targetEmployment.canViewAllOrders, canManageProducts: targetEmployment.canManageProducts,
      canViewSettlement: targetEmployment.canViewSettlement,
      canManageSchedule: targetEmployment.canManageSchedule, canManageRecruitment: targetEmployment.canManageRecruitment,
      enableSchedule: targetEmployment.company.enableSchedule, enableRecruitment: targetEmployment.company.enableRecruitment,
      impersonatedBy: requestorSub,
    };

    const isOwner = targetEmployment.memberClientId === targetEmployment.companyClientId;

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
      user: {
        id: client.id, email: client.email, name: client.clientName,
        role: targetEmployment.role, type: 'employee', clientId: targetEmployment.companyClientId,
        clientName: targetEmployment.company.clientName, employmentId: targetEmployment.id,
        employeeRole: targetEmployment.role, isOwner,
        canViewAllOrders: targetEmployment.canViewAllOrders, canManageProducts: targetEmployment.canManageProducts,
        canViewSettlement: targetEmployment.canViewSettlement,
        canManageSchedule: targetEmployment.canManageSchedule, canManageRecruitment: targetEmployment.canManageRecruitment,
        enableSchedule: targetEmployment.company.enableSchedule, enableRecruitment: targetEmployment.company.enableRecruitment,
      },
      impersonated: true,
    };
  }

  async impersonateClient(clientId: string, adminId: string) {
    const adminStaff = await this.prisma.staff.findUnique({ where: { id: adminId } });
    if (!adminStaff || !adminStaff.isActive) {
      throw new ForbiddenException('활성 직원만 대리 로그인할 수 있습니다');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { group: true },
    });

    if (!client) throw new BadRequestException('회원을 찾을 수 없습니다');
    if (client.status !== 'active') throw new BadRequestException('비활성 회원은 대리 로그인할 수 없습니다');

    const payload = { sub: client.id, email: client.email, role: 'client', type: 'client', clientId: client.id, impersonatedBy: adminId };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '1h' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '1h' }),
      user: {
        id: client.id, email: client.email, name: client.clientName, role: 'client',
        clientId: client.id, clientName: client.clientName, clientCode: client.clientCode,
        mobile: client.mobile, businessNumber: client.businessNumber, representative: client.representative,
        address: client.address, addressDetail: client.addressDetail, contactPerson: client.contactPerson,
        group: client.group,
      },
      impersonated: true,
    };
  }

  // ========== 관리자 회원 비밀번호 초기화 ==========

  async resetClientPassword(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');

    const hashedPassword = await bcrypt.hash('1111', 10);
    await this.prisma.client.update({
      where: { id: clientId },
      data: { password: hashedPassword },
    });

    return { success: true, message: '비밀번호가 1111로 초기화되었습니다' };
  }
}
