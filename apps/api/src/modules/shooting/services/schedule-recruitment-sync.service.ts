import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SHOOTING_STATUS } from '../constants/shooting.constants';
import {
  RECRUITMENT_STATUS,
  RECRUITMENT_PHASE,
} from '../../recruitment/constants/recruitment.constants';

/**
 * 일정관리(ShootingSchedule) ↔ 구인방(Recruitment) 양방향 동기화 서비스
 *
 * - 구인 등록 → 일정관리 자동 생성 (항상)
 * - 일정 등록 → 구인방 자동 생성 (enableRecruitment 옵션)
 * - 공통 필드 업데이트 동기화
 * - 상태 변경 동기화
 */
@Injectable()
export class ScheduleRecruitmentSyncService {
  private readonly logger = new Logger(ScheduleRecruitmentSyncService.name);

  /** 동기화 중 순환 방지 플래그 */
  private isSyncing = false;

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 상태 매핑 ====================

  /** Recruitment status → ShootingSchedule status */
  private mapRecruitmentToShootingStatus(
    recruitmentStatus: string,
  ): string | null {
    const map: Record<string, string> = {
      draft: SHOOTING_STATUS.DRAFT,
      private_recruiting: SHOOTING_STATUS.RECRUITING,
      public_recruiting: SHOOTING_STATUS.RECRUITING,
      filled: SHOOTING_STATUS.CONFIRMED,
      cancelled: SHOOTING_STATUS.CANCELLED,
    };
    return map[recruitmentStatus] || null;
  }

  /** ShootingSchedule status → Recruitment status */
  private mapShootingToRecruitmentStatus(
    shootingStatus: string,
  ): string | null {
    const map: Record<string, string> = {
      draft: RECRUITMENT_STATUS.DRAFT,
      recruiting: RECRUITMENT_STATUS.PRIVATE_RECRUITING,
      confirmed: RECRUITMENT_STATUS.FILLED,
      cancelled: RECRUITMENT_STATUS.CANCELLED,
    };
    return map[shootingStatus] || null;
  }

  // ==================== 구인방 → 일정관리 ====================

  /**
   * 구인 등록 시 일정관리에 자동 생성
   * @param recruitmentId 생성된 구인방 ID
   * @param adminId 관리자 ID (일정관리 createdBy)
   */
  async syncRecruitmentToShooting(
    recruitmentId: string,
    adminId: string,
  ) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const recruitment = await this.prisma.recruitment.findUnique({
        where: { id: recruitmentId },
      });

      if (!recruitment || recruitment.linkedShootingId) return;

      // shootingDate 합성: Recruitment의 shootingDate + shootingTime
      let shootingDate = recruitment.shootingDate;
      if (recruitment.shootingTime) {
        const dateStr = recruitment.shootingDate
          .toISOString()
          .substring(0, 10);
        shootingDate = new Date(`${dateStr}T${recruitment.shootingTime}:00`);
      }

      const shooting = await this.prisma.shootingSchedule.create({
        data: {
          clientName: recruitment.customerName || '',
          shootingType: recruitment.shootingType,
          venueName: recruitment.venueName,
          venueAddress: recruitment.venueAddress || '',
          latitude: recruitment.latitude,
          longitude: recruitment.longitude,
          shootingDate,
          duration: recruitment.duration,
          status: this.mapRecruitmentToShootingStatus(recruitment.status) || SHOOTING_STATUS.DRAFT,
          maxBidders: recruitment.maxBidders,
          linkedRecruitmentId: recruitment.id,
          createdBy: adminId,
        },
      });

      // Recruitment에 linkedShootingId 설정
      await this.prisma.recruitment.update({
        where: { id: recruitmentId },
        data: { linkedShootingId: shooting.id },
      });

      this.logger.log(
        `Synced Recruitment(${recruitmentId}) → ShootingSchedule(${shooting.id})`,
      );

