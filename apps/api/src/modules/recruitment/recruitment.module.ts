import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SystemSettingsModule } from '@/modules/system-settings/system-settings.module';
import { ShootingModule } from '@/modules/shooting/shooting.module';
import {
  RecruitmentController,
  RecruitmentBidController,
  BidReviewController,
  PhotographerProfileController,
  RecruitmentTemplateController,
  ChatMessageController,
} from './controllers';
import {
  RecruitmentService,
  RecruitmentBidService,
  BidReviewService,
  RecruitmentSchedulerService,
  RecruitmentNotificationService,
  RegionMatchingService,
  PhotographerProfileService,
  RecruitmentTemplateService,
  ChatMessageService,
} from './services';

@Module({
  imports: [PrismaModule, SystemSettingsModule, forwardRef(() => ShootingModule)],
  controllers: [
    RecruitmentController,
    RecruitmentBidController,
    BidReviewController,
    PhotographerProfileController,
    RecruitmentTemplateController,
    ChatMessageController,
  ],
  providers: [
    RecruitmentService,
    RecruitmentBidService,
    BidReviewService,
    RecruitmentSchedulerService,
    RecruitmentNotificationService,
    RegionMatchingService,
    PhotographerProfileService,
    RecruitmentTemplateService,
    ChatMessageService,
  ],
  exports: [RecruitmentService, RecruitmentBidService],
})
export class RecruitmentModule {}
