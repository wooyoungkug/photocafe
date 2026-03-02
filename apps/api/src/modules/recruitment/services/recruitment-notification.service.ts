import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KakaoAlimtalkService } from '@/common/kakao-alimtalk/kakao-alimtalk.service';
import {
  ALIMTALK_TEMPLATES,
  SHOOTING_TYPE_LABELS,
} from '../constants/recruitment.constants';
import { RegionMatchingService } from './region-matching.service';

interface RecruitmentInfo {
  id: string;
  title: string;
  shootingType: string;
  shootingDate: Date;
  shootingTime?: string;
  duration?: number;
  venueName: string;
  venueAddress?: string;
  budget?: number;
  clientName: string;
}

@Injectable()
export class RecruitmentNotificationService {
  private readonly logger = new Logger(RecruitmentNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alimtalkService: KakaoAlimtalkService,
    private readonly regionMatchingService: RegionMatchingService,
  ) {}

  /**
   * 전속 모집 알림: 스튜디오 소속 포토그래퍼에게 발송
   */
  async sendPrivateRecruitingNotification(
    companyClientId: string,
    recruitment: RecruitmentInfo,
  ) {
    // 스튜디오 소속 포토그래퍼 조회 (Employment role=PHOTOGRAPHER)
    const photographers = await this.prisma.employment.findMany({
      where: {
        companyClientId,
        role: 'PHOTOGRAPHER',
        status: 'ACTIVE',
      },
      include: {
        member: {
          select: { mobile: true, phone: true, email: true, clientName: true },
        },
      },
    });

    if (!photographers.length) {
      this.logger.warn(`스튜디오 ${companyClientId}에 소속 포토그래퍼 없음`);
      return;
    }

    const recipients = photographers.map((p) => ({
      phone: p.member.mobile || p.member.phone || '',
      email: p.member.email || p.member.contactEmail || undefined,
      name: p.member.clientName,
    }));

    const dateStr = recruitment.shootingDate.toLocaleDateString('ko-KR');
    const typeLabel = SHOOTING_TYPE_LABELS[recruitment.shootingType] || recruitment.shootingType;
    const budgetStr = recruitment.budget
      ? `${recruitment.budget.toLocaleString()}원`
      : '협의';

    await this.alimtalkService.send({
      templateCode: ALIMTALK_TEMPLATES.PRIVATE_RECRUITING,
      recipients,
      variables: {
        studioName: recruitment.clientName,
        title: recruitment.title,
        shootingType: typeLabel,
        shootingDate: dateStr,
        shootingTime: recruitment.shootingTime || '미정',
        venueName: recruitment.venueName,
        budget: budgetStr,
      },
      emailFallback: {
        subject: `[printing114] 촬영 구인: ${recruitment.title}`,
        html: this.buildRecruitingEmailHtml(recruitment, '전속'),
      },
    });

    this.logger.log(
      `전속 모집 알림 발송: ${recruitment.id}, 대상 ${recipients.length}명`,
    );
  }

  /**
   * 공개 모집 알림: 전체 포토그래퍼에게 발송
   */
  async sendPublicRecruitingNotification(recruitment: RecruitmentInfo) {
    // 전체 포토그래퍼 조회 (모든 스튜디오에서 PHOTOGRAPHER 역할인 사람)
    const allPhotographers = await this.prisma.employment.findMany({
      where: {
        role: 'PHOTOGRAPHER',
        status: 'ACTIVE',
      },
      include: {
        member: {
          select: { id: true, mobile: true, phone: true, email: true, clientName: true },
        },
      },
    });

    // 중복 제거 (한 사람이 여러 스튜디오 소속일 수 있음)
    const seen = new Set<string>();
    const recipients = allPhotographers
      .filter((p) => {
        if (seen.has(p.memberClientId)) return false;
        seen.add(p.memberClientId);
        return true;
      })
      .map((p) => ({
        phone: p.member.mobile || p.member.phone || '',
        email: p.member.email || undefined,
        name: p.member.clientName,
      }));

    if (!recipients.length) {
      this.logger.warn('등록된 포토그래퍼가 없어 공개 모집 알림 생략');
      return;
    }

    await this.alimtalkService.send({
      templateCode: ALIMTALK_TEMPLATES.PUBLIC_RECRUITING,
      recipients,
      variables: {
        title: recruitment.title,
        shootingType: SHOOTING_TYPE_LABELS[recruitment.shootingType] || recruitment.shootingType,
        shootingDate: recruitment.shootingDate.toLocaleDateString('ko-KR'),
        venueName: recruitment.venueName,
        budget: recruitment.budget
          ? `${recruitment.budget.toLocaleString()}원`
          : '협의',
        studioName: recruitment.clientName,
      },
      emailFallback: {
        subject: `[printing114] 공개 구인: ${recruitment.title}`,
        html: this.buildRecruitingEmailHtml(recruitment, '공개'),
      },
    });

    this.logger.log(
      `공개 모집 알림 발송: ${recruitment.id}, 대상 ${recipients.length}명`,
    );
  }

