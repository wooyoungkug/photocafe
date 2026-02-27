import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Res,
  UnauthorizedException,
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
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '@/common/decorators/public.decorator';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  RegisterIndividualDto,
  RegisterStudioDto,
  ClientLoginDto,
  AdminLoginDto,
  EmployeeLoginDto,
  EmployeeSelectClientDto,
  StaffRegisterCompanyEmailDto,
  ApproveStaffDto,
  ChangeStaffRoleDto,
  UnifiedLoginDto,
  SelectContextDto,
} from './dto/auth.dto';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '로그인' })
  async login(@Request() req: any, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '회원가입' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '토큰 갱신' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '비밀번호 변경' })
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Patch('reset-client-password/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '관리자용: 회원 비밀번호 초기화 (랜덤 임시 비밀번호)' })
  async resetClientPassword(@Param('clientId') clientId: string, @Request() req: any) {
    // 관리자 권한 확인
    if (req.user.type !== 'staff' && req.user.role !== 'admin') {
      throw new UnauthorizedException('관리자 권한이 필요합니다');
    }
    return this.authService.resetClientPassword(clientId);
  }

  // ========== 통합 로그인 ==========

  @Public()
  @Post('unified-login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '통합 로그인 (이메일/비밀번호)' })
  async unifiedLogin(@Body() dto: UnifiedLoginDto, @Ip() ip: string) {
    const result = await this.authService.unifiedLogin(dto.email, dto.password);
    if (!result) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다');
    }

    const { client, employments } = result;

    // 소속 회사가 없으면 바로 Client 로그인
    if (employments.length === 0) {
      return this.authService.loginClient(client, dto.rememberMe ?? false, ip);
    }

    // 소속 회사가 있으면 컨텍스트 선택 필요
    return {
      needsContextSelection: true,
      tempToken: this.authService.generateTempAuthToken(client),
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
  async selectContext(@Body() dto: SelectContextDto, @Ip() ip: string) {
    return this.authService.loginWithContext(
      dto.tempToken,
      dto.contextType,
      dto.employmentId,
      dto.rememberMe,
      ip,
    );
  }

  // ========== 고객 회원가입/로그인 ==========

  @Public()
  @Post('client/register/individual')
  @ApiOperation({ summary: '개인 고객 회원가입' })
  async registerIndividual(@Body() dto: RegisterIndividualDto) {
    return this.authService.registerIndividual(dto);
  }

  @Public()
  @Post('client/register/studio')
  @ApiOperation({ summary: '스튜디오(B2B) 회원가입' })
  async registerStudio(@Body() dto: RegisterStudioDto) {
    return this.authService.registerStudio(dto);
  }

  @Public()
  @Post('client/login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '고객 로그인' })
  async clientLogin(@Body() dto: ClientLoginDto, @Ip() ip: string) {
    const client = await this.authService.validateClient(dto.email, dto.password);
    if (!client) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다');
    }
    return this.authService.loginClient(client, dto.rememberMe ?? false, ip);
  }

  @Public()
  @Get('client/check-email')
  @ApiOperation({ summary: '이메일 중복 확인' })
  async checkEmail(@Query('email') email: string) {
    const exists = await this.authService.checkEmailExists(email);
    return { exists };
  }

  @Public()
  @Get('client/check-business-number')
  @ApiOperation({ summary: '사업자등록번호 중복 확인' })
  async checkBusinessNumber(@Query('businessNumber') businessNumber: string) {
    const exists = await this.authService.checkBusinessNumberExists(businessNumber);
    return { exists };
  }

  // 네이버 OAuth 로그인 시작
  @Public()
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인' })
  async naverAuth() {
    // Passport가 네이버 로그인 페이지로 리다이렉트
  }

  // 네이버 OAuth 콜백
  @Public()
  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인 콜백' })
  async naverAuthCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    return this.handleOAuthCallback(req.user, frontendUrl, res);
  }

  // 카카오 OAuth 로그인 시작
  @Public()
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인' })
  async kakaoAuth() {
    // Passport가 카카오 로그인 페이지로 리다이렉트
  }

  // 카카오 OAuth 콜백
  @Public()
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  async kakaoAuthCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    return this.handleOAuthCallback(req.user, frontendUrl, res);
  }

  /** OAuth 콜백 공통 처리: Employment 확인 후 적절한 콜백으로 리다이렉트 */
  private async handleOAuthCallback(client: any, frontendUrl: string, res: Response) {
    // Employment(소속 회사) 확인
    const employments = await this.authService.getActiveEmployments(client.id);

    if (employments.length === 0) {
      // 소속 없음 → 바로 Client 로그인
      const tokens = await this.authService.loginClient(client);
      const code = this.authService.generateOAuthCode(tokens);
      return res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
    }

    // 소속 있음 → 컨텍스트 선택 필요
    const tempToken = this.authService.generateTempAuthToken(client);
    return res.redirect(`${frontendUrl}/auth/callback?needsContext=true&tempToken=${encodeURIComponent(tempToken)}`);
  }

  // OAuth 코드 → 토큰 교환
  @Public()
  @Post('exchange-code')
  @ApiOperation({ summary: 'OAuth 인증 코드를 토큰으로 교환' })
  async exchangeCode(@Body('code') code: string) {
    if (!code) {
      throw new UnauthorizedException('인증 코드가 필요합니다.');
    }
    return this.authService.exchangeOAuthCode(code);
  }

  // ========== 거래처 직원(Employee) 로그인 ==========

  @Public()
  @Post('employee/login')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '거래처 직원 로그인' })
  async employeeLogin(@Body() dto: EmployeeLoginDto) {
    const result = await this.authService.validateEmployee(dto.email, dto.password);
    if (!result) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다');
    }

    // 단일 거래처 소속
    if ('employment' in result) {
      return this.authService.loginEmployee(
        result.user,
        result.employment,
        dto.rememberMe ?? false,
      );
    }

    // 복수 거래처 소속 → 선택 필요
    return {
      multipleClients: true,
      userId: result.user.id,
      employments: result.employments.map((e: any) => ({
        employmentId: e.id,
        clientId: e.companyClientId,
        clientName: e.company.clientName,
        role: e.role,
      })),
    };
  }

  @Public()
  @Post('employee/select-client')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: '거래처 직원 다중 거래처 선택 로그인' })
  async employeeSelectClient(@Body() dto: EmployeeSelectClientDto) {
    return this.authService.loginEmployeeBySelection(
      dto.userId,
      dto.employmentId,
      dto.rememberMe ?? false,
    );
  }

  // ========== 관리자(직원) 로그인 ==========

  @Public()
  @Post('admin/login')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: '관리자(직원) 로그인' })
  async adminLogin(@Body() dto: AdminLoginDto, @Request() req: any) {
    const staff = await this.authService.validateStaff(dto.staffId, dto.password);
    if (!staff) {
      throw new UnauthorizedException('직원 ID 또는 비밀번호가 일치하지 않습니다');
    }
    const ip = req.headers['x-forwarded-for'] || req.ip;
    return this.authService.loginStaff(staff, dto.rememberMe ?? false, ip);
  }

  // ========== 직원 소셜 로그인 ==========

  @Public()
  @Get('staff/naver')
  @UseGuards(AuthGuard('staff-naver'))
  @ApiOperation({ summary: '직원 네이버 소셜 로그인' })
  async staffNaverAuth() {
    // Passport가 네이버 로그인 페이지로 리다이렉트
  }

  @Public()
  @Get('staff/naver/callback')
  @UseGuards(AuthGuard('staff-naver'))
  @ApiOperation({ summary: '직원 네이버 소셜 로그인 콜백' })
  async staffNaverCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    const result = await this.authService.loginStaffOAuth(req.user);

    if (result.status === 'pending') {
      return res.redirect(`${frontendUrl}/auth/staff/pending?staffId=${req.user.id}`);
    }

    const code = this.authService.generateOAuthCode(result as any);
    return res.redirect(`${frontendUrl}/auth/staff/callback?code=${code}`);
  }

  @Public()
  @Get('staff/kakao')
  @UseGuards(AuthGuard('staff-kakao'))
  @ApiOperation({ summary: '직원 카카오 소셜 로그인' })
  async staffKakaoAuth() {
    // Passport가 카카오 로그인 페이지로 리다이렉트
  }

  @Public()
  @Get('staff/kakao/callback')
  @UseGuards(AuthGuard('staff-kakao'))
  @ApiOperation({ summary: '직원 카카오 소셜 로그인 콜백' })
  async staffKakaoCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    const result = await this.authService.loginStaffOAuth(req.user);

    if (result.status === 'pending') {
      return res.redirect(`${frontendUrl}/auth/staff/pending?staffId=${req.user.id}`);
    }

    const code = this.authService.generateOAuthCode(result as any);
    return res.redirect(`${frontendUrl}/auth/staff/callback?code=${code}`);
  }

  @Public()
  @Get('staff/google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '직원 구글 소셜 로그인' })
  async staffGoogleAuth() {
    // Passport가 구글 로그인 페이지로 리다이렉트
  }

  @Public()
  @Get('staff/google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '직원 구글 소셜 로그인 콜백' })
  async staffGoogleCallback(@Request() req: any, @Res() res: Response) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    const result = await this.authService.loginStaffOAuth(req.user);

    if (result.status === 'pending') {
      return res.redirect(`${frontendUrl}/auth/staff/pending?staffId=${req.user.id}`);
    }

    const code = this.authService.generateOAuthCode(result as any);
    return res.redirect(`${frontendUrl}/auth/staff/callback?code=${code}`);
  }

  @Public()
  @Post('staff/register')
  @ApiOperation({ summary: '직원 회사 이메일 등록 (소셜 로그인 후)' })
  async staffRegisterCompanyEmail(
    @Body() dto: StaffRegisterCompanyEmailDto,
    @Body('staffId') staffId: string,
  ) {
    if (!staffId) {
      throw new UnauthorizedException('직원 ID가 필요합니다');
    }
    return this.authService.registerStaffCompanyEmail(staffId, dto.companyEmail);
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
  async approveStaff(
    @Param('id') id: string,
    @Body() dto: ApproveStaffDto,
    @Request() req: any,
  ) {
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
  async changeStaffRole(
    @Param('id') id: string,
    @Body() dto: ChangeStaffRoleDto,
    @Request() req: any,
  ) {
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
  async impersonateStaff(
    @Param('staffId') staffId: string,
    @Request() req: any,
  ) {
    if (req.user.type !== 'staff') {
      throw new UnauthorizedException('직원 계정만 대리 로그인할 수 있습니다');
    }
    return this.authService.impersonateStaff(staffId, req.user.sub);
  }

  @Post('impersonate/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '관리자가 특정 회원으로 대리 로그인' })
  async impersonateClient(
    @Param('clientId') clientId: string,
    @Request() req: any,
  ) {
    // 관리자 권한 확인 (type이 staff이거나 role이 admin)
    if (req.user.type !== 'staff' && req.user.role !== 'admin') {
      throw new UnauthorizedException('관리자 권한이 필요합니다');
    }
    return this.authService.impersonateClient(clientId, req.user.sub);
  }
}

