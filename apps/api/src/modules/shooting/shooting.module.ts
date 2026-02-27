import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EmailModule } from '@/common/email/email.module';
import {
  ShootingController,
  ShootingBidController,
  ShootingReviewController,
  PhotographerController,
  LocationController,
} from './controllers';
import {
  ShootingService,
  ShootingBidService,
  ShootingReviewService,
  PhotographerService,
  LocationService,
  ShootingNotificationService,
} from './services';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [
    ShootingController,
    ShootingBidController,
    ShootingReviewController,
    PhotographerController,
    LocationController,
  ],
  providers: [
    ShootingService,
    ShootingBidService,
    ShootingReviewService,
    PhotographerService,
    LocationService,
    ShootingNotificationService,
  ],
  exports: [
    ShootingService,
    ShootingBidService,
    ShootingReviewService,
    PhotographerService,
    LocationService,
  ],
})
export class ShootingModule {}
