import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../email/email.service';

export interface AlimtalkRecipient {
  phone: string;
  email?: string;
  name?: string;
}

export interface SendAlimtalkOptions {
  templateCode: string;
  recipients: AlimtalkRecipient[];
  variables: Record<string, string>;
  /** 알림톡 실패 시 이메일 fallback 옵션 */
  emailFallback?: {
    subject: string;
    html: string;
  };
}

@Injectable()
export class KakaoAlimtalkService {
  private readonly logger = new Logger(KakaoAlimtalkService.name);
  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly senderKey: string;

  constructor(private readonly emailService: EmailService) {
    this.enabled = process.env.KAKAO_ALIMTALK_ENABLED === 'true';
    this.apiKey = process.env.KAKAO_ALIMTALK_API_KEY || '';
    this.senderKey = process.env.KAKAO_ALIMTALK_SENDER_KEY || '';

    if (!this.enabled) {
      this.logger.warn(
        '카카오 알림톡이 비활성화 상태입니다. KAKAO_ALIMTALK_ENABLED=true로 설정하세요.',
      );
    }
  }

  isConfigured(): boolean {
    return this.enabled && !!this.apiKey && !!this.senderKey;
  }

  /**
   * 알림톡 발송
   * - 카카오 API 호출 시도 → 실패 시 이메일 fallback
   * - 미설정 시 즉시 이메일 fallback
   */
  async send(options: SendAlimtalkOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    method: 'alimtalk' | 'email' | 'none';
  }> {
    if (!options.recipients.length) {
      return { success: true, sentCount: 0, failedCount: 0, method: 'none' };
    }

    // 카카오 알림톡 시도
    if (this.isConfigured()) {
      try {
        const result = await this.sendViaKakao(options);
        if (result.success) {
          return result;
        }
        this.logger.warn('카카오 알림톡 실패, 이메일 fallback 시도');
      } catch (err) {
        this.logger.error(`카카오 알림톡 발송 오류: ${(err as Error).message}`);
      }
    }

    // 이메일 fallback
    if (options.emailFallback && this.emailService.isConfigured()) {
      return this.sendViaEmail(options);
    }

    this.logger.warn('알림톡/이메일 모두 미설정. 알림 발송 생략.');
    return { success: false, sentCount: 0, failedCount: options.recipients.length, method: 'none' };
  }

  /**
   * 카카오 알림톡 API 호출
   * TODO: 카카오 비즈니스 채널 등록 후 실제 API 연동
   */
  private async sendViaKakao(options: SendAlimtalkOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    method: 'alimtalk';
  }> {
    const phoneRecipients = options.recipients.filter((r) => r.phone);

    if (!phoneRecipients.length) {
      return { success: false, sentCount: 0, failedCount: 0, method: 'alimtalk' };
    }

    // 카카오 알림톡 API 호출 구조
    // POST https://api-alimtalk.kakao.com/v2/sender/send
    // 실제 연동 시 아래 주석을 해제하고 구현
    /*
    const payload = {
      senderKey: this.senderKey,
      templateCode: options.templateCode,
      recipientList: phoneRecipients.map((r) => ({
        recipientNo: r.phone.replace(/-/g, ''),
        templateParameter: options.variables,
      })),
    };

    const response = await fetch('https://api-alimtalk.kakao.com/v2/sender/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    */

    this.logger.log(
      `[카카오 알림톡] 템플릿: ${options.templateCode}, 수신: ${phoneRecipients.length}명 (API 미연동 - 이메일 fallback)`,
    );

    // 현재는 API 미연동이므로 실패 반환 → 이메일 fallback
    return { success: false, sentCount: 0, failedCount: phoneRecipients.length, method: 'alimtalk' };
  }

  /**
   * 이메일 fallback 발송
   */
  private async sendViaEmail(options: SendAlimtalkOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    method: 'email';
  }> {
    const emailRecipients = options.recipients.filter((r) => r.email);

    if (!emailRecipients.length) {
      return { success: false, sentCount: 0, failedCount: options.recipients.length, method: 'email' };
    }

    const emails = emailRecipients.map((r) => r.email!);
    const result = await this.emailService.sendEmail({
      to: emails,
      subject: options.emailFallback!.subject,
      html: options.emailFallback!.html,
    });

    const sentCount = result.success ? emails.length : 0;
    const failedCount = result.success ? 0 : emails.length;

    this.logger.log(
      `[이메일 fallback] 수신: ${emails.length}명, 성공: ${sentCount}`,
    );

    return { success: result.success, sentCount, failedCount, method: 'email' };
  }
}
