import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * 거래처 소유자 또는 MANAGER 직원만 접근 가능한 가드.
 * clientId는 route param(:clientId), body.clientId, 또는 query.clientId에서 추출.
 */
@Injectable()
export class ClientOwnerOrManagerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const clientId =
      request.params.clientId ||
      request.body?.clientId ||
      request.query?.clientId;

    // 거래처 소유자: type==='client' && sub===clientId
    if (user.type === 'client' && user.sub === clientId) {
      return true;
    }

    // MANAGER 직원: type==='employee' && role==='MANAGER' && clientId 일치
    if (
      user.type === 'employee' &&
      user.role === 'MANAGER' &&
      user.clientId === clientId
    ) {
      return true;
    }

    throw new ForbiddenException(
      '거래처 소유자 또는 관리자 직원만 접근할 수 있습니다.',
    );
  }
}
