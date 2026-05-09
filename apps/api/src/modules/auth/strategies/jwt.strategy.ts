import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { isStaffContextReferer } from '@/common/admin-paths';

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
     *
     * req._jwtTokenSource 에 'staff' | 'client' 를 기록해
     * validate() 에서 aud 클레임 교차 사용 차단에 활용한다.
     */
    const cookieExtractor = (req: any): string | null => {
      const staffToken = req?.cookies?.staff_access_token ?? null;
      const clientToken = req?.cookies?.access_token ?? null;
      if (!staffToken && !clientToken) return null;

      let selectedToken: string | null = null;
      let source: 'staff' | 'client' = 'client';

      if (staffToken && !clientToken) {
        selectedToken = staffToken;
        source = 'staff';
      } else if (!staffToken && clientToken) {
        selectedToken = clientToken;
        source = 'client';
      } else {
        // 둘 다 있을 때 — X-Auth-Context 헤더 우선, 없으면 Referer 폴백.
        // api.ts 가 현재 pathname 기반으로 헤더를 주입한다.
        const authContextHeader = req?.headers?.['x-auth-context'] as string | undefined;

        let isAdminCtx: boolean;
        if (authContextHeader) {
          isAdminCtx = authContextHeader === 'staff';
        } else {
          // Referer 폴백 (직접 fetch / 서버간 호출 등 헤더 없을 때)
          // common/admin-paths.ts 의 STAFF_CONTEXT_PATHS 단일 정의 사용
          isAdminCtx = isStaffContextReferer(req?.headers?.referer);
        }

        if (isAdminCtx) {
          selectedToken = staffToken;
          source = 'staff';
        } else {
          selectedToken = clientToken;
          source = 'client';
        }
      }

      req._jwtTokenSource = source;
      return selectedToken;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: (() => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error('JWT_SECRET 환경변수가 설정되지 않았거나 32자 미만입니다. 앱을 시작할 수 없습니다.');
        }
        return secret;
      })(),
    });
  }

  async validate(req: any, payload: any) {
    // aud 클레임이 있는 신규 토큰: 쿠키 출처와 교차 사용 차단
    // aud 없는 레거시 토큰은 통과 (하위 호환성)
    if (payload.aud) {
      const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
      const source: 'staff' | 'client' | undefined = req._jwtTokenSource;

      if (source === 'staff' && aud !== 'staff') {
        throw new UnauthorizedException('직원 쿠키에 클라이언트 토큰은 사용할 수 없습니다');
      }
      if (source === 'client' && aud === 'staff') {
        throw new UnauthorizedException('클라이언트 쿠키에 직원 토큰은 사용할 수 없습니다');
      }
    }

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
      impersonatedBy: payload.impersonatedBy,
    };
  }
}
