import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  RECRUITMENT_STATUS,
  RECRUITMENT_PHASE,
  URGENCY_THRESHOLDS,
  URGENCY_LEVEL,
} from '../constants/recruitment.constants';
import { RecruitmentNotificationService } from './recruitment-notification.service';

@Injectable()
export class RecruitmentSchedulerService {
  private readonly logger = new Logger(RecruitmentSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: RecruitmentNotificationService,
  ) {}

  /**
   * 10분마다 실행:
   * 1. 전속 모집 마감 → 공개 전환
   * 2. 긴급도 자동 업데이트
   */
  @Cron('*/10 * * * *', { timeZone: 'Asia/Seoul' })
  async checkDeadlines() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.autoTransitionToPublic();
      await this.updateUrgencyLevels();
    } catch (err) {
      this.logger.error(`스케줄러 오류: ${(err as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 전속 모집 마감 자동 전환 → 공개 모집
   */
  private async autoTransitionToPublic() {
    const now = new Date();

    const expiredPrivate = await this.prisma.recruitment.findMany({
      where: {
        status: RECRUITMENT_STATUS.PRIVATE_RECRUITING,
        privateDeadline: { lte: now },
      },
      include: { client: { select: { clientName: true } } },
    });

    for (const recruitment of expiredPrivate) {
      try {
        await this.prisma.recruitment.update({
          where: { id: recruitment.id },
          data: {
            status: RECRUITMENT_STATUS.PUBLIC_RECRUITING,
            recruitmentPhase: RECRUITMENT_PHASE.PUBLIC,
          },
        });

        // 비동기: 지역우선 공개 구인 알림 (희망지역 기반 100명 타겟팅)
        this.notificationService
          .sendPublicRecruitingNotificationWithRegionPriority({
            id: recruitment.id,
            title: recruitment.title,
            shootingType: recruitment.shootingType,
            shootingDate: recruitment.shootingDate,
            shootingTime: recruitment.shootingTime || undefined,
            duration: recruitment.duration || undefined,
            venueName: recruitment.venueName,
            venueAddress: recruitment.venueAddress || undefined,
            budget: recruitment.budget || undefined,
            clientName: recruitment.client.clientName,
          })
          .catch((err) =>
            this.logger.error(`공개 전환 알림 실패: ${(err as Error).message}`),
          );

        this.logger.log(
          `자동 공개 전환: ${recruitment.id} (${recruitment.title})`,
        );
      } catch (err) {
        this.logger.error(
          `공개 전환 실패 (${recruitment.id}): ${(err as Error).message}`,
        );
      }
    }

    if (expiredPrivate.length > 0) {
      this.logger.log(`전속 → 공개 자동 전환: ${expiredPrivate.length}건`);
    }
  }

  /**
   * 긴급도 자동 업데이트
   */
  private async updateUrgencyLevels() {
    const now = new Date();
    const emergencyCutoff = new Date(
      now.getTime() + URGENCY_THRESHOLDS.EMERGENCY_DAYS * 24 * 60 * 60 * 1000,
    );
    const urgentCutoff = new Date(
      now.getTime() + URGENCY_THRESHOLDS.URGENT_DAYS * 24 * 60 * 60 * 1000,
    );

    // 1일 이내 → emergency
    await this.prisma.recruitment.updateMany({
      where: {
        status: {
          in: [
            RECRUITMENT_STATUS.PRIVATE_RECRUITING,
            RECRUITMENT_STATUS.PUBLIC_RECRUITING,
          ],
        },
        shootingDate: { lte: emergencyCutoff },
        urgencyLevel: { not: URGENCY_LEVEL.EMERGENCY },
      },
      data: { urgencyLevel: URGENCY_LEVEL.EMERGENCY },
    });

    // 3일 이내 → urgent
    await this.prisma.recruitment.updateMany({
      where: {
        status: {
          in: [
            RECRUITMENT_STATUS.PRIVATE_RECRUITING,
            RECRUITMENT_STATUS.PUBLIC_RECRUITING,
          ],
        },
        shootingDate: { gt: emergencyCutoff, lte: urgentCutoff },
        urgencyLevel: URGENCY_LEVEL.NORMAL,
      },
      data: { urgencyLevel: URGENCY_LEVEL.URGENT },
    });
  }
}