      return shooting;
    } catch (error) {
      this.logger.error(
        `Failed to sync Recruitment → Shooting: ${(error as Error).message}`,
      );
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== 일정관리 → 구인방 ====================

  /**
   * 일정 등록 시 구인방에 자동 생성 (enableRecruitment 옵션)
   */
  async syncShootingToRecruitment(
    shootingId: string,
    options: {
      clientId: string;
      title?: string;
      budget?: number;
      description?: string;
      requirements?: string;
      privateDeadlineHours?: number;
    },
  ) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const shooting = await this.prisma.shootingSchedule.findUnique({
        where: { id: shootingId },
      });

      if (!shooting || shooting.linkedRecruitmentId) return;

      // shootingDate에서 date/time 분리
      const dateStr = shooting.shootingDate.toISOString().substring(0, 10);
      const h = shooting.shootingDate.getHours();
      const m = shooting.shootingDate.getMinutes();
      const shootingTime =
        h === 0 && m === 0
          ? null
          : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      const recruitment = await this.prisma.recruitment.create({
        data: {
          clientId: options.clientId,
          title:
            options.title ||
            `${shooting.shootingType} ${dateStr} 작가 구인`,
          shootingType: shooting.shootingType,
          shootingDate: shooting.shootingDate,
          shootingTime,
          duration: shooting.duration,
          venueName: shooting.venueName,
          venueAddress: shooting.venueAddress,
          latitude: shooting.latitude,
          longitude: shooting.longitude,
          budget: options.budget,
          description: options.description,
          requirements: options.requirements,
          customerName: shooting.clientName,
          privateDeadlineHours: options.privateDeadlineHours ?? 24,
          status: RECRUITMENT_STATUS.DRAFT,
          recruitmentPhase: RECRUITMENT_PHASE.PRIVATE,
          maxBidders: shooting.maxBidders,
          linkedShootingId: shooting.id,
          createdBy: options.clientId,
        },
      });

      // ShootingSchedule에 linkedRecruitmentId 설정
      await this.prisma.shootingSchedule.update({
        where: { id: shootingId },
        data: { linkedRecruitmentId: recruitment.id },
      });

      this.logger.log(
        `Synced ShootingSchedule(${shootingId}) → Recruitment(${recruitment.id})`,
      );

      return recruitment;
    } catch (error) {
      this.logger.error(
        `Failed to sync Shooting → Recruitment: ${(error as Error).message}`,
      );
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== 필드 동기화 ====================

  /**
   * 공통 필드 변경 시 양쪽 동기화
   */
  async syncFieldUpdate(
    sourceType: 'recruitment' | 'shooting',
    sourceId: string,
    updatedFields: Record<string, any>,
  ) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      if (sourceType === 'recruitment') {
        const recruitment = await this.prisma.recruitment.findUnique({
          where: { id: sourceId },
          select: { linkedShootingId: true },
        });

        if (!recruitment?.linkedShootingId) return;

        // Recruitment → ShootingSchedule 필드 매핑
        const shootingUpdate: Record<string, any> = {};
        if (updatedFields.shootingType !== undefined)
          shootingUpdate.shootingType = updatedFields.shootingType;
        if (updatedFields.shootingDate !== undefined || updatedFields.shootingTime !== undefined) {
          // 날짜+시간 합성
          const rec = await this.prisma.recruitment.findUnique({
            where: { id: sourceId },
          });
          if (rec) {
            let date = rec.shootingDate;
            if (rec.shootingTime) {
              const d = rec.shootingDate.toISOString().substring(0, 10);
              date = new Date(`${d}T${rec.shootingTime}:00`);
            }
            shootingUpdate.shootingDate = date;
          }
        }
        if (updatedFields.duration !== undefined)
          shootingUpdate.duration = updatedFields.duration;
        if (updatedFields.venueName !== undefined)
          shootingUpdate.venueName = updatedFields.venueName;
        if (updatedFields.venueAddress !== undefined)
          shootingUpdate.venueAddress = updatedFields.venueAddress;
        if (updatedFields.latitude !== undefined)
          shootingUpdate.latitude = updatedFields.latitude;
        if (updatedFields.longitude !== undefined)
          shootingUpdate.longitude = updatedFields.longitude;
        if (updatedFields.customerName !== undefined)
          shootingUpdate.clientName = updatedFields.customerName;
        if (updatedFields.maxBidders !== undefined)
          shootingUpdate.maxBidders = updatedFields.maxBidders;

        if (Object.keys(shootingUpdate).length > 0) {
          await this.prisma.shootingSchedule.update({
            where: { id: recruitment.linkedShootingId },
            data: shootingUpdate,
          });
        }
      } else {
        // shooting → recruitment
        const shooting = await this.prisma.shootingSchedule.findUnique({
          where: { id: sourceId },
          select: { linkedRecruitmentId: true },
        });

        if (!shooting?.linkedRecruitmentId) return;

        const recruitmentUpdate: Record<string, any> = {};
        if (updatedFields.shootingType !== undefined)
          recruitmentUpdate.shootingType = updatedFields.shootingType;
        if (updatedFields.shootingDate !== undefined) {
          const date = new Date(updatedFields.shootingDate);
          recruitmentUpdate.shootingDate = date;
          const h = date.getHours();
          const m = date.getMinutes();
          recruitmentUpdate.shootingTime =
            h === 0 && m === 0
              ? null
              : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        if (updatedFields.duration !== undefined)
          recruitmentUpdate.duration = updatedFields.duration;
        if (updatedFields.venueName !== undefined)
          recruitmentUpdate.venueName = updatedFields.venueName;
        if (updatedFields.venueAddress !== undefined)
          recruitmentUpdate.venueAddress = updatedFields.venueAddress;
        if (updatedFields.latitude !== undefined)
          recruitmentUpdate.latitude = updatedFields.latitude;
        if (updatedFields.longitude !== undefined)
          recruitmentUpdate.longitude = updatedFields.longitude;
        if (updatedFields.clientName !== undefined)
          recruitmentUpdate.customerName = updatedFields.clientName;
        if (updatedFields.maxBidders !== undefined)
          recruitmentUpdate.maxBidders = updatedFields.maxBidders;

        if (Object.keys(recruitmentUpdate).length > 0) {
          await this.prisma.recruitment.update({
            where: { id: shooting.linkedRecruitmentId },
            data: recruitmentUpdate,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync field update: ${(error as Error).message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== 상태 동기화 ====================

  /**
   * 상태 변경 시 양쪽 동기화
   */
  async syncStatusChange(
    sourceType: 'recruitment' | 'shooting',
    sourceId: string,
    newStatus: string,
  ) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      if (sourceType === 'recruitment') {
        const recruitment = await this.prisma.recruitment.findUnique({
          where: { id: sourceId },
          select: { linkedShootingId: true },
        });
        if (!recruitment?.linkedShootingId) return;

        const mappedStatus =
          this.mapRecruitmentToShootingStatus(newStatus);
        if (mappedStatus) {
          await this.prisma.shootingSchedule.update({
            where: { id: recruitment.linkedShootingId },
            data: { status: mappedStatus },
          });
        }
      } else {
        const shooting = await this.prisma.shootingSchedule.findUnique({
          where: { id: sourceId },
          select: { linkedRecruitmentId: true },
        });
        if (!shooting?.linkedRecruitmentId) return;

        const mappedStatus =
          this.mapShootingToRecruitmentStatus(newStatus);
        if (mappedStatus) {
          await this.prisma.recruitment.update({
            where: { id: shooting.linkedRecruitmentId },
            data: { status: mappedStatus },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to sync status change: ${(error as Error).message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== 작가 확정 동기화 ====================

  /**
   * 구인방에서 외부 작가 확정 시 일정관리에 반영
   */
  async syncBidSelection(
    recruitmentId: string,
    selectedClientId: string,
  ) {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const recruitment = await this.prisma.recruitment.findUnique({
        where: { id: recruitmentId },
        select: { linkedShootingId: true },
      });
      if (!recruitment?.linkedShootingId) return;

      await this.prisma.shootingSchedule.update({
        where: { id: recruitment.linkedShootingId },
        data: {
          status: SHOOTING_STATUS.CONFIRMED,
          assignedClientId: selectedClientId,
        },
      });

      this.logger.log(
        `Synced bid selection: Recruitment(${recruitmentId}) → ShootingSchedule confirmed, assignedClientId=${selectedClientId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to sync bid selection: ${(error as Error).message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  // ==================== 연동 해제 ====================

  /**
   * 한쪽 삭제 시 연동 해제 (상대측은 유지)
   */
  async unlinkRecords(
    sourceType: 'recruitment' | 'shooting',
    sourceId: string,
  ) {
    try {
      if (sourceType === 'recruitment') {
        const recruitment = await this.prisma.recruitment.findUnique({
          where: { id: sourceId },
          select: { linkedShootingId: true },
        });
        if (recruitment?.linkedShootingId) {
          await this.prisma.shootingSchedule.update({
            where: { id: recruitment.linkedShootingId },
            data: { linkedRecruitmentId: null },
          });
        }
      } else {
        const shooting = await this.prisma.shootingSchedule.findUnique({
          where: { id: sourceId },
          select: { linkedRecruitmentId: true },
        });
        if (shooting?.linkedRecruitmentId) {
          await this.prisma.recruitment.update({
            where: { id: shooting.linkedRecruitmentId },
            data: { linkedShootingId: null },
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to unlink records: ${(error as Error).message}`);
    }
  }
}
