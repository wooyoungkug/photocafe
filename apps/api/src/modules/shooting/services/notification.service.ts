import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '@/common/email/email.service';

@Injectable()
export class ShootingNotificationService {
  private readonly logger = new Logger(ShootingNotificationService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * 촬영 공고 알림 이메일 발송
   */
  async sendRecruitingNotification(params: {
    staffEmails: string[];
    shootingInfo: {
      clientName: string;
      shootingType: string;
      venueName: string;
      venueAddress: string;
      shootingDate: Date;
      notes?: string;
    };
    shootingId: string;
  }): Promise<void> {
    if (!this.emailService.isConfigured()) {
      this.logger.warn('SMTP 미설정으로 공고 알림 이메일 발송 생략');
      return;
    }

    const { staffEmails, shootingInfo, shootingId } = params;
    const dateStr = new Date(shootingInfo.shootingDate).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const typeLabel = this.getShootingTypeLabel(shootingInfo.shootingType);

    const html = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">새로운 촬영 공고</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">고객명</td><td style="padding: 8px 0; font-weight: 600;">${shootingInfo.clientName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">촬영 유형</td><td style="padding: 8px 0; font-weight: 600;">${typeLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">장소</td><td style="padding: 8px 0; font-weight: 600;">${shootingInfo.venueName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">주소</td><td style="padding: 8px 0;">${shootingInfo.venueAddress}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">일시</td><td style="padding: 8px 0; font-weight: 600;">${dateStr}</td></tr>
            ${shootingInfo.notes ? `<tr><td style="padding: 8px 0; color: #6b7280;">메모</td><td style="padding: 8px 0;">${shootingInfo.notes}</td></tr>` : ''}
          </table>
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #6b7280;">시스템에 로그인하여 응찰해주세요.</p>
          </div>
        </div>
      </div>
    `;

    const result = await this.emailService.sendEmail({
      to: staffEmails,
      subject: `[촬영공고] ${shootingInfo.clientName} - ${typeLabel} (${dateStr})`,
      html,
    });

    if (result.success) {
      this.logger.log(`공고 알림 발송 완료: ${staffEmails.length}명, shootingId=${shootingId}`);
    } else {
      this.logger.error(`공고 알림 발송 실패: ${result.error}`);
    }
  }

  /**
   * 작가 확정 알림 이메일 발송
   */
  async sendSelectionNotification(params: {
    staffEmail: string;
    staffName: string;
    shootingInfo: {
      clientName: string;
      shootingType: string;
      venueName: string;
      venueAddress: string;
      shootingDate: Date;
    };
    message?: string;
  }): Promise<void> {
    if (!this.emailService.isConfigured()) {
      this.logger.warn('SMTP 미설정으로 확정 알림 이메일 발송 생략');
      return;
    }

    const { staffEmail, staffName, shootingInfo, message } = params;
    const dateStr = new Date(shootingInfo.shootingDate).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const typeLabel = this.getShootingTypeLabel(shootingInfo.shootingType);

    const html = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">촬영 확정 안내</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>${staffName}님, 아래 촬영이 확정되었습니다.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">고객명</td><td style="padding: 8px 0; font-weight: 600;">${shootingInfo.clientName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">촬영 유형</td><td style="padding: 8px 0; font-weight: 600;">${typeLabel}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">장소</td><td style="padding: 8px 0; font-weight: 600;">${shootingInfo.venueName}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">주소</td><td style="padding: 8px 0;">${shootingInfo.venueAddress}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">일시</td><td style="padding: 8px 0; font-weight: 600;">${dateStr}</td></tr>
          </table>
          ${message ? `<div style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px;"><p style="margin: 0; color: #374151;">${message}</p></div>` : ''}
          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #6b7280;">촬영 당일 GPS 체크인을 잊지 마세요!</p>
          </div>
        </div>
      </div>
    `;

    const result = await this.emailService.sendEmail({
      to: staffEmail,
      subject: `[확정] ${shootingInfo.clientName} 촬영 - ${dateStr}`,
      html,
    });

    if (result.success) {
      this.logger.log(`확정 알림 발송 완료: ${staffName}`);
    } else {
      this.logger.error(`확정 알림 발송 실패: ${result.error}`);
    }
  }

  /**
   * 작가 거절 알림 이메일 발송
   */
  async sendRejectionNotification(params: {
    staffEmail: string;
    staffName: string;
    shootingInfo: {
      clientName: string;
      shootingType: string;
      shootingDate: Date;
    };
    reason?: string;
  }): Promise<void> {
    if (!this.emailService.isConfigured()) {
      this.logger.warn('SMTP 미설정으로 거절 알림 이메일 발송 생략');
      return;
    }

    const { staffEmail, staffName, shootingInfo, reason } = params;
    const dateStr = new Date(shootingInfo.shootingDate).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const typeLabel = this.getShootingTypeLabel(shootingInfo.shootingType);

    const html = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6b7280; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">응찰 결과 안내</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>${staffName}님, ${shootingInfo.clientName} (${typeLabel}, ${dateStr}) 촬영 응찰 결과를 안내드립니다.</p>
          <p>아쉽게도 이번 촬영은 다른 작가가 선정되었습니다.</p>
          ${reason ? `<p style="color: #6b7280;">사유: ${reason}</p>` : ''}
          <p style="margin-top: 16px;">다음 촬영 기회에 응찰 부탁드립니다.</p>
        </div>
      </div>
    `;

    const result = await this.emailService.sendEmail({
      to: staffEmail,
      subject: `[응찰결과] ${shootingInfo.clientName} 촬영 - 미선정`,
      html,
    });

    if (result.success) {
      this.logger.log(`거절 알림 발송 완료: ${staffName}`);
    } else {
      this.logger.error(`거절 알림 발송 실패: ${result.error}`);
    }
  }

  /**
   * 고객 설문 이메일 발송
   */
  async sendReviewRequestEmail(params: {
    customerEmail: string;
    customerName: string;
    shootingInfo: {
      shootingType: string;
      venueName: string;
      shootingDate: Date;
    };
    reviewToken: string;
    frontendUrl: string;
  }): Promise<void> {
    if (!this.emailService.isConfigured()) {
      this.logger.warn('SMTP 미설정으로 설문 이메일 발송 생략');
      return;
    }

    const { customerEmail, customerName, shootingInfo, reviewToken, frontendUrl } = params;
    const dateStr = new Date(shootingInfo.shootingDate).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const typeLabel = this.getShootingTypeLabel(shootingInfo.shootingType);
    const reviewUrl = `${frontendUrl}/reviews/${reviewToken}`;

    const html = `
      <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #7c3aed; color: white; padding: 24px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">촬영 만족도 설문</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>${customerName}님, ${dateStr} ${shootingInfo.venueName}에서 진행된 ${typeLabel} 촬영은 만족스러우셨나요?</p>
          <p>소중한 의견을 남겨주시면 더 나은 서비스를 제공하는 데 큰 도움이 됩니다.</p>
          <div style="margin-top: 24px; text-align: center;">
            <a href="${reviewUrl}" style="display: inline-block; padding: 14px 32px; background: #7c3aed; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
              설문 참여하기
            </a>
          </div>
          <p style="margin-top: 16px; color: #9ca3af; font-size: 12px; text-align: center;">
            이 링크는 1회만 사용 가능합니다.
          </p>
        </div>
      </div>
    `;

    const result = await this.emailService.sendEmail({
      to: customerEmail,
      subject: `[Printing114] 촬영 만족도 설문 - ${customerName}님`,
      html,
    });

    if (result.success) {
      this.logger.log(`설문 이메일 발송 완료: ${customerEmail}`);
    } else {
      this.logger.error(`설문 이메일 발송 실패: ${result.error}`);
    }
  }

  /**
   * 촬영 유형 한글 라벨
   */
  private getShootingTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      wedding_main: '본식',
      wedding_rehearsal: '리허설',
      baby_dol: '돌촬영',
      baby_growth: '성장촬영',
      profile: '프로필',
      other: '기타',
    };
    return labels[type] || type;
  }
}
