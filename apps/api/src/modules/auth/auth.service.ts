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

        const newPayload: Record<string, any> = {
          sub: staff.id,
          staffId: staff.staffId,
          name: staff.name,
          role: 'admin',
          type: 'staff',
          branchId: staff.branchId,
          departmentId: staff.departmentId,
          aud: 'staff',
        };
        if (payload.impersonatedBy) {
          newPayload.impersonatedBy = payload.impersonatedBy;
        }

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

        const newPayload: Record<string, any> = {
          sub: client.id,
          email: client.email,
          role: 'client',
          type: 'client',
          aud: 'client',
        };
        if (payload.impersonatedBy) {
          newPayload.impersonatedBy = payload.impersonatedBy;
        }

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

        const newPayload: Record<string, any> = {
          sub: client.id,
          email: client.email,
          type: 'employee',
          role: employment.role,
          clientId: employment.companyClientId,
          employmentId: employment.id,
          canViewAllOrders: employment.canViewAllOrders,
          canManageProducts: employment.canManageProducts,
          canViewSettlement: employment.canViewSettlement,
          aud: 'client',
        };
        if (payload.impersonatedBy) {
          newPayload.impersonatedBy = payload.impersonatedBy;
        }

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
        select: { id: true, email: true, clientName: true, businessNumber: true, representative: true, address: true, addressDetail: true, contactPerson: true, mobile: true, enableSchedule: true, enableRecruitment: true, enableShooting: true, enableNote: true },
      });
      if (!client) throw new UnauthorizedException('User not found');

      // 온보딩 완료 여부는 본인(=userId) 기준으로 별도 조회 (employee는 본인 Client.id가 곧 userId)
      const ownProfile = (await this.prisma.client.findUnique({
        where: { id: userId },
        select: { profileCompletedAt: true } as any,
      })) as any;

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
        enableSchedule: client.enableSchedule ?? false,
        enableRecruitment: client.enableRecruitment ?? false,
        enableShooting: client.enableShooting ?? false,
        enableNote: client.enableNote ?? false,
        profileCompletedAt: ownProfile?.profileCompletedAt ?? null,
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

  // ========== UI 환경설정 (핀 메뉴 / 레이아웃 모드) ==========

  async getStaffPreferences(userId: string, type?: string) {
    if (type !== 'staff') {
      // 비-스태프(클라이언트/회원)는 기본값만 반환
      return { pinnedMenus: [], layoutMode: 'top' as const };
    }
    const staff = await this.prisma.staff.findUnique({
      where: { id: userId },
      select: { pinnedMenus: true, layoutMode: true },
    } as any);
    if (!staff) {
      throw new UnauthorizedException('Staff not found');
    }
    const s = staff as any;
    return {
      pinnedMenus: (s.pinnedMenus as string[]) ?? [],
      layoutMode: ((s.layoutMode as string) ?? 'top') as 'top' | 'side',
    };
  }

  async updateStaffPreferences(
    userId: string,
    type: string | undefined,
    dto: { pinnedMenus?: string[]; layoutMode?: 'top' | 'side' },
  ) {
    if (type !== 'staff') {
      throw new ForbiddenException('Only staff can update preferences');
    }
    const data: any = {};
    if (Array.isArray(dto.pinnedMenus)) {
      // href 형식 검증: '/' 시작, 200자 미만, 최대 30개
      const cleaned = dto.pinnedMenus
        .filter((h) => typeof h === 'string' && h.startsWith('/') && h.length < 200)
        .slice(0, 30);
      data.pinnedMenus = cleaned;
    }
    if (dto.layoutMode === 'top' || dto.layoutMode === 'side') {
      data.layoutMode = dto.layoutMode;
    }
    if (Object.keys(data).length === 0) {
      return this.getStaffPreferences(userId, type);
    }
    await this.prisma.staff.update({
      where: { id: userId },
      data,
    } as any);
    return this.getStaffPreferences(userId, type);
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

  private async checkEmailDuplicate(
    email: string,
    currentProvider: string,
  ): Promise<{ provider: string | null; date: string; isLegacy: boolean } | null> {
    if (!email) return null; // 이메일 없으면 검사 불가 (정상 흐름은 strategy 단계에서 차단됨)

    const existing = await this.prisma.client.findFirst({
      where: {
        email,
        OR: [
          { oauthProvider: { not: currentProvider } },
          { oauthProvider: null }, // 일반 아이디 가입 회원도 충돌 대상
        ],
      },
      select: { oauthProvider: true, createdAt: true },
    });

    if (existing) {
      return {
        provider: existing.oauthProvider, // null = 일반 가입
        date: existing.createdAt.toISOString().split('T')[0],
        isLegacy: existing.oauthProvider === null,
      };
    }
    return null;
  }

  async validateNaverUser(data: {
    oauthId: string; email?: string; name: string;
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
      if (data.email) {
        const dup = await this.checkEmailDuplicate(data.email, 'naver');
        if (dup) {
          return {
            _emailDuplicate: true,
            _dupProvider: dup.provider,
            _dupDate: dup.date,
            _dupIsLegacy: dup.isLegacy,
          } as any;
        }
      }
      isNew = true;
      const clientCode = `N${Date.now().toString().slice(-8)}`;
      client = await this.prisma.client.create({
        data: {
          clientCode, clientName: data.name, ...(data.email && { email: data.email }),
          oauthProvider: 'naver', oauthId: data.oauthId, profileImage: data.profileImage,
          gender, birthday, ...(mobile && { mobile }),
          memberType: 'individual', priceType: 'standard', paymentType: 'order', status: 'active',
          // 네이버는 가입 시 이메일 소유를 검증하므로 별도 링크 인증 불필요
          emailVerified: true,
        } as any,
      });
    } else {
      const updateData: any = {};
      if (!client.profileImage && data.profileImage) updateData.profileImage = data.profileImage;
      if (!client.gender && gender) updateData.gender = gender;
      if (!client.birthday && birthday) updateData.birthday = birthday;
      if (!client.mobile && mobile) updateData.mobile = mobile;
      // email이 없거나 이전 fake 패턴이면 실제(네이버 검증) 이메일로 갱신
      if (data.email && (!client.email || client.email.startsWith('naver_'))) {
        updateData.email = data.email;
        // 과거 가입자(인증 메일 대기 상태) 자동 해소: 네이버 검증 이메일은 인증 완료 처리
        if (!(client as any).emailVerified) {
          updateData.emailVerified = true;
          updateData.emailVerifyToken = null;
          updateData.emailVerifyTokenExpiry = null;
        }
      }
      if (Object.keys(updateData).length > 0) {
        client = await this.prisma.client.update({ where: { id: client.id }, data: updateData });
      }
    }

    return { ...client, _isNew: isNew };
  }

  async validateKakaoUser(data: {
    oauthId: string; email?: string; name: string;
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
      if (data.email) {
        const dup = await this.checkEmailDuplicate(data.email, 'kakao');
        if (dup) {
          return {
            _emailDuplicate: true,
            _dupProvider: dup.provider,
            _dupDate: dup.date,
            _dupIsLegacy: dup.isLegacy,
          } as any;
        }
      }
      isNew = true;
      const clientCode = `K${Date.now().toString().slice(-8)}`;
      client = await this.prisma.client.create({
        data: {
          clientCode, clientName: data.name, ...(data.email && { email: data.email }),
          oauthProvider: 'kakao', oauthId: data.oauthId, profileImage: data.profileImage,
          gender, birthday, ...(mobile && { mobile }),
          memberType: 'individual', priceType: 'standard', paymentType: 'order', status: 'active',
          // 카카오 OAuth 로 받은 이메일은 카카오가 검증한 값이므로 별도 링크 인증 불필요
          // (실제 이메일 동의를 안 한 경우는 kakao_xxx@kakao.com 가짜값 → 온보딩에서 실제 이메일 입력 유도)
          emailVerified: true,
        } as any,
      });
    } else {
      const updateData: any = {};
      if (!client.profileImage && data.profileImage) updateData.profileImage = data.profileImage;
      if (!client.gender && gender) updateData.gender = gender;
      if (!client.birthday && birthday) updateData.birthday = birthday;
      if (!client.mobile && mobile) updateData.mobile = mobile;
      // email이 없거나 이전 fake 패턴이면 실제(카카오 검증) 이메일로 갱신
      if (data.email && (!client.email || client.email.startsWith('kakao_'))) {
        updateData.email = data.email;
        if (!(client as any).emailVerified) {
          updateData.emailVerified = true;
          updateData.emailVerifyToken = null;
          updateData.emailVerifyTokenExpiry = null;
        }
      }
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
        return {
          _emailDuplicate: true,
          _dupProvider: dup.provider,
          _dupDate: dup.date,
          _dupIsLegacy: dup.isLegacy,
        } as any;
      }
      isNew = true;
      const clientCode = `G${Date.now().toString().slice(-8)}`;
      client = await this.prisma.client.create({
        data: {
          clientCode, clientName: data.name, email: data.email,
          oauthProvider: 'google', oauthId: data.oauthId, profileImage: data.profileImage,
          memberType: 'individual', priceType: 'standard', paymentType: 'order', status: 'active',
          // Google 은 가입 시 이메일 소유를 검증하므로 별도 링크 인증 불필요
          emailVerified: true,
        } as any,
      });
    } else {
      const updateData: any = {};
      if (!client.profileImage && data.profileImage) updateData.profileImage = data.profileImage;
      if (!client.email && data.email) updateData.email = data.email;
      if (!(client as any).emailVerified) {
        updateData.emailVerified = true;
        updateData.emailVerifyToken = null;
        updateData.emailVerifyTokenExpiry = null;
      }
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

    const payload = { sub: client.id, email: client.email, role: 'client', type: 'client', clientId: client.id, aud: 'client' };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: rememberMe ? '30d' : '7d' });

    return {
      accessToken, refreshToken,
      user: {
        id: client.id, email: client.email, name: client.clientName, role: 'client', type: 'client',
        clientId: client.id, clientName: client.clientName, mobile: client.mobile,
        businessNumber: client.businessNumber, representative: client.representative,
        address: client.address, addressDetail: client.addressDetail, contactPerson: client.contactPerson,
        enableSchedule: client.enableSchedule ?? false, enableRecruitment: client.enableRecruitment ?? false, enableShooting: client.enableShooting ?? false,
        enableNote: client.enableNote ?? false,
        oauthProvider: client.oauthProvider ?? null,
      },
    };
  }

  // ========== 보안 감사 로그 (SecurityLog) ==========

  /**
   * SecurityLog 에 보안 이벤트를 기록한다. 실패해도 본 흐름을 막지 않는다(catch + log).
   * 사용처: 대리로그인 시작/종료/거부, 향후 로그인 실패·2FA 등.
   */
  async logSecurityEvent(input: {
    eventType: string;
    severity?: 'info' | 'warn' | 'critical';
    userId?: string | null;
    userType?: 'staff' | 'client' | 'employee' | 'unknown';
    loginId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    message?: string;
  }): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          eventType: input.eventType,
          severity: input.severity ?? 'info',
          userId: input.userId ?? undefined,
          userType: input.userType ?? undefined,
          loginId: input.loginId ?? undefined,
          ipAddress: input.ipAddress ?? undefined,
          userAgent: input.userAgent ?? undefined,
          metadata: (input.metadata ?? undefined) as any,
          message: input.message ?? undefined,
        },
      });
    } catch (err) {
      // 보안 로그 기록 실패가 비즈니스 흐름을 막지 않도록 swallow
      // 운영 환경에서는 Sentry 등 외부 모니터링으로 감지
    }
  }

  // ========== 관리자 대리 로그인 ==========

  async impersonateStaff(
    targetStaffId: string,
    adminStaffId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
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
      aud: 'staff',
    };

    await this.logSecurityEvent({
      eventType: 'impersonate_start_staff',
      severity: 'info',
      userId: adminStaffId,
      userType: 'staff',
      ipAddress,
      userAgent,
      metadata: { targetStaffId: targetStaff.id, targetLoginId: targetStaff.staffId },
      message: '관리자가 직원으로 대리 로그인',
    });

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

    // 이메일 링크 인증 필수 (최초 로그인 전)
    if (!(client as any).emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: '이메일 인증이 필요합니다. 가입 시 받은 인증 메일을 확인해 주세요.',
        email: this.maskEmail(client.contactEmail || client.email || ''),
      });
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
    phone?: string,
    emailConsent?: boolean,
  ) {
    if (!emailConsent) {
      throw new BadRequestException('이메일 수신 동의가 필요합니다');
    }

    // 아이디 중복 확인
    const existing = await this.prisma.client.findFirst({
      where: { email: loginId },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 아이디입니다');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const clientCode = `P${Date.now().toString().slice(-8)}`;
    const token = crypto.randomBytes(32).toString('hex');

    const client = await this.prisma.client.create({
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
        emailVerified: false,
        emailVerifyToken: token,
        emailVerifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailConsentAt: new Date(),
      } as any,
    });

    // 인증 메일 발송 (실패해도 가입은 완료 처리)
    await this.sendVerificationEmail(client);

    return {
      success: true,
      message: '회원가입이 완료되었습니다. 이메일로 발송된 인증 링크를 클릭해 인증을 완료해 주세요.',
      requiresEmailVerification: true,
    };
  }

  // ========== 이메일 링크 인증 ==========

  private maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email || '';
    const [local, domain] = email.split('@');
    if (local.length <= 1) return `${local}***@${domain}`;
    return `${local[0]}***@${domain}`;
  }

  /** 클라이언트에 emailVerifyToken을 보장(없으면 새로 발급+저장)하고 인증 메일을 발송한다. 실패해도 throw 하지 않는다. */
  private async sendVerificationEmail(client: any): Promise<void> {
    try {
      let token = client.emailVerifyToken as string | null;
      if (!token) {
        token = crypto.randomBytes(32).toString('hex');
        await this.prisma.client.update({
          where: { id: client.id },
          data: {
            emailVerifyToken: token,
            emailVerifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
          } as any,
        });
      }
      const to = client.contactEmail || client.email;
      if (!to || this.isFakeProviderEmail(to)) {
        this.logger.warn(`이메일 인증 메일 발송 스킵: client ${client.id}에 실제 이메일이 없습니다 (to=${to})`);
        return;
      }
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const link = `${baseUrl}/verify-email?token=${token}`;
      const name = client.clientName || '회원';
      const html = `
        <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
          <h2 style="margin: 0 0 16px;">이메일 인증을 완료해 주세요</h2>
          <p style="line-height: 1.6;">${name}님, Photocafe 회원가입을 환영합니다.<br/>
          아래 버튼을 눌러 이메일 인증을 완료하시면 로그인하실 수 있습니다.</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: #E4007F; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold;">이메일 인증하기</a>
          </div>
          <p style="font-size: 13px; color: #888; line-height: 1.6;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저에 붙여넣어 주세요.<br/>
          <a href="${link}" style="color: #555;">${link}</a></p>
          <p style="font-size: 13px; color: #888;">이 링크는 24시간 동안 유효합니다.</p>
        </div>
      `;
      const text = `${name}님, Photocafe 회원가입을 환영합니다.\n아래 링크를 눌러 이메일 인증을 완료해 주세요. (24시간 유효)\n${link}`;
      const result = await this.emailService.sendEmail({
        to,
        subject: '[Photocafe] 이메일 인증을 완료해 주세요',
        html,
        text,
      });
      if (!result.success) {
        this.logger.warn(`이메일 인증 메일 발송 실패 (${to}): ${result.error}`);
      }
    } catch (e: any) {
      this.logger.warn(`이메일 인증 메일 발송 중 오류: ${e?.message}`);
    }
  }

  /** 소셜 로그인이 자동 생성한 가짜 이메일 패턴 감지 (kakao_XXXX@kakao.com, naver_XXXX@naver.com, google_XXXX@gmail.com) */
  private isFakeProviderEmail(email: string): boolean {
    return /^kakao_[a-z0-9_-]+@kakao\.com$/i.test(email)
      || /^naver_[a-z0-9_-]+@naver\.com$/i.test(email)
      || /^google_[a-z0-9_-]+@gmail\.com$/i.test(email);
  }

  /** OAuth 신규 가입자에 대해: 실제 contactEmail 있으면 토큰 발급+메일 발송, 없으면(가짜 이메일 포함) emailVerified=true로 통과.
   *  반환값: true = 여전히 인증 대기 중(실제 메일 발송됨), false = 인증 완료(가짜 이메일 자동 통과 또는 이미 인증) */
  private async issueEmailVerification(clientId: string): Promise<boolean> {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return false;
    if ((client as any).emailVerified) return false;
    // contactEmail(사용자가 직접 입력한 실제 이메일)이 없거나, email이 소셜 로그인 가짜 이메일이면 인증 우회
    const verifyTarget = client.contactEmail || client.email;
    if (!verifyTarget || this.isFakeProviderEmail(verifyTarget)) {
      await this.prisma.client.update({
        where: { id: clientId },
        data: { emailVerified: true } as any,
      });
      return false; // 자동 통과 → 인증 대기 불필요
    }
    const token = crypto.randomBytes(32).toString('hex');
    const updated = await this.prisma.client.update({
      where: { id: clientId },
      data: {
        emailVerifyToken: token,
        emailVerifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as any,
    });
    await this.sendVerificationEmail(updated);
    return true; // 실제 메일 발송됨 → 인증 대기 필요
  }

  /** 컨트롤러 외부에서 호출 가능한 래퍼. 반환값: true = 인증 메일 발송됨(대기 필요), false = 자동 통과/이미 인증 */
  async ensureEmailVerificationIssued(clientId: string): Promise<boolean> {
    return this.issueEmailVerification(clientId);
  }

  async verifyEmailToken(token: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('유효하지 않거나 만료된 인증 링크입니다');
    }
    const client = await this.prisma.client.findFirst({
      where: { emailVerifyToken: token } as any,
    });
    if (!client) {
      throw new BadRequestException('유효하지 않거나 만료된 인증 링크입니다. 이미 인증되었거나 링크가 만료되었을 수 있습니다.');
    }
    const expiry = (client as any).emailVerifyTokenExpiry as Date | null;
    if (expiry && expiry.getTime() < Date.now()) {
      throw new BadRequestException('인증 링크가 만료되었습니다. 인증 메일을 다시 받아 주세요.');
    }
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiry: null,
      } as any,
    });
    return { success: true, email: this.maskEmail(client.contactEmail || client.email || '') };
  }

  async resendVerificationEmail(loginId: string, contactEmail?: string) {
    const client = await this.prisma.client.findFirst({ where: { email: loginId } });
    if (!client) {
      this.logger.log(`인증 메일 재발송 요청 - 존재하지 않는 아이디: ${loginId}`);
      return { success: true };
    }
    if ((client as any).emailVerified) {
      return { success: true, alreadyVerified: true };
    }
    const token = crypto.randomBytes(32).toString('hex');
    const updateData: any = {
      emailVerifyToken: token,
      emailVerifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    // 소셜 가입자가 실제 이메일을 입력한 경우 contactEmail 저장
    if (contactEmail && !this.isFakeProviderEmail(contactEmail)) {
      updateData.contactEmail = contactEmail;
    }
    const updated = await this.prisma.client.update({
      where: { id: client.id },
      data: updateData,
    });
    await this.sendVerificationEmail(updated);
    return { success: true };
  }

  // ========== 중복 확인 (가입 단계) ==========

  /** @ 앞 2자만 노출하고 나머지는 *로 마스킹. 비-이메일 문자열은 앞 2자 + *** */
  private maskLoginId(value: string): string {
    if (!value) return '';
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      const head = local.slice(0, 2);
      return `${head}${'*'.repeat(Math.max(local.length - head.length, 3))}@${domain}`;
    }
    const head = value.slice(0, 2);
    return `${head}${'*'.repeat(Math.max(value.length - head.length, 3))}`;
  }

  async checkDuplicate(field: 'mobile' | 'email', value: string) {
    const trimmed = (value || '').trim();
    if (!trimmed) return { exists: false };

    let client: any = null;
    if (field === 'mobile') {
      client = await this.prisma.client.findFirst({
        where: { mobile: trimmed, withdrawnAt: null } as any,
      });
    } else {
      client = await this.prisma.client.findFirst({
        where: {
          OR: [{ email: trimmed }, { contactEmail: trimmed }],
          withdrawnAt: null,
        } as any,
      });
    }

    if (!client) return { exists: false };

    // maskedLoginId: 매칭된 식별자(email 또는 contactEmail) 우선, 없으면 mobile/email
    let identifier: string =
      client.email && (field === 'mobile' || client.email === trimmed)
        ? client.email
        : client.contactEmail && client.contactEmail === trimmed
          ? client.contactEmail
          : client.email || client.contactEmail || trimmed;

    return {
      exists: true,
      hint: {
        maskedLoginId: this.maskLoginId(identifier),
        provider: (client.oauthProvider as string) || null,
        createdAt: (client.createdAt as Date)?.toISOString() ?? null,
      },
    };
  }

  // ========== 비밀번호 재설정 (이메일 링크 방식) ==========

  async forgotPassword(loginId: string) {
    const id = (loginId || '').trim();
    const masked = this.maskLoginId(id);
    const client = await this.prisma.client.findFirst({
      where: { email: id, withdrawnAt: null } as any,
    });

    // 존재 여부 노출 방지: 없어도 동일 응답 (단, 실제 발송 안 함)
    if (!client) {
      this.logger.log(`비밀번호 재설정 요청 - 존재하지 않는 아이디: ${id}`);
      return { sent: true, maskedEmail: masked };
    }

    const token = crypto.randomBytes(32).toString('hex');
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      } as any,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3002');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const name = client.clientName || '회원';
    const html = `
      <div style="font-family: 'Apple SD Gothic Neo', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #222;">
        <p style="line-height: 1.6;">안녕하세요, ${name}님. Photocafe입니다.</p>
        <p style="line-height: 1.6;">아래 버튼을 클릭하여 비밀번호를 재설정하세요. 링크는 1시간 동안 유효합니다.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #E4007F; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold;">비밀번호 재설정</a>
        </div>
        <p style="font-size: 13px; color: #888; line-height: 1.6;">버튼이 동작하지 않으면 아래 링크를 복사해 브라우저에 붙여넣어 주세요.<br/>
        <a href="${resetUrl}" style="color: #555;">${resetUrl}</a></p>
        <p style="font-size: 13px; color: #888;">본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.</p>
      </div>
    `;
    const text = `안녕하세요, ${name}님. Photocafe입니다.\n아래 링크를 클릭하여 비밀번호를 재설정하세요. (1시간 유효)\n${resetUrl}\n본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.`;
    const to = client.email || '';
    try {
      const result = await this.emailService.sendEmail({
        to,
        subject: '[Photocafe] 비밀번호 재설정',
        html,
        text,
      });
      if (!result.success) {
        this.logger.warn(`비밀번호 재설정 메일 발송 실패 (${to}): ${result.error}`);
      }
    } catch (e: any) {
      this.logger.warn(`비밀번호 재설정 메일 발송 중 오류: ${e?.message}`);
    }

    return { sent: true, maskedEmail: masked };
  }

  async resetClientPasswordByToken(token: string, newPassword: string) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('만료되었거나 잘못된 링크입니다.');
    }
    const client = await this.prisma.client.findFirst({
      where: { passwordResetToken: token, withdrawnAt: null } as any,
    });
    if (!client) {
      throw new BadRequestException('만료되었거나 잘못된 링크입니다.');
    }
    const expiry = (client as any).passwordResetTokenExpiry as Date | null;
    if (!expiry || expiry.getTime() < Date.now()) {
      throw new BadRequestException('만료되었거나 잘못된 링크입니다.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
        emailVerified: true,
      } as any,
    });

    return { success: true };
  }

  // ========== 이메일 인증 (코드 방식 - DEPRECATED, 사용 안 함) ==========

  /** @deprecated 가입폼 내 6자리 코드 인증 방식. 링크 인증(sendVerificationEmail/verifyEmailToken)으로 대체됨. */
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

  /** @deprecated 가입폼 내 6자리 코드 인증 방식. 링크 인증(verifyEmailToken)으로 대체됨. */
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

      const hashed = await bcrypt.hash(newPassword, 12);
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

      const hashed = await bcrypt.hash(newPassword, 12);
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

    // 접근 IP 제한 (allowedIps가 비어있으면 모든 IP 허용)
    if ((staff as any).allowedIps?.length > 0 && ip) {
      if (!(staff as any).allowedIps.includes(ip)) {
        throw new ForbiddenException(`허용되지 않은 IP 주소입니다. (${ip})`);
      }
    }

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date(), ...(ip && { lastLoginIp: ip }) },
    });

    const payload = {
      sub: staff.id, staffId: staff.staffId, name: staff.name,
      role: 'admin', type: 'staff', branchId: staff.branchId, departmentId: staff.departmentId,
      aud: 'staff',
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
      { expiresIn: '15m' },
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
      department: e.department || null,
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
      include: { company: { select: { id: true, clientName: true, clientCode: true, enableSchedule: true, enableRecruitment: true, enableShooting: true, enableNote: true } } },
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

    const isOwner = employment.memberClientId === employment.companyClientId;

    const payload = {
      sub: client.id, email: client.email, type: 'employee', role: employment.role,
      clientId: employment.companyClientId, employmentId: employment.id,
      isOwner,
      canViewAllOrders: employment.canViewAllOrders, canManageProducts: employment.canManageProducts,
      canViewSettlement: employment.canViewSettlement,
      canManageSchedule: employment.canManageSchedule, canManageRecruitment: employment.canManageRecruitment,
      enableSchedule: employment.company.enableSchedule, enableRecruitment: employment.company.enableRecruitment, enableShooting: employment.company.enableShooting, enableNote: employment.company.enableNote,
      aud: 'client',
    };

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
        enableSchedule: employment.company.enableSchedule, enableRecruitment: employment.company.enableRecruitment, enableShooting: employment.company.enableShooting, enableNote: employment.company.enableNote,
      },
    };
  }

  async impersonateEmployee(
    targetEmploymentId: string,
    requestorSub: string,
    requestorClientId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
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
    const isOwner = targetEmployment.memberClientId === targetEmployment.companyClientId;

    const payload = {
      sub: client.id, email: client.email, type: 'employee', role: targetEmployment.role,
      clientId: targetEmployment.companyClientId, employmentId: targetEmployment.id,
      isOwner,
      canViewAllOrders: targetEmployment.canViewAllOrders, canManageProducts: targetEmployment.canManageProducts,
      canViewSettlement: targetEmployment.canViewSettlement,
      canManageSchedule: targetEmployment.canManageSchedule, canManageRecruitment: targetEmployment.canManageRecruitment,
      enableSchedule: targetEmployment.company.enableSchedule, enableRecruitment: targetEmployment.company.enableRecruitment, enableShooting: targetEmployment.company.enableShooting, enableNote: targetEmployment.company.enableNote,
      impersonatedBy: requestorSub,
      aud: 'client',
    };

    await this.logSecurityEvent({
      eventType: 'impersonate_start_employee',
      severity: 'info',
      userId: requestorSub,
      userType: 'client',
      ipAddress,
      userAgent,
      metadata: {
        companyClientId: requestorClientId,
        targetEmploymentId: targetEmployment.id,
        targetMemberClientId: targetEmployment.memberClientId,
        targetRole: targetEmployment.role,
      },
      message: '거래처 owner 가 소속 직원으로 대리 로그인',
    });

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
        enableSchedule: targetEmployment.company.enableSchedule, enableRecruitment: targetEmployment.company.enableRecruitment, enableShooting: targetEmployment.company.enableShooting, enableNote: targetEmployment.company.enableNote,
      },
      impersonated: true,
    };
  }

  async impersonateClient(clientId: string, adminId: string, ipAddress?: string, userAgent?: string) {
    const adminStaff = await this.prisma.staff.findUnique({ where: { id: adminId } });
    if (!adminStaff || !adminStaff.isActive) {
      throw new ForbiddenException('활성 직원만 대리 로그인할 수 있습니다');
    }
    if (!adminStaff.isSuperAdmin) {
      throw new ForbiddenException('최고관리자만 회원 대리 로그인을 할 수 있습니다');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { group: true },
    });

    if (!client) throw new BadRequestException('회원을 찾을 수 없습니다');
    if (client.status !== 'active') throw new BadRequestException('비활성 회원은 대리 로그인할 수 없습니다');

    const payload = { sub: client.id, email: client.email, role: 'client', type: 'client', clientId: client.id, impersonatedBy: adminId, aud: 'client' };

    await this.logSecurityEvent({
      eventType: 'impersonate_start_client',
      severity: 'info',
      userId: adminId,
      userType: 'staff',
      ipAddress,
      userAgent,
      metadata: { targetClientId: client.id, targetClientCode: client.clientCode },
      message: '관리자가 회원으로 대리 로그인',
    });

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '1h' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '1h' }),
      user: {
        id: client.id, email: client.email, name: client.clientName, role: 'client', type: 'client',
        clientId: client.id, clientName: client.clientName, clientCode: client.clientCode,
        mobile: client.mobile, businessNumber: client.businessNumber, representative: client.representative,
        address: client.address, addressDetail: client.addressDetail, contactPerson: client.contactPerson,
        group: client.group,
        enableSchedule: client.enableSchedule ?? false,
        enableRecruitment: client.enableRecruitment ?? false,
        enableShooting: client.enableShooting ?? false,
        enableNote: client.enableNote ?? false,
      },
      impersonated: true,
    };
  }

  // ========== 관리자 회원 비밀번호 초기화 ==========

  async resetClientPassword(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');

    const hashedPassword = await bcrypt.hash('1111', 12);
    await this.prisma.client.update({
      where: { id: clientId },
      data: { password: hashedPassword },
    });

    return { success: true, message: '비밀번호가 1111로 초기화되었습니다' };
  }

  // ========== 회원 탈퇴 (익명화 처리) ==========

  async withdrawClient(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('회원을 찾을 수 없습니다');
    if (client.status === 'withdrawn') throw new BadRequestException('이미 탈퇴한 회원입니다');

    await this.prisma.$transaction(async (tx) => {
      // 1. 개인정보 익명화 + 상태 변경 (주문/매출 데이터는 보존)
      await tx.client.update({
        where: { id: clientId },
        data: {
          clientName: '탈퇴회원',
          email: null,
          mobile: null,
          phone: null,
          postalCode: null,
          address: null,
          addressDetail: null,
          representative: null,
          businessNumber: null,
          oauthProvider: null,
          oauthId: null,
          password: null,
          profileImage: null,
          adminMemo: null,
          contactPerson: null,
          contactPhone: null,
          contactEmail: null,
          practicalManagerName: null,
          practicalManagerPhone: null,
          approvalManagerName: null,
          approvalManagerPhone: null,
          status: 'withdrawn',
          withdrawnAt: new Date(),
        },
      });

      // 2. 고용 관계 해제: 본인이 멤버인 것 + 본인이 운영하는 회사의 직원들
      await tx.employment.deleteMany({
        where: {
          OR: [
            { memberClientId: clientId },
            { companyClientId: clientId },
          ],
        },
      });

      // 3. 대기 중인 초대 취소
      await tx.invitation.deleteMany({
        where: { clientId, status: 'PENDING' },
      });
    });

    return { success: true, message: '회원 탈퇴가 완료되었습니다' };
  }
}
