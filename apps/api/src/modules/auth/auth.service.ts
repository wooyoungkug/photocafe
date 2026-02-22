import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
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

    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
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
        role: user.role,
      },
    };
  }

  async register(data: { email: string; password: string; name: string }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
      },
    });

    const { password: _, ...result } = user;
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

        if (!staff || !staff.isActive) {
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
        role: user.role,
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
        role: true,
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
  async loginClient(client: any) {
    const payload = {
      sub: client.id,
      email: client.email,
      role: 'client',
      type: 'client', // User와 구분하기 위한 타입
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d' as const,
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

  // 비밀번호 변경
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('사용자를 찾을 수 없습니다');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
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

    // 비밀번호 확인
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

