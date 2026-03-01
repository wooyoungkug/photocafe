import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SystemSettingsService } from '@/modules/system-settings/system-settings.service';
import {
  PROVINCE_SUFFIXES,
  DISTRICT_SUFFIXES,
  REGION_MATCHING_CONFIG,
} from '../constants/korean-regions.constants';

export interface MatchedPhotographer {
  clientId: string;
  clientName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  regionTier: number;
  matchedRegion: string;
}

export interface MatchingResult {
  photographers: MatchedPhotographer[];
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  skippedConflicts: number;
  extractedRegion: string | null;
}

@Injectable()
export class RegionMatchingService {
  private readonly logger = new Logger(RegionMatchingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemSettings: SystemSettingsService,
  ) {}

  /**
   * 한국 주소에서 "시/도 시/군/구" 추출
   * 예: "서울특별시 강남구 역삼동 123-45" → "서울특별시 강남구"
   */
  extractRegion(address: string): string | null {
    if (!address) return null;

    const tokens = address.trim().split(/\s+/);
    if (tokens.length < 2) return null;

    let province: string | null = null;
    let district: string | null = null;

    for (const token of tokens) {
      // 시/도 판별
      if (!province) {
        const isProvince = PROVINCE_SUFFIXES.some((suffix) =>
          token.endsWith(suffix),
        );
        if (isProvince) {
          province = token;
          continue;
        }
      }

      // 시/군/구 판별 (시/도 이후)
      if (province && !district) {
        const isDistrict = DISTRICT_SUFFIXES.some((suffix) =>
          token.endsWith(suffix),
        );
        if (isDistrict) {
          district = token;
          break;
        }
      }
    }

    if (province && district) {
      return `${province} ${district}`;
    }

    return province || null;
  }

  /**
   * 지역 우선순위 기반 포토그래퍼 매칭
   * Tier 1 → Tier 2 → Tier 3 순으로 100명까지 채움
   */
  async findMatchingPhotographers(
    recruitmentId: string,
    venueAddress: string,
    shootingDate: Date,
    shootingTime: string | null,
    duration: number | null,
  ): Promise<MatchingResult> {
    // 시스템 설정에서 발송 인원수 조회 (대시보드에서 설정 가능, 기본값 100)
    const targetCount = await this.systemSettings.getNumericValue(
      'recruitment_target_count',
      REGION_MATCHING_CONFIG.TARGET_COUNT,
    );
    const extractedRegion = this.extractRegion(venueAddress);

    if (!extractedRegion) {
      this.logger.warn(
        `주소에서 지역 추출 실패: "${venueAddress}" → fallback 필요`,
      );
      return {
        photographers: [],
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        skippedConflicts: 0,
        extractedRegion: null,
      };
    }

    this.logger.log(`지역 추출: "${venueAddress}" → "${extractedRegion}"`);

    // 이미 알림 받은 수신자 ID 조회
    const alreadyNotified = await this.prisma.recruitmentNotificationLog.findMany({
      where: { recruitmentId },
      select: { recipientId: true },
    });
    const notifiedIds = new Set(alreadyNotified.map((n) => n.recipientId));

    const collected: MatchedPhotographer[] = [];
    let skippedConflicts = 0;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;

    // Tier 1, 2, 3 순서대로 조회
    for (const tier of [1, 2, 3] as const) {
      if (collected.length >= targetCount) break;

      const remaining = targetCount - collected.length;
      const collectedIds = new Set(collected.map((p) => p.clientId));

      const regionField =
        tier === 1
          ? 'preferredRegion1'
          : tier === 2
            ? 'preferredRegion2'
            : 'preferredRegion3';

      // 해당 tier의 희망지역이 일치하는 포토그래퍼 조회
      const profiles = await this.prisma.photographerProfile.findMany({
        where: {
          [regionField]: extractedRegion,
          isAvailableForPublic: true,
          clientId: {
            notIn: [...notifiedIds, ...collectedIds],
          },
        },
        include: {
          client: {
            select: {
              id: true,
              clientName: true,
              email: true,
              phone: true,
              mobile: true,
            },
          },
        },
        take: remaining + 50, // 충돌 제외 여유분
      });

      for (const profile of profiles) {
        if (collected.length >= targetCount) break;

        // 촬영시간 충돌 체크
        const hasConflict = await this.hasScheduleConflict(
          profile.clientId,
          shootingDate,
          shootingTime,
          duration,
        );

        if (hasConflict) {
          skippedConflicts++;
          continue;
        }

        collected.push({
          clientId: profile.client.id,
          clientName: profile.client.clientName,
          email: profile.client.email || undefined,
          phone: profile.client.phone || undefined,
          mobile: profile.client.mobile || undefined,
          regionTier: tier,
          matchedRegion: extractedRegion,
        });
      }

      // 각 tier별 카운트
      const tierPhotographers = collected.filter((p) => p.regionTier === tier);
      if (tier === 1) tier1Count = tierPhotographers.length;
      else if (tier === 2) tier2Count = tierPhotographers.length;
      else tier3Count = tierPhotographers.length;
    }

    this.logger.log(
      `지역 매칭 결과: 총 ${collected.length}명 ` +
        `(1순위: ${tier1Count}, 2순위: ${tier2Count}, 3순위: ${tier3Count}, ` +
        `충돌 제외: ${skippedConflicts})`,
    );

    return {
      photographers: collected,
      tier1Count,
      tier2Count,
      tier3Count,
      skippedConflicts,
      extractedRegion,
    };
  }

