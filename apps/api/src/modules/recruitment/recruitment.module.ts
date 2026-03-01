import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SystemSettingsModule } from '@/modules/system-settings/system-settings.module';
import {
  RecruitmentController,
  RecruitmentBidController,
  PhotographerProfileController,
} from './controllers';
import {
  RecruitmentService,
  RecruitmentBidService,
  RecruitmentSchedulerService,
  RecruitmentNotificationService,
  RegionMatchingService,
  PhotographerProfileService,
} from './services';

@Module({
  imports: [PrismaModule, SystemSettingsModule],
  controllers: [
    RecruitmentController,
    RecruitmentBidController,
    PhotographerProfileController,
  ],
  providers: [
    RecruitmentService,
    RecruitmentBidService,
    RecruitmentSchedulerService,
    RecruitmentNotificationService,
    RegionMatchingService,
    PhotographerProfileService,
  ],
  exports: [RecruitmentService, RecruitmentBidService],
})
export class RecruitmentModule {}