  /**
   * 공개 모집 알림 (지역 우선순위 기반)
   * 희망1지역 → 희망2지역 → 희망3지역 순으로 100명까지 발송
   * 촬영시간 중복자는 제외
   */
  async sendPublicRecruitingNotificationWithRegionPriority(
    recruitment: RecruitmentInfo,
  ): Promise<{
    totalSent: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    skippedConflicts: number;
  }> {
    const venueAddress = recruitment.venueAddress;

    // 주소 없으면 기존 방식(전체 발송)으로 fallback
    if (!venueAddress) {
      this.logger.warn(
        `구인 ${recruitment.id}: 주소 없음 → 전체 발송 fallback`,
      );
      await this.sendPublicRecruitingNotification(recruitment);
      return { totalSent: -1, tier1Count: 0, tier2Count: 0, tier3Count: 0, skippedConflicts: 0 };
    }

    // 지역 매칭
    const result = await this.regionMatchingService.findMatchingPhotographers(
      recruitment.id,
      venueAddress,
      recruitment.shootingDate,
      recruitment.shootingTime || null,
      recruitment.duration || null,
    );

    // 지역 추출 실패 시 fallback
    if (!result.extractedRegion) {
      this.logger.warn(
        `구인 ${recruitment.id}: 지역 추출 실패 → 전체 발송 fallback`,
      );
      await this.sendPublicRecruitingNotification(recruitment);
      return { totalSent: -1, tier1Count: 0, tier2Count: 0, tier3Count: 0, skippedConflicts: 0 };
    }

    if (result.photographers.length === 0) {
      this.logger.warn(
        `구인 ${recruitment.id}: 매칭 포토그래퍼 없음 (지역: ${result.extractedRegion})`,
      );
      return {
        totalSent: 0,
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        skippedConflicts: result.skippedConflicts,
      };
    }

    // 카톡/이메일 발송
    const recipients = result.photographers.map((p) => ({
      phone: p.mobile || p.phone || '',
      email: p.email || undefined,
      name: p.clientName,
    }));

    const dateStr = recruitment.shootingDate.toLocaleDateString('ko-KR');
    const typeLabel =
      SHOOTING_TYPE_LABELS[recruitment.shootingType] || recruitment.shootingType;
    const budgetStr = recruitment.budget
      ? `${recruitment.budget.toLocaleString()}원`
      : '협의';

    await this.alimtalkService.send({
      templateCode: ALIMTALK_TEMPLATES.PUBLIC_RECRUITING,
      recipients,
      variables: {
        title: recruitment.title,
        shootingType: typeLabel,
        shootingDate: dateStr,
        venueName: recruitment.venueName,
        budget: budgetStr,
        studioName: recruitment.clientName,
      },
      emailFallback: {
        subject: `[printing114] 공개 구인: ${recruitment.title}`,
        html: this.buildRecruitingEmailHtml(recruitment, '공개'),
      },
    });

    // 발송 로그 저장
    const logData = result.photographers.map((p) => ({
      recruitmentId: recruitment.id,
      recipientId: p.clientId,
      regionTier: p.regionTier,
      matchedRegion: p.matchedRegion,
      channel: 'email',
      status: 'sent',
    }));

    // upsert 형태로 중복 방지 (skipDuplicates)
    await this.prisma.recruitmentNotificationLog.createMany({
      data: logData,
      skipDuplicates: true,
    });

    this.logger.log(
      `지역우선 공개 모집 알림 발송: ${recruitment.id}, ` +
        `총 ${result.photographers.length}명 ` +
        `(1순위: ${result.tier1Count}, 2순위: ${result.tier2Count}, 3순위: ${result.tier3Count}, ` +
        `충돌 제외: ${result.skippedConflicts})`,
    );

    return {
      totalSent: result.photographers.length,
      tier1Count: result.tier1Count,
      tier2Count: result.tier2Count,
      tier3Count: result.tier3Count,
      skippedConflicts: result.skippedConflicts,
    };
  }

