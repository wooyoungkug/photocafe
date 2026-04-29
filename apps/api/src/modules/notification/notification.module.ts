import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

/**
 * Notification 모듈 — Prisma 와 KakaoAlimtalk 은 모두 @Global 로 등록되어 있어
 * 별도 imports 가 불필요하다. (PrismaModule, KakaoAlimtalkModule 모두 Global)
 */
@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
