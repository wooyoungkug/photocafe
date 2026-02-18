import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class DepositPermissionGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new UnauthorizedException('인증되지 않은 사용자입니다');
    }

    // Staff 권한 조회
    const staff = await this.prisma.staff.findUnique({
      where: { id: user.id },
      select: { canChangeDepositStage: true },
    });

    if (!staff || !staff.canChangeDepositStage) {
      throw new ForbiddenException('입금 관리 권한이 없습니다');
    }

    return true;
  }
}
