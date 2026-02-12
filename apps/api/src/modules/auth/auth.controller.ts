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
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  RegisterIndividualDto,
  RegisterStudioDto,
  ClientLoginDto,
  AdminLoginDto,
} from './dto/auth.dto';


@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) { }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: '로그인' })
  async login(@Request() req: any, @Body() loginDto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
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
  @ApiOperation({ summary: '관리자용: 회원 비밀번호 초기화 (123456으로 초기화)' })
  async resetClientPassword(@Param('clientId') clientId: string, @Request() req: any) {
    // 관리자 권한 확인
    if (req.user.type !== 'staff' && req.user.role !== 'admin') {
      throw new UnauthorizedException('관리자 권한이 필요합니다');
    }
    return this.authService.resetClientPassword(clientId);
  }

  // ========== 고객 회원가입/로그인 ==========

  @Post('client/register/individual')
  @ApiOperation({ summary: '개인 고객 회원가입' })
  async registerIndividual(@Body() dto: RegisterIndividualDto) {
    return this.authService.registerIndividual(dto);
  }

  @Post('client/register/studio')
  @ApiOperation({ summary: '스튜디오(B2B) 회원가입' })
  async registerStudio(@Body() dto: RegisterStudioDto) {
    return this.authService.registerStudio(dto);
  }

  @Post('client/login')
  @ApiOperation({ summary: '고객 로그인' })
  async clientLogin(@Body() dto: ClientLoginDto) {
    const client = await this.authService.validateClient(dto.email, dto.password);
    if (!client) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 일치하지 않습니다');
    }
    return this.authService.loginClient(client);
  }

  @Get('client/check-email')
  @ApiOperation({ summary: '이메일 중복 확인' })
  async checkEmail(@Query('email') email: string) {
    const exists = await this.authService.checkEmailExists(email);
    return { exists };
  }

  @Get('client/check-business-number')
  @ApiOperation({ summary: '사업자등록번호 중복 확인' })
  async checkBusinessNumber(@Query('businessNumber') businessNumber: string) {
    const exists = await this.authService.checkBusinessNumberExists(businessNumber);
    return { exists };
  }

  // 네이버 OAuth 로그인 시작
  @Get('naver')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인' })
  async naverAuth() {
    // Passport가 네이버 로그인 페이지로 리다이렉트
  }

  // 네이버 OAuth 콜백
  @Get('naver/callback')
  @UseGuards(AuthGuard('naver'))
  @ApiOperation({ summary: '네이버 로그인 콜백' })
  async naverAuthCallback(@Request() req: any, @Res() res: Response) {
    // 네이버 로그인 성공 시 JWT 토큰 발급
    const tokens = await this.authService.loginClient(req.user);

    // 프론트엔드로 토큰과 함께 리다이렉트
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&userId=${tokens.user.id}&userName=${encodeURIComponent(tokens.user.name)}&userEmail=${encodeURIComponent(tokens.user.email)}`;

    return res.redirect(redirectUrl);
  }

  // 카카오 OAuth 로그인 시작
  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인' })
  async kakaoAuth() {
    // Passport가 카카오 로그인 페이지로 리다이렉트
  }

  // 카카오 OAuth 콜백
  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  async kakaoAuthCallback(@Request() req: any, @Res() res: Response) {
    // 카카오 로그인 성공 시 JWT 토큰 발급
    const tokens = await this.authService.loginClient(req.user);

    // 프론트엔드로 토큰과 함께 리다이렉트
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3002';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}&userId=${tokens.user.id}&userName=${encodeURIComponent(tokens.user.name)}&userEmail=${encodeURIComponent(tokens.user.email)}`;

    return res.redirect(redirectUrl);
  }

  // ========== 관리자(직원) 로그인 ==========

  @Post('admin/login')
  @ApiOperation({ summary: '관리자(직원) 로그인' })
  async adminLogin(@Body() dto: AdminLoginDto, @Request() req: any) {
    const staff = await this.authService.validateStaff(dto.staffId, dto.password);
    if (!staff) {
      throw new UnauthorizedException('직원 ID 또는 비밀번호가 일치하지 않습니다');
    }
    const ip = req.headers['x-forwarded-for'] || req.ip;
    return this.authService.loginStaff(staff, dto.rememberMe ?? false, ip);
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

