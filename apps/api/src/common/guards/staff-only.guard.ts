import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Staff(직원)만 접근 가능한 엔드포인트에 사용하는 가드.
 * JWT payload의 type이 'STAFF'인 경우에만 통과.
 */
@Injectable()
export class StaffOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.type !== 'staff') {
      throw new ForbiddenException('관리자(직원)만 접근할 수 있습니다.');
    }

    return true;
  }
}