  /**
   * 촬영시간 충돌 체크
   * - 해당 포토그래퍼가 같은 시간대에 확정된 다른 촬영이 있는지 확인
   * - 이동시간 2시간 버퍼 적용
   */
  async hasScheduleConflict(
    clientId: string,
    shootingDate: Date,
    shootingTime: string | null,
    duration: number | null,
  ): Promise<boolean> {
    const bufferMinutes = REGION_MATCHING_CONFIG.CONFLICT_BUFFER_MINUTES;
    const durationMinutes =
      duration || REGION_MATCHING_CONFIG.DEFAULT_DURATION_MINUTES;

    // 촬영 시작/종료 시간 계산
    const shootingStart = new Date(shootingDate);
    if (shootingTime) {
      const [hours, minutes] = shootingTime.split(':').map(Number);
      shootingStart.setHours(hours, minutes, 0, 0);
    } else {
      // 시간 미지정 시 하루 전체를 충돌 범위로 간주
      shootingStart.setHours(0, 0, 0, 0);
    }

    const shootingEnd = new Date(shootingStart);
    if (shootingTime) {
      shootingEnd.setMinutes(shootingEnd.getMinutes() + durationMinutes);
    } else {
      shootingEnd.setHours(23, 59, 59, 999);
    }

    // 버퍼 적용 (이동시간)
    const conflictStart = new Date(shootingStart);
    conflictStart.setMinutes(conflictStart.getMinutes() - bufferMinutes);

    const conflictEnd = new Date(shootingEnd);
    conflictEnd.setMinutes(conflictEnd.getMinutes() + bufferMinutes);

    // RecruitmentBid(selected) 기반 충돌 확인
    // - 해당 포토그래퍼가 확정된 다른 구인의 촬영시간과 겹치는지
    const conflictingBids = await this.prisma.recruitmentBid.findMany({
      where: {
        bidderId: clientId,
        status: 'selected',
        recruitment: {
          shootingDate: {
            gte: new Date(conflictStart.toDateString()),
            lte: new Date(
              conflictEnd.getFullYear(),
              conflictEnd.getMonth(),
              conflictEnd.getDate() + 1,
            ),
          },
          status: { notIn: ['cancelled', 'expired'] },
        },
      },
      include: {
        recruitment: {
          select: {
            shootingDate: true,
            shootingTime: true,
            duration: true,
          },
        },
      },
    });

    for (const bid of conflictingBids) {
      const otherStart = new Date(bid.recruitment.shootingDate);
      if (bid.recruitment.shootingTime) {
        const [h, m] = bid.recruitment.shootingTime.split(':').map(Number);
        otherStart.setHours(h, m, 0, 0);
      } else {
        otherStart.setHours(0, 0, 0, 0);
      }

      const otherDuration =
        bid.recruitment.duration || REGION_MATCHING_CONFIG.DEFAULT_DURATION_MINUTES;
      const otherEnd = new Date(otherStart);
      if (bid.recruitment.shootingTime) {
        otherEnd.setMinutes(otherEnd.getMinutes() + otherDuration);
      } else {
        otherEnd.setHours(23, 59, 59, 999);
      }

      // 겹침 판단: A.start < B.end && A.end > B.start
      if (conflictStart < otherEnd && conflictEnd > otherStart) {
        return true;
      }
    }

    return false;
  }
}
