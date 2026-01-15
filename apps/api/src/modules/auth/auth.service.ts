import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

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
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
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
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: client.id,
        email: client.email,
        name: client.clientName,
        role: 'client',
      },
    };
  }
}
