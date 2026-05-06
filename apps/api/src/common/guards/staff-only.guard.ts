import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Staff(직원)만 접근 가능한 엔드포인트에 사용하는 가드.
 * JWT payload의 type이 'staff'인 경우에만 통과.
 * @Public() 데코레이터가 붙은 엔드포인트는 건너뜁니다.
 */
@Injectable()
export class StaffOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.type !== 'staff') {
      throw new ForbiddenException('관리자(직원)만 접근할 수 있습니다.');
    }

    return true;
  }
}
