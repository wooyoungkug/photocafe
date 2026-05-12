import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
  ForbiddenException,
  Query,
  Param,
  Ip,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import {
  RefreshTokenDto,
  ClientLoginDto,
  ClientRegisterDto,
  StaffLoginDto,
  ApproveStaffDto,
  ChangeStaffRoleDto,
  SelectContextDto,
  SendEmailVerificationDto,
  VerifyEmailDto,
  ChangePasswordDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { EmploymentService } from '../employment/employment.service';

/** 운영: 설계서 v1.1 브루트포스 방어(분당 5회). 로컬은 재시도·디버깅으로 429가 잦아 완화 */
const STAFF_LOGIN_THROTTLE =
  process.env.NODE_ENV === 'production'
    ? { default: { ttl: 60000, limit: 5 } }
    : { default: { ttl: 60000, limit: 120 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private employmentService: EmploymentService,
  ) { }

  /**
   * Cookie 이름을 type 별로 분리해서 set:
   *   - staff             → `staff_access_token`, `staff_refresh_token`
   *   - client / employee → `access_token`, `refresh_token` (기존)
   *
   * 같은 브라우저에서 admin과 일반 회원이 동시에 로그인되어 있어도 cookie가
   * 충돌하지 않도록 분리한다. JwtStrategy 가 Referer 기반으로 어떤 cookie를
   * 우선 검사할지 결정한다.
   */
  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    rememberMe = false,
    userType: 'staff' | 'client' | 'employee' = 'client',
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? process.env.COOKIE_DOMAIN || '.photocafe.co.kr' : undefined;
    const accessMaxAge = 8 * 60 * 60 * 1000; // 8h
    const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    const prefix = userType === 'staff' ? 'staff_' : '';
    const accessName = `${prefix}access_token`;
    const refreshName = `${prefix}refresh_token`;

    res.cookie(accessName, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: accessMaxAge,
      ...(cookieDomain && { domain: cookieDomain }),
    });
    res.cookie(refreshName, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: refreshMaxAge,
      ...(cookieDomain && { domain: cookieDomain }),
    });
  }

  /**
   * userType 미지정 시 두 cookie 쌍 모두 clear (혼합 세션 모두 정리).
   */
  private clearAuthCookies(res: Response, userType?: 'staff' | 'client' | 'employee') {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = isProd ? process.env.COOKIE_DOMAIN || '.photocafe.co.kr' : undefined;
    const baseOptions = {
      httpOnly: true as const,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(cookieDomain && { domain: cookieDomain }),
    };
    if (!userType || userType !== 'staff') {
      res.clearCookie('access_token', baseOptions);
      res.clearCookie('refresh_token', baseOptions);
    }
    if (!userType || userType === 'staff') {
      res.clearCookie('staff_access_token', baseOptions);
      res.clearCookie('staff_refresh_token', baseOptions);
    }
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '토큰 갱신' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @Request() req: any, @Res({ passthrough: true }) res: Response) {
    // staff/client cookie 둘 다 시도 (분리 대응)
    const refreshToken =
      refreshTokenDto.refreshToken ||
      req?.cookies?.staff_refresh_token ||
      req?.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('refresh token이 필요합니다.');
    }
    const result = await this.authService.refreshToken(refreshToken);
    if (!result.refreshToken) {
      throw new UnauthorizedException('유효한 refresh token을 발급하지 못했습니다.');
    }
    // refresh 응답의 user.type 으로 분리해서 set
    const userType: 'staff' | 'client' | 'employee' =
      result.user?.type === 'staff'
        ? 'staff'
        : result.user?.type === 'employee'
          ? 'employee'
          : 'client';
    this.setAuthCookies(res, result.accessToken, result.refreshToken, false, userType);
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub, req.user.type, req.user.clientId, req.user.staffId);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '내 비밀번호 변경 (staff/client 공용)' })
  async changePassword(@Body() dto: ChangePasswordDto, @Request() req: any) {
    return this.authService.changeCurrentUserPassword(
      req.user.sub,
      req.user.type,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'UI 환경설정 조회 (핀 메뉴, 레이아웃 모드)' })
  async getPreferences(@Request() req: any) {
    return this.authService.getStaffPreferences(req.user.sub, req.user.type);
  }

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'UI 환경설정 수정 (핀 메뉴, 레이아웃 모드)' })
  async updatePreferences(
    @Body() dto: { pinnedMenus?: string[]; layoutMode?: 'top' | 'side' },
    @Request() req: any,
  ) {
    return this.authService.updateStaffPreferences(req.user.sub, req.user.type, dto);
  }

  // ========== 컨텍스트 선택 ==========

  @Public()
  @Get('my-contexts')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'tempToken으로 선택 가능한 컨텍스트 목록 조회' })
  async getMyContexts(@Query('tempToken') tempToken: string) {
    if (!tempToken) {
      throw new UnauthorizedException('tempToken이 필요합니다.');
    }
    return this.authService.getContextsFromTempToken(tempToken);
  }

  @Public()
  @Post('select-context')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '로그인 컨텍스트 선택 (내 계정 vs 회사 직원)' })
  async selectContext(@Body() dto: SelectContextDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginWithContext(
      dto.tempToken,
      dto.contextType,
      dto.employmentId,
      dto.rememberMe,
      ip,
    );
    // selectContext 결과는 client 또는 employee. 둘 다 같은 cookie 이름 사용.
    const userType: 'client' | 'employee' = (result.user?.type === 'employee') ? 'employee' : 'client';
    this.setAuthCookies(res, result.accessToken, result.refreshToken, !!dto.rememberMe, userType);
    return result;
  }

  // ========== 초대용 OAuth 진입점 ==========

  @Public()
  @Get('naver-invite/:inviteToken')
  @ApiOperation({ summary: '초대 수락 - 네이버 OAuth' })
  async naverInviteAuth(@Param('inviteToken') inviteToken: string, @Res() res: Response) {
    res.cookie('invite_token', inviteToken, { maxAge: 5 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/naver');
  }

  @Public()
  @Get('kakao-invite/:inviteToken')
  @ApiOperation({ summary: '초대 수락 - 카카오 OAuth' })
  async kakaoInviteAuth(@Param('inviteToken') inviteToken: string, @Res() res: Response) {
    res.cookie('invite_token', inviteToken, { maxAge: 5 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/kakao');
  }

  @Public()
  @Get('google-invite/:inviteToken')
  @ApiOperation({ summary: '초대 수락 - Google OAuth' })
  async googleInviteAuth(@Param('inviteToken') inviteToken: string, @Res() res: Response) {
    res.cookie('invite_token', inviteToken, { maxAge: 5 * 60 * 1000, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/google');
  }

  // ========== 고객 OAuth 로그인 ==========

  // 로그인 전용 래퍼: auth_mode=login 쿠키 설정 후 OAuth로 리다이렉트
  @Public()
  @Get('naver-login')
  @ApiOperation({ summary: '네이버 로그인 (기존 회원만)' })
  async naverLoginRedirect(@Res() res: Response) {
    res.cookie('auth_mode', 'login', { httpOnly: true, maxAge: 300000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/naver');
  }

  @Public()
  @Get('kakao-login')
  @ApiOperation({ summary: '카카오 로그인 (기존 회원만)' })
  async kakaoLoginRedirect(@Res() res: Response) {
    res.cookie('auth_mode', 'login', { httpOnly: true, maxAge: 300000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/kakao');
  }

  // 가입 전용 래퍼: auth_mode=register 쿠키 설정 후 OAuth로 리다이렉트
  @Public()
  @Get('naver-register')
  @ApiOperation({ summary: '네이버 회원가입 (신규 회원만)' })
  async naverRegisterRedirect(@Res() res: Response) {
    res.cookie('auth_mode', 'register', { httpOnly: true, maxAge: 300000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/naver');
  }

  @Public()
  @Get('kakao-register')
  @ApiOperation({ summary: '카카오 회원가입 (신규 회원만)' })
  async kakaoRegisterRedirect(@Res() res: Response) {
    res.cookie('auth_mode', 'register', { httpOnly: true, maxAge: 300000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/kakao');
  }

  @Public()
  @Get('google-login')
  @ApiOperation({ summary: 'Google 로그인 (기존 회원만)' })
  async googleLoginRedirect(@Res() res: Response) {
    res.cookie('auth_mode', 'login', { httpOnly: true, maxAge: 300000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/google');
  }

  @Public()
  @Get('google-register')
  @ApiOperation({ summary: 'Google 회원가입 (신규 회원만)' })
  async googleRegisterRedirect(@Res() res: Response) {
    res.cookie('auth_mode', 'register', { httpOnly: true, maxAge: 300000, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/api/v1/auth/google');
  }

  @Public()
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인/가입' })
  async naverAuth() { }

  @Public()
  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인 콜백' })
  async naverAuthCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    return this.handleOAuthCallback(req.user, frontendUrl, res, req);
  }

  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인/가입' })
  async kakaoAuth() { }

  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  async kakaoAuthCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    return this.handleOAuthCallback(req.user, frontendUrl, res, req);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('customer-google'))
  @ApiOperation({ summary: 'Google 로그인/가입' })
  async googleAuth() { }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('customer-google'))
  @ApiOperation({ summary: 'Google 로그인 콜백' })
  async googleAuthCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    return this.handleOAuthCallback(req.user, frontendUrl, res, req);
  }

  private async handleOAuthCallback(client: any, frontendUrl: string, res: Response, req?: any) {
    // 이메일 중복 체크 실패: 다른 소셜로 이미 가입된 이메일
    if (client._emailDuplicate) {
      const msg = encodeURIComponent(client._dupMessage);
      return res.redirect(`${frontendUrl}/login?error=EMAIL_DUPLICATE&message=${msg}`);
    }

    // auth_mode 쿠키 처리 (login: 기존 회원만, register: 신규 회원만)
    const authMode = req?.cookies?.auth_mode;
    if (authMode) {
      res.clearCookie('auth_mode');
    }

    // 로그인 전용 모드: 미가입 회원이면 자동 생성 롤백 후 에러 리다이렉트
    if (authMode === 'login' && client._isNew) {
      await this.authService.rollbackNewClient(client.id);
      return res.redirect(`${frontendUrl}/login?error=NOT_REGISTERED&provider=${client.oauthProvider}`);
    }

    // 가입 전용 모드: 이미 가입된 회원이면 가입일 알려주고 로그인 유도
    if (authMode === 'register' && !client._isNew) {
      const registeredAt = client.createdAt
        ? new Date(client.createdAt).toISOString().split('T')[0]
        : '';
      return res.redirect(
        `${frontendUrl}/register?error=ALREADY_REGISTERED&provider=${client.oauthProvider}&registeredAt=${registeredAt}`,
      );
    }

    // 이메일 링크 인증 미완료: 토큰 발급 후 결과에 따라 처리
    if (!client.emailVerified) {
      const needsVerification = await this.authService.ensureEmailVerificationIssued(client.id);
      if (needsVerification) {
        // 실제 이메일 발송됨 → 인증 대기 페이지로 이동
        return res.redirect(`${frontendUrl}/verify-email?pending=1&provider=${client.oauthProvider ?? ''}`);
      }
      // 가짜 소셜 이메일 자동 통과 → 아래 정상 로그인 계속 진행
    }

    const inviteToken = req?.cookies?.invite_token;
    if (inviteToken) {
      try {
        await this.employmentService.acceptInvitationOAuth({
          token: inviteToken,
          oauthProvider: client.oauthProvider,
          oauthId: client.oauthId,
          email: client.email,
          name: client.clientName,
        });
      } catch (e: any) {
        console.warn('Invite acceptance skipped:', e.message);
      }
      res.clearCookie('invite_token');
    }

    const employments = await this.authService.getActiveEmployments(client.id);

    if (employments.length === 0) {
      const tokens = await this.authService.loginClient(client);
      const code = this.authService.generateOAuthCode(tokens);
      return res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
    }

    const tempToken = this.authService.generateTempAuthToken(client);
    return res.redirect(`${frontendUrl}/auth/callback?needsContext=true&tempToken=${encodeURIComponent(tempToken)}`);
  }

  @Public()
  @Post('exchange-code')
  @ApiOperation({ summary: 'OAuth 인증 코드를 토큰으로 교환' })
  async exchangeCode(@Body('code') code: string, @Res({ passthrough: true }) res: Response) {
    if (!code) {
      throw new UnauthorizedException('인증 코드가 필요합니다.');
    }
    const result = this.authService.exchangeOAuthCode(code);
    this.setAuthCookies(res, result.accessToken, result.refreshToken, false, 'client');
    return result;
  }

  // ========== 고객 이메일/PW 로그인 ==========

  @Public()
  @Post('client/login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '고객 아이디/PW 로그인' })
  async clientLogin(@Body() dto: ClientLoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginClientWithPassword(dto.loginId, dto.password, ip);
    if ('accessToken' in result && result.accessToken && result.refreshToken) {
      this.setAuthCookies(res, result.accessToken, result.refreshToken, false, 'client');
    }
    return result;
  }

  @Public()
  @Get('client/check-login-id')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '아이디 중복 확인' })
  async checkLoginId(@Query('loginId') loginId: string) {
    return this.authService.checkLoginIdAvailable(loginId);
  }

  @Public()
  @Post('client/register')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '고객 아이디/PW 회원가입 (가입 후 인증 메일 발송)' })
  async clientRegister(@Body() dto: ClientRegisterDto) {
    return this.authService.registerClientWithPassword(
      dto.loginId,
      dto.password,
      dto.name,
      dto.contactEmail,
      dto.phone,
      dto.emailConsent,
    );
  }

  @Public()
  @Get('client/verify-email')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '이메일 링크 인증 (가입 후 메일의 링크 클릭)' })
  async verifyEmailByToken(@Query('token') token: string) {
    return this.authService.verifyEmailToken(token);
  }

  @Public()
  @Post('client/resend-verification')
  @Throttle({ default: { ttl: 60000, limit: 1 } })
  @ApiOperation({ summary: '이메일 인증 메일 재발송' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerificationEmail(dto.loginId);
  }

  /** @deprecated 가입폼 내 6자리 코드 인증. 링크 인증(client/verify-email GET, client/resend-verification)으로 대체됨. */
  @Public()
  @Post('client/send-email-verification')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: '[DEPRECATED] 이메일 인증코드 발송 (코드 방식)' })
  async sendEmailVerification(@Body() dto: SendEmailVerificationDto) {
    return this.authService.sendEmailVerification(dto.email);
  }

  /** @deprecated 가입폼 내 6자리 코드 인증. 링크 인증으로 대체됨. */
  @Public()
  @Post('client/verify-email')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '[DEPRECATED] 이메일 인증코드 확인 (코드 방식)' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmailCode(dto.email, dto.code);
  }

  // ========== 직원 ID/PW 로그인 ==========

  @Public()
  @Post('staff/login')
  @Throttle(STAFF_LOGIN_THROTTLE)
  @ApiOperation({ summary: '직원 ID/PW 로그인' })
  async staffLogin(@Body() dto: StaffLoginDto, @Ip() ip: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.loginStaffWithPassword(dto.staffId, dto.password, ip);
    this.setAuthCookies(res, result.accessToken, result.refreshToken, false, 'staff');
    return result;
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: '로그아웃 (인증 쿠키 제거, X-Auth-Context 기반 컨텍스트 분리)' })
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    // X-Auth-Context 헤더로 어떤 쿠키만 지울지 결정
    // staff → staff_access_token/refresh_token 만 clear (client 쿠키 유지)
    // client → access_token/refresh_token 만 clear (staff 쿠키 유지)
    const authContext = req.headers['x-auth-context'] as string | undefined;
    const userType: 'staff' | 'client' = authContext === 'staff' ? 'staff' : 'client';
    this.clearAuthCookies(res, userType);
    return { success: true };
  }

  // ========== 직원 관리 (SUPER_ADMIN) ==========

  @Get('staff/pending')
  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '승인 대기 직원 목록' })
  async getPendingStaff(@Request() req: any) {
    if (!req.user.isSuperAdmin && req.user.type !== 'staff') {
      throw new UnauthorizedException('최고관리자만 조회할 수 있습니다');
    }
    return this.authService.getPendingStaff();
  }

  @Patch('staff/:id/approve')
  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 승인' })
  async approveStaff(@Param('id') id: string, @Body() dto: ApproveStaffDto, @Request() req: any) {
    if (!req.user.isSuperAdmin) {
      throw new UnauthorizedException('최고관리자만 승인할 수 있습니다');
    }
    return this.authService.approveStaff(id, req.user.sub, dto.role);
  }

  @Patch('staff/:id/reject')
  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 거절' })
  async rejectStaff(@Param('id') id: string, @Request() req: any) {
    if (!req.user.isSuperAdmin) {
      throw new UnauthorizedException('최고관리자만 거절할 수 있습니다');
    }
    return this.authService.rejectStaff(id, req.user.sub);
  }

  @Patch('staff/:id/suspend')
  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 정지' })
  async suspendStaff(@Param('id') id: string, @Request() req: any) {
    if (!req.user.isSuperAdmin) {
      throw new UnauthorizedException('최고관리자만 정지할 수 있습니다');
    }
    return this.authService.suspendStaff(id, req.user.sub);
  }

  @Patch('staff/:id/role')
  @UseGuards(JwtAuthGuard, StaffOnlyGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 역할 변경' })
  async changeStaffRole(@Param('id') id: string, @Body() dto: ChangeStaffRoleDto, @Request() req: any) {
    if (!req.user.isSuperAdmin) {
      throw new UnauthorizedException('최고관리자만 역할을 변경할 수 있습니다');
    }
    return this.authService.changeStaffRole(id, req.user.sub, dto.role);
  }

  // ========== 관리자 대리 로그인 ==========

  @Post('impersonate-staff/:staffId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '최고관리자가 특정 직원으로 대리 로그인' })
  async impersonateStaff(@Param('staffId') staffId: string, @Request() req: any, @Ip() ip: string) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    if (req.user.type !== 'staff') {
      await this.authService.logSecurityEvent({
        eventType: 'impersonate_blocked',
        severity: 'warn',
        userId: req.user.sub, userType: req.user.type ?? 'unknown',
        ipAddress: ip, userAgent,
        metadata: { target: 'staff', targetStaffId: staffId, reason: 'non-staff-caller' },
        message: '비-직원 계정의 대리 로그인 시도 차단',
      });
      throw new ForbiddenException('직원 계정만 대리 로그인할 수 있습니다');
    }
    if (req.user.impersonatedBy) {
      await this.authService.logSecurityEvent({
        eventType: 'impersonate_blocked',
        severity: 'warn',
        userId: req.user.sub, userType: 'staff',
        ipAddress: ip, userAgent,
        metadata: { target: 'staff', targetStaffId: staffId, reason: 'nested-impersonation', impersonatedBy: req.user.impersonatedBy },
        message: '중첩 대리 로그인 시도 차단',
      });
      throw new ForbiddenException('이미 대리 로그인 세션입니다. 원래 계정으로 돌아간 뒤 시도해주세요');
    }
    return this.authService.impersonateStaff(staffId, req.user.sub, ip, userAgent);
  }

  @Post('impersonate-employee/:employmentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '스튜디오 최고관리자가 소속 직원으로 대리 로그인' })
  async impersonateEmployee(@Param('employmentId') employmentId: string, @Request() req: any, @Ip() ip: string) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    if (req.user.type !== 'employee' && req.user.type !== 'client') {
      await this.authService.logSecurityEvent({
        eventType: 'impersonate_blocked',
        severity: 'warn',
        userId: req.user.sub, userType: req.user.type ?? 'unknown',
        ipAddress: ip, userAgent,
        metadata: { target: 'employee', targetEmploymentId: employmentId, reason: 'non-client-caller' },
        message: '비-회원 계정의 직원 대리 로그인 시도 차단',
      });
      throw new ForbiddenException('회원/직원 계정만 대리 로그인할 수 있습니다');
    }
    if (req.user.impersonatedBy) {
      await this.authService.logSecurityEvent({
        eventType: 'impersonate_blocked',
        severity: 'warn',
        userId: req.user.sub, userType: req.user.type,
        ipAddress: ip, userAgent,
        metadata: { target: 'employee', targetEmploymentId: employmentId, reason: 'nested-impersonation', impersonatedBy: req.user.impersonatedBy },
        message: '중첩 대리 로그인 시도 차단',
      });
      throw new ForbiddenException('이미 대리 로그인 세션입니다. 원래 계정으로 돌아간 뒤 시도해주세요');
    }
    const clientId = req.user.clientId || req.user.sub;
    return this.authService.impersonateEmployee(employmentId, req.user.sub, clientId, ip, userAgent);
  }

  @Post('impersonate/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '관리자가 특정 회원으로 대리 로그인' })
  async impersonateClient(@Param('clientId') clientId: string, @Request() req: any, @Ip() ip: string) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    if (req.user.type !== 'staff') {
      await this.authService.logSecurityEvent({
        eventType: 'impersonate_blocked',
        severity: 'warn',
        userId: req.user.sub, userType: req.user.type ?? 'unknown',
        ipAddress: ip, userAgent,
        metadata: { target: 'client', targetClientId: clientId, reason: 'non-staff-caller' },
        message: '비-직원 계정의 회원 대리 로그인 시도 차단',
      });
      throw new ForbiddenException('직원 계정만 회원 대리 로그인할 수 있습니다');
    }
    if (req.user.impersonatedBy) {
      await this.authService.logSecurityEvent({
        eventType: 'impersonate_blocked',
        severity: 'warn',
        userId: req.user.sub, userType: 'staff',
        ipAddress: ip, userAgent,
        metadata: { target: 'client', targetClientId: clientId, reason: 'nested-impersonation', impersonatedBy: req.user.impersonatedBy },
        message: '중첩 대리 로그인 시도 차단',
      });
      throw new ForbiddenException('이미 대리 로그인 세션입니다. 원래 계정으로 돌아간 뒤 시도해주세요');
    }
    return this.authService.impersonateClient(clientId, req.user.sub, ip, userAgent);
  }

  @Post('end-impersonation')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '대리 로그인 세션 종료 (감사 로그 기록 전용 — 클라이언트가 sessionStorage 정리 후 호출)' })
  async endImpersonation(@Request() req: any, @Ip() ip: string) {
    const userAgent = req.headers['user-agent'] as string | undefined;
    if (!req.user.impersonatedBy) {
      throw new ForbiddenException('현재 대리 로그인 세션이 아닙니다');
    }
    await this.authService.logSecurityEvent({
      eventType: 'impersonate_end',
      severity: 'info',
      userId: req.user.impersonatedBy, // 원래 사용자 기준
      userType: req.user.type ?? 'unknown',
      ipAddress: ip, userAgent,
      metadata: { targetUserId: req.user.sub, targetType: req.user.type },
      message: '대리 로그인 세션 종료',
    });
    return { success: true };
  }

  @Patch('reset-client-password/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '관리자가 회원 비밀번호를 1111로 초기화' })
  async resetClientPassword(@Param('id') id: string, @Request() req: any) {
    if (req.user.type !== 'staff') {
      throw new ForbiddenException('직원 계정만 비밀번호를 초기화할 수 있습니다');
    }
    return this.authService.resetClientPassword(id);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '회원 탈퇴 (개인정보 익명화 처리)' })
  async withdrawMe(@Request() req: any) {
    if (req.user.type === 'employee') {
      throw new ForbiddenException('소속 멤버는 직접 탈퇴할 수 없습니다. 소속 회사의 직원 관리 페이지에서 내보내기를 요청하세요.');
    }
    const clientId = req.user.sub;
    if (!clientId) throw new ForbiddenException('회원 계정만 탈퇴할 수 있습니다');
    return this.authService.withdrawClient(clientId);
  }
}
