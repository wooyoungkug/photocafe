import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';

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
}
