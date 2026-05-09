import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    /**
     * Cookie 분리 대응 추출기.
     *   - staff cookie : `staff_access_token`
     *   - client/employee cookie : `access_token`
     *
     * Referer 가 admin 영역(/dashboard, /admin-login)이면 staff cookie 우선,
     * mypage/쇼핑몰 등이면 client cookie 우선. 한 쪽만 있을 땐 그대로 사용.
     * 같은 브라우저에서 admin과 일반 회원이 동시 로그인되어 있어도
     * 각자 자기 컨텍스트에 맞는 토큰을 사용한다.
     */
    const cookieExtractor = (req: any): string | null => {
      const staffToken = req?.cookies?.staff_access_token ?? null;
      const clientToken = req?.cookies?.access_token ?? null;
      if (!staffToken && !clientToken) return null;
      if (staffToken && !clientToken) return staffToken;
      if (!staffToken && clientToken) return clientToken;
      // 둘 다 있을 때 — Referer 기반으로 결정.
      // middleware.ts 의 ADMIN_PATHS 와 동기화 유지.
      const referer: string = req?.headers?.referer || '';
      const isAdminCtx =
        /\/(dashboard|admin-login|admin|settings|orders|company|production|accounting|statistics|cs|schedule|shooting|hr-committee|leave|master|analytics|pricing|impositions|delivery)/.test(
          referer,
        );
      return isAdminCtx ? staffToken : clientToken;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
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
      name: payload.name,
      role: payload.role,
      type: payload.type,
      staffId: payload.staffId,
      branchId: payload.branchId,
      departmentId: payload.departmentId,
      // Employee fields
      clientId: payload.clientId,
      employmentId: payload.employmentId,
      isOwner: payload.isOwner ?? false,
      canViewAllOrders: payload.canViewAllOrders,
      canManageProducts: payload.canManageProducts,
      canViewSettlement: payload.canViewSettlement,
    };
  }
}