  /**
   * 구인 알림 발송 이력 조회
   */
  async getNotificationLogs(recruitmentId: string) {
    const logs = await this.prisma.recruitmentNotificationLog.findMany({
      where: { recruitmentId },
      include: {
        recipient: {
          select: { clientName: true, email: true },
        },
      },
      orderBy: { sentAt: 'desc' },
    });

    const summary = {
      total: logs.length,
      tier1Count: logs.filter((l) => l.regionTier === 1).length,
      tier2Count: logs.filter((l) => l.regionTier === 2).length,
      tier3Count: logs.filter((l) => l.regionTier === 3).length,
      sentCount: logs.filter((l) => l.status === 'sent').length,
      failedCount: logs.filter((l) => l.status === 'failed').length,
    };

    return { summary, logs };
  }

  /**
   * 응찰 확정 알림
   */
  async sendSelectionNotification(
    bidderClientId: string,
    recruitment: RecruitmentInfo,
  ) {
    const bidder = await this.prisma.client.findUnique({
      where: { id: bidderClientId },
      select: { mobile: true, phone: true, email: true, clientName: true },
    });

    if (!bidder) return;

    await this.alimtalkService.send({
      templateCode: ALIMTALK_TEMPLATES.BID_SELECTED,
      recipients: [{
        phone: bidder.mobile || bidder.phone || '',
        email: bidder.email || undefined,
        name: bidder.clientName,
      }],
      variables: {
        name: bidder.clientName,
        title: recruitment.title,
        shootingDate: recruitment.shootingDate.toLocaleDateString('ko-KR'),
        venueName: recruitment.venueName,
      },
      emailFallback: {
        subject: `[printing114] 촬영 확정: ${recruitment.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2 style="color:#2563eb;">촬영 확정 안내</h2>
            <p>${bidder.clientName}님, 촬영이 확정되었습니다!</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0;">
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">촬영</td>
                <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${recruitment.title}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">일시</td>
                <td style="padding:8px;border-bottom:1px solid #eee;">${recruitment.shootingDate.toLocaleDateString('ko-KR')} ${recruitment.shootingTime || ''}</td></tr>
              <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">장소</td>
                <td style="padding:8px;border-bottom:1px solid #eee;">${recruitment.venueName}</td></tr>
            </table>
            <p style="color:#666;font-size:13px;">촬영 당일 정시에 도착해주세요.</p>
          </div>`,
      },
    });
  }

  /**
   * 응찰 거절 알림
   */
  async sendRejectionNotification(
    bidderClientId: string,
    recruitment: RecruitmentInfo,
    reason?: string,
  ) {
    const bidder = await this.prisma.client.findUnique({
      where: { id: bidderClientId },
      select: { mobile: true, phone: true, email: true, clientName: true },
    });

    if (!bidder) return;

    await this.alimtalkService.send({
      templateCode: ALIMTALK_TEMPLATES.BID_REJECTED,
      recipients: [{
        phone: bidder.mobile || bidder.phone || '',
        email: bidder.email || undefined,
        name: bidder.clientName,
      }],
      variables: {
        name: bidder.clientName,
        title: recruitment.title,
        reason: reason || '다른 작가가 확정되었습니다.',
      },
      emailFallback: {
        subject: `[printing114] 응찰 결과: ${recruitment.title}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
            <h2>응찰 결과 안내</h2>
            <p>${bidder.clientName}님, 아쉽지만 이번 촬영은 다른 작가가 확정되었습니다.</p>
            <p style="color:#666;">${reason || '더 좋은 기회에 만나뵙겠습니다.'}</p>
          </div>`,
      },
    });
  }

  private buildRecruitingEmailHtml(
    recruitment: RecruitmentInfo,
    type: '전속' | '공개',
  ): string {
    const typeLabel = SHOOTING_TYPE_LABELS[recruitment.shootingType] || recruitment.shootingType;
    const budgetStr = recruitment.budget
      ? `${recruitment.budget.toLocaleString()}원`
      : '협의';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';

    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#2563eb;">[${type} 구인] ${recruitment.title}</h2>
        <p>${recruitment.clientName} 에서 포토그래퍼를 찾고 있습니다.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">촬영 유형</td>
            <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${typeLabel}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">촬영일</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${recruitment.shootingDate.toLocaleDateString('ko-KR')} ${recruitment.shootingTime || ''}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">장소</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${recruitment.venueName}</td></tr>
          ${recruitment.venueAddress ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">주소</td>
            <td style="padding:8px;border-bottom:1px solid #eee;">${recruitment.venueAddress}</td></tr>` : ''}
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">보수</td>
            <td style="padding:8px;border-bottom:1px solid #eee;font-weight:bold;">${budgetStr}</td></tr>
        </table>
        <a href="${frontendUrl}/mypage/recruitment/${recruitment.id}"
           style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
          상세 보기 / 응찰하기
        </a>
      </div>`;
  }
}
