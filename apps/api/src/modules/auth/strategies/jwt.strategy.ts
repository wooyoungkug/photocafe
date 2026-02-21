import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET 환경변수가 설정되지 않았거나 32자 미만입니다. 앱을 시작할 수 없습니다.');
        }
        return secret;
      })(),
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      staffId: payload.staffId,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
    };
  }
}
