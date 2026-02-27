import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegisterIndividualDto, RegisterStudioDto } from './dto/auth.dto';

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
  ) { }

  /** OAuth 콜백용: 토큰을 임시 코드로 저장 (60초 TTL) */
  generateOAuthCode(tokens: { accessToken: string; refreshToken: string; user: any }): string {
    const code = crypto.randomBytes(32).toString('hex');
    this.oauthCodeStore.set(code, {
      ...tokens,
      expiresAt: Date.now() + 60_000,
    });
    // 만료된 코드 정리
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
    // 1회 사용 후 삭제
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

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && user.passwordHash && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d' as const,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  async register(data: { email: string; password: string; name: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: hashedPassword,
        name: data.name,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);

      // Staff(관리자) 토큰인 경우
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

        const newRefreshToken = this.jwtService.sign(newPayload, {
          expiresIn: '30d',
        });

        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: newRefreshToken,
        };
      }

      // Client(고객) 토큰인 경우
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

        const newRefreshToken = this.jwtService.sign(newPayload, {
          expiresIn: '30d',
        });

        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: newRefreshToken,
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

      // Employee(거래처 직원) 토큰 — Client 기반
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
            company: {
              select: { id: true, clientName: true },
            },
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

        const newRefreshToken = this.jwtService.sign(newPayload, {
          expiresIn: '30d',
        });

        return {
          accessToken: this.jwtService.sign(newPayload),
          refreshToken: newRefreshToken,
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

      const newPayload = {
        sub: user.id,
        email: user.email,
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  // 네이버 OAuth 사용자 검증/생성
  async validateNaverUser(data: {
    oauthId: string;
    email: string;
    name: string;
    profileImage?: string;
  }) {
    // 기존 클라이언트 조회 (oauthProvider + oauthId로 검색)
    let client = await this.prisma.client.findFirst({
      where: {
        oauthProvider: 'naver',
        oauthId: data.oauthId,
      },
    });

    // 기존 사용자가 없으면 새로 생성
    if (!client) {
      // 클라이언트 코드 생성 (N + 타임스탬프)
      const clientCode = `N${Date.now().toString().slice(-8)}`;

      client = await this.prisma.client.create({
        data: {
          clientCode,
          clientName: data.name,
          email: data.email,
          oauthProvider: 'naver',
          oauthId: data.oauthId,
          memberType: 'individual',
          priceType: 'standard',
          paymentType: 'order',
          status: 'active',
        },
      });
    }

    return client;
  }

  // 카카오 OAuth 사용자 검증/생성
  async validateKakaoUser(data: {
    oauthId: string;
    email: string;
    name: string;
    profileImage?: string;
  }) {
    // 기존 클라이언트 조회 (oauthProvider + oauthId로 검색)
    let client = await this.prisma.client.findFirst({
      where: {
        oauthProvider: 'kakao',
        oauthId: data.oauthId,
      },
    });

    // 기존 사용자가 없으면 새로 생성
    if (!client) {
      // 클라이언트 코드 생성 (K + 타임스탬프)
      const clientCode = `K${Date.now().toString().slice(-8)}`;

      client = await this.prisma.client.create({
        data: {
          clientCode,
          clientName: data.name,
          email: data.email,
          oauthProvider: 'kakao',
          oauthId: data.oauthId,
          memberType: 'individual',
          priceType: 'standard',
          paymentType: 'order',
          status: 'active',
        },
      });
    }

    return client;
  }

  // 클라이언트(고객) 로그인 처리
  async loginClient(client: any, rememberMe: boolean = false, ip?: string) {
    // 로그인 시각/IP 기록
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        lastLoginAt: new Date(),
        ...(ip && { lastLoginIp: ip }),
      },
    });

    const payload = {
      sub: client.id,
      email: client.email,
      role: 'client',
      type: 'client', // User와 구분하기 위한 타입
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: rememberMe ? '30d' : '7d',
    });

    return {
      accessToken,
      refreshToken,
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

  // 비밀번호 변경 (Client 기반)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: userId },
    });

    if (!client) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    if (!client.password) {
      throw new BadRequestException('비밀번호가 설정되지 않은 계정입니다');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, client.password);
    if (!isPasswordValid) {
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.client.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, message: '비밀번호가 변경되었습니다' };
  }

  // 관리자용: 회원 비밀번호 초기화 (랜덤 임시 비밀번호 생성)
  async resetClientPassword(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      throw new BadRequestException('회원을 찾을 수 없습니다');
    }

    const tempPassword = crypto.randomBytes(6).toString('hex'); // 12자 랜덤
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    await this.prisma.client.update({
      where: { id: clientId },
      data: { password: hashedPassword },
    });

    return {
      success: true,
      message: '임시 비밀번호가 생성되었습니다. 회원에게 전달해주세요.',
      tempPassword,
    };
  }

  // ========== 고객 회원가입 ==========

  // 다음 클라이언트 코드 생성
  private async generateClientCode(prefix: string = 'M'): Promise<string> {
    const lastClient = await this.prisma.client.findFirst({
      where: {
        clientCode: { startsWith: prefix },
      },
      orderBy: { clientCode: 'desc' },
    });

    if (!lastClient) {
      return `${prefix}0001`;
    }

    const lastNumber = parseInt(lastClient.clientCode.slice(1), 10);
    const nextNumber = lastNumber + 1;
    return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
  }

  // 이메일 중복 체크
  async checkEmailExists(email: string): Promise<boolean> {
    const existing = await this.prisma.client.findFirst({
      where: { email },
    });
    return !!existing;
  }

  // 사업자등록번호 중복 체크
  async checkBusinessNumberExists(businessNumber: string): Promise<boolean> {
    const existing = await this.prisma.client.findFirst({
      where: { businessNumber },
    });
    return !!existing;
  }

  // 개인 고객 회원가입
  async registerIndividual(dto: RegisterIndividualDto) {
    // 이메일 중복 체크
    if (await this.checkEmailExists(dto.email)) {
      throw new ConflictException('이미 등록된 이메일입니다');
    }

    const clientCode = await this.generateClientCode('P'); // P = Personal
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const client = await this.prisma.client.create({
      data: {
        clientCode,
        clientName: dto.name,
        email: dto.email,
        password: hashedPassword,
        mobile: dto.mobile,
        memberType: 'individual',
        priceType: 'standard',
        paymentType: 'order',
        status: 'active',
      },
    });

    return {
      success: true,
      message: '회원가입이 완료되었습니다',
      clientCode: client.clientCode,
    };
  }

  // 스튜디오(B2B) 회원가입
  async registerStudio(dto: RegisterStudioDto) {
    // 이메일 중복 체크
    if (await this.checkEmailExists(dto.email)) {
      throw new ConflictException('이미 등록된 이메일입니다');
    }

    // 사업자등록번호 중복 체크
    if (await this.checkBusinessNumberExists(dto.businessNumber)) {
      throw new ConflictException('이미 등록된 사업자등록번호입니다');
    }

    const clientCode = await this.generateClientCode('S'); // S = Studio
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const client = await this.prisma.client.create({
      data: {
        clientCode,
        clientName: dto.studioName,
        representative: dto.representative,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        mobile: dto.mobile,
        // 사업자 정보
        businessNumber: dto.businessNumber,
        businessType: dto.businessType,
        businessCategory: dto.businessCategory,
        postalCode: dto.postalCode,
        address: dto.address,
        addressDetail: dto.addressDetail,
        taxInvoiceEmail: dto.taxInvoiceEmail,
        taxInvoiceMethod: dto.taxInvoiceMethod,
        // 실무 담당자
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        // 스튜디오 특성
        mainGenre: dto.mainGenre,
        monthlyOrderVolume: dto.monthlyOrderVolume,
        colorProfile: dto.colorProfile,
        acquisitionChannel: dto.acquisitionChannel,
        // 제품 선호도
        preferredSize: dto.preferredSize,
        preferredFinish: dto.preferredFinish,
        hasLogo: dto.hasLogo ?? false,
        deliveryNote: dto.deliveryNote,
        // 기본 설정
        memberType: 'business',
        priceType: 'group', // B2B는 그룹단가 적용
        paymentType: 'order',
        status: 'active',
      },
    });

    return {
      success: true,
      message: '스튜디오 회원가입이 완료되었습니다. 담당자 확인 후 그룹단가가 적용됩니다.',
      clientCode: client.clientCode,
    };
  }

  // 클라이언트(고객) 이메일/비밀번호 로그인
  async validateClient(email: string, password: string) {
    const client = await this.prisma.client.findFirst({
      where: { email },
    });

    if (!client || !client.password) {
      return null;
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) {
      return null;
    }

    return client;
  }

  // ========== 관리자(직원) 로그인 ==========

  // 직원 인증 (staffId + 비밀번호)
  async validateStaff(staffId: string, password: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { staffId },
      include: {
        branch: true,
        department: true,
      },
    });

    if (!staff) {
      return null;
    }

    // canLoginAsManager 권한 확인
    if (!staff.canLoginAsManager) {
      throw new UnauthorizedException('관리자 로그인 권한이 없습니다');
    }

    // 활성 상태 확인
    if (!staff.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다');
    }

    // 상태 확인 (소셜 로그인 연동 후 추가)
    if (staff.status && staff.status !== 'active') {
      throw new UnauthorizedException('계정이 활성 상태가 아닙니다');
    }

    // 비밀번호 확인
    if (!staff.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다');
    }
    const isValid = await bcrypt.compare(password, staff.password);
    if (!isValid) {
      return null;
    }

    return staff;
  }

  // 직원 로그인 처리
  async loginStaff(staff: any, rememberMe: boolean = false, ip?: string) {
    // 로그인 시각/IP 기록
    await this.prisma.staff.update({
      where: { id: staff.id },
      data: {
        lastLoginAt: new Date(),
        ...(ip && { lastLoginIp: ip }),
      },
    });

    const payload = {
      sub: staff.id,
      staffId: staff.staffId,
      name: staff.name,
      role: 'admin',
      type: 'staff', // User와 구분하기 위한 타입
      branchId: staff.branchId,
      departmentId: staff.departmentId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: rememberMe ? '30d' : '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        staffId: staff.staffId,
        name: staff.name,
        role: 'admin',
        email: staff.email,
        isSuperAdmin: staff.isSuperAdmin ?? false,
        branch: staff.branch,
        department: staff.department,
      },
    };
  }

  // ========== 관리자 대리 로그인 (Impersonate) ==========

  // 최고관리자가 특정 직원으로 대리 로그인
  async impersonateStaff(targetStaffId: string, adminStaffId: string) {
    // 요청한 직원이 최고관리자인지 확인
    const adminStaff = await this.prisma.staff.findUnique({
      where: { id: adminStaffId },
    });

    if (!adminStaff || !adminStaff.isSuperAdmin) {
      throw new UnauthorizedException('최고관리자만 대리 로그인할 수 있습니다');
    }

    // 대상 직원 조회
    const targetStaff = await this.prisma.staff.findUnique({
      where: { id: targetStaffId },
      include: { branch: true, department: true },
    });

    if (!targetStaff) {
      throw new BadRequestException('직원을 찾을 수 없습니다');
    }

    if (!targetStaff.isActive) {
      throw new BadRequestException('비활성 직원은 대리 로그인할 수 없습니다');
    }

    // 대리 로그인 토큰 발급
    const payload = {
      sub: targetStaff.id,
      staffId: targetStaff.staffId,
      name: targetStaff.name,
      role: 'admin',
      type: 'staff',
      branchId: targetStaff.branchId,
      departmentId: targetStaff.departmentId,
      impersonatedBy: adminStaffId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '2h',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '2h',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: targetStaff.id,
        staffId: targetStaff.staffId,
        name: targetStaff.name,
        role: 'admin',
        email: targetStaff.email,
        branch: targetStaff.branch,
        department: targetStaff.department,
      },
      impersonated: true,
    };
  }

  // ========== 직원 소셜 로그인 ==========

  // 직원 OAuth 검증 (신규 등록 or 기존 사용자 반환)
  async validateStaffOAuth(data: {
    oauthProvider: string;
    oauthId: string;
    email: string;
    name: string;
    profileImage?: string;
  }): Promise<{ staff: any; isNew: boolean }> {
    // 기존 Staff 조회 (oauthProvider + oauthId)
    let staff = await this.prisma.staff.findFirst({
      where: {
        oauthProvider: data.oauthProvider,
        oauthId: data.oauthId,
      },
    });

    if (staff) {
      if (staff.status === 'rejected') {
        throw new UnauthorizedException('가입 거절된 계정입니다');
      }
      if (staff.status === 'suspended') {
        throw new UnauthorizedException('정지된 계정입니다');
      }
      return { staff, isNew: false };
    }

    // 신규 Staff 생성 (status: pending)
    staff = await this.prisma.staff.create({
      data: {
        name: data.name,
        email: data.email,
        companyEmail: data.email,
        oauthProvider: data.oauthProvider,
        oauthId: data.oauthId,
        profileImage: data.profileImage,
        status: 'pending',
        role: 'employee',
        isActive: false,
        canLoginAsManager: false,
      },
    });

    return { staff, isNew: true };
  }

  // 직원 OAuth 로그인 처리
  async loginStaffOAuth(staff: any, ip?: string) {
    // pending 상태면 토큰 없이 상태만 반환
    if (staff.status === 'pending') {
      return {
        status: 'pending',
        message: '가입 승인 대기 중입니다. 관리자에게 문의하세요.',
        staffId: staff.id,
      };
    }

    if (staff.status !== 'active' || !staff.isActive) {
      throw new UnauthorizedException('비활성 계정입니다');
    }

    // 로그인 시각/IP 기록
    await this.prisma.staff.update({
      where: { id: staff.id },
      data: {
        lastLoginAt: new Date(),
        ...(ip && { lastLoginIp: ip }),
      },
    });

    const payload = {
      sub: staff.id,
      staffId: staff.staffId,
      name: staff.name,
      role: 'admin',
      type: 'staff',
      branchId: staff.branchId,
      departmentId: staff.departmentId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      status: 'active',
      accessToken,
      refreshToken,
      user: {
        id: staff.id,
        staffId: staff.staffId,
        name: staff.name,
        role: 'admin',
        email: staff.companyEmail || staff.email,
        isSuperAdmin: staff.isSuperAdmin ?? false,
        profileImage: staff.profileImage,
      },
    };
  }

  // 회사 이메일 등록 (소셜 로그인 후)
  async registerStaffCompanyEmail(staffId: string, companyEmail: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    if (staff.status !== 'pending') {
      throw new BadRequestException('이미 처리된 가입 요청입니다');
    }

    await this.prisma.staff.update({
      where: { id: staffId },
      data: { companyEmail },
    });

    return { success: true, message: '회사 이메일이 등록되었습니다. 관리자 승인을 기다려주세요.' };
  }

  // 승인 대기 직원 목록
  async getPendingStaff() {
    return this.prisma.staff.findMany({
      where: { status: 'pending' },
      select: {
        id: true,
        name: true,
        email: true,
        companyEmail: true,
        oauthProvider: true,
        profileImage: true,
        status: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 직원 승인
  async approveStaff(staffId: string, adminId: string, role: string = 'employee') {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    if (staff.status !== 'pending') {
      throw new BadRequestException('승인 대기 상태가 아닙니다');
    }

    const validRoles = ['admin', 'employee'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('유효하지 않은 역할입니다');
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        status: 'active',
        isActive: true,
        canLoginAsManager: true,
        role,
        isSuperAdmin: false,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });
  }

  // 직원 거절
  async rejectStaff(staffId: string, adminId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    if (staff.status !== 'pending') {
      throw new BadRequestException('승인 대기 상태가 아닙니다');
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        status: 'rejected',
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });
  }

  // 직원 정지
  async suspendStaff(staffId: string, adminId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        status: 'suspended',
        isActive: false,
        approvedBy: adminId,
        approvedAt: new Date(),
      },
    });
  }

  // 직원 역할 변경
  async changeStaffRole(staffId: string, adminId: string, role: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new NotFoundException('직원을 찾을 수 없습니다');
    }

    const validRoles = ['super_admin', 'admin', 'employee'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException('유효하지 않은 역할입니다');
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        role,
        isSuperAdmin: role === 'super_admin',
      },
    });
  }

  // ========== 거래처 직원(Employee) 로그인 ==========

  // ========== 통합 로그인 ==========

  /** 통합 로그인: Client를 인증하고 Employment 컨텍스트 확인 */
  async unifiedLogin(email: string, password: string) {
    const client = await this.prisma.client.findFirst({
      where: { email },
    });

    if (!client || !client.password) {
      return null;
    }

    const isValid = await bcrypt.compare(password, client.password);
    if (!isValid) {
      return null;
    }

    if (client.status !== 'active') {
      return null;
    }

    // Employment(소속 회사) 조회
    const employments = await this.prisma.employment.findMany({
      where: {
        memberClientId: client.id,
        status: 'ACTIVE',
      },
      include: {
        company: {
          select: {
            id: true,
            clientName: true,
            clientCode: true,
            status: true,
          },
        },
      },
    });

    // 활성 거래처만 필터
    const activeEmployments = employments.filter(
      (e) => e.company.status === 'active',
    );

    return { client, employments: activeEmployments };
  }

  /** 활성 Employment(소속 회사) 조회 */
  async getActiveEmployments(clientId: string) {
    const employments = await this.prisma.employment.findMany({
      where: {
        memberClientId: clientId,
        status: 'ACTIVE',
      },
      include: {
        company: {
          select: {
            id: true,
            clientName: true,
            clientCode: true,
            status: true,
          },
        },
      },
    });
    return employments.filter((e) => e.company.status === 'active');
  }

  /** 임시 토큰 생성 (컨텍스트 선택용, 5분 유효) */
  generateTempAuthToken(client: any): string {
    return this.jwtService.sign(
      { sub: client.id, email: client.email, purpose: 'context-selection' },
      { expiresIn: '5m' },
    );
  }

  /** tempToken으로 선택 가능한 컨텍스트 목록 조회 */
  async getContextsFromTempToken(tempToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (payload.purpose !== 'context-selection') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: payload.sub },
    });
    if (!client || client.status !== 'active') {
      throw new UnauthorizedException('비활성 계정입니다.');
    }

    const employments = await this.getActiveEmployments(client.id);

    return {
      email: client.email,
      contexts: [
        {
          type: 'personal',
          label: '내 계정',
          clientName: client.clientName,
          clientId: client.id,
        },
        ...employments.map((e: any) => ({
          type: 'employee',
          employmentId: e.id,
          companyClientId: e.companyClientId,
          companyName: e.company.clientName,
          clientName: client.clientName,
          role: e.role,
        })),
      ],
    };
  }

  /** 컨텍스트 선택 후 최종 로그인 */
  async loginWithContext(
    tempToken: string,
    contextType: string,
    employmentId?: string,
    rememberMe?: boolean,
    ip?: string,
  ) {
    let payload: any;
    try {
      payload = this.jwtService.verify(tempToken);
    } catch {
      throw new UnauthorizedException('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (payload.purpose !== 'context-selection') {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: payload.sub },
    });
    if (!client || client.status !== 'active') {
      throw new UnauthorizedException('비활성 계정입니다.');
    }

    if (contextType === 'personal') {
      return this.loginClient(client, rememberMe ?? false, ip);
    }

    // employee 컨텍스트
    if (!employmentId) {
      throw new BadRequestException('employmentId가 필요합니다.');
    }

    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        company: {
          select: { id: true, clientName: true, clientCode: true },
        },
      },
    });

    if (!employment || employment.memberClientId !== client.id || employment.status !== 'ACTIVE') {
      throw new UnauthorizedException('유효하지 않은 선택입니다.');
    }

    return this.loginEmployeeAsClient(client, employment, rememberMe ?? false, ip);
  }

  /** Employee 로그인 (Client 기반) */
  async loginEmployeeAsClient(
    client: any,
    employment: any,
    rememberMe: boolean = false,
    ip?: string,
  ) {
    // 로그인 시각/IP 기록
    await this.prisma.client.update({
      where: { id: client.id },
      data: {
        lastLoginAt: new Date(),
        ...(ip && { lastLoginIp: ip }),
      },
    });

    const payload = {
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

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: rememberMe ? '30d' : '7d',
    });

    return {
      accessToken,
      refreshToken,
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
        canViewAllOrders: employment.canViewAllOrders,
        canManageProducts: employment.canManageProducts,
        canViewSettlement: employment.canViewSettlement,
      },
    };
  }

  // ========== 레거시 Employee 메서드 (하위호환) ==========

  async validateEmployee(email: string, password: string) {
    const result = await this.unifiedLogin(email, password);
    if (!result) return null;

    const { client, employments } = result;
    if (employments.length === 0) return null;

    if (employments.length === 1) {
      return { user: client, employment: employments[0] };
    }

    return { user: client, employments };
  }

  async loginEmployee(
    user: any,
    employment: any,
    rememberMe: boolean = false,
    ip?: string,
  ) {
    return this.loginEmployeeAsClient(user, employment, rememberMe, ip);
  }

  async loginEmployeeBySelection(
    userId: string,
    employmentId: string,
    rememberMe: boolean = false,
    ip?: string,
  ) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        company: {
          select: { id: true, clientName: true, clientCode: true },
        },
      },
    });

    if (!employment || employment.memberClientId !== userId || employment.status !== 'ACTIVE') {
      throw new UnauthorizedException('유효하지 않은 선택입니다.');
    }

    const client = await this.prisma.client.findUnique({
      where: { id: userId },
    });

    if (!client || client.status !== 'active') {
      throw new UnauthorizedException('비활성 계정입니다.');
    }

    return this.loginEmployeeAsClient(client, employment, rememberMe, ip);
  }

  // 관리자가 특정 회원으로 대리 로그인
  async impersonateClient(clientId: string, adminId: string) {
    // 회원(Client) 조회
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { group: true },
    });

    if (!client) {
      throw new BadRequestException('회원을 찾을 수 없습니다');
    }

    if (client.status !== 'active') {
      throw new BadRequestException('비활성 회원은 대리 로그인할 수 없습니다');
    }

    // 대리 로그인 토큰 발급 (impersonatedBy 필드 추가)
    const payload = {
      sub: client.id,
      email: client.email,
      role: 'client',
      type: 'client',
      impersonatedBy: adminId, // 대리 로그인한 관리자 ID
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h', // 대리 로그인은 1시간 제한
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '1h',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: client.id,
        email: client.email,
        name: client.clientName,
        role: 'client',
        clientId: client.id,
        clientName: client.clientName,
        clientCode: client.clientCode,
        mobile: client.mobile,
        businessNumber: client.businessNumber,
        representative: client.representative,
        address: client.address,
        addressDetail: client.addressDetail,
        contactPerson: client.contactPerson,
        group: client.group,
      },
      impersonated: true,
    };
  }
}

