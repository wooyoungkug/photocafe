import { Injectable, Logger } from '@nestjs/common';
import { SolapiMessageService } from 'solapi';
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
  private readonly solapi: SolapiMessageService | null;
  private readonly senderNo: string;
  private readonly pfId: string;

  constructor(private readonly emailService: EmailService) {
    const apiKey = process.env.SOLAPI_API_KEY || '';
    const apiSecret = process.env.SOLAPI_API_SECRET || '';
    this.senderNo = process.env.SOLAPI_SENDER_NO || '';
    this.pfId = process.env.SOLAPI_PF_ID || '';

    if (apiKey && apiSecret) {
      this.solapi = new SolapiMessageService(apiKey, apiSecret);
      this.logger.log('Solapi 메시지 서비스 초기화 완료');
    } else {
      this.solapi = null;
      this.logger.warn(
        'Solapi 설정이 없습니다. SOLAPI_API_KEY, SOLAPI_API_SECRET을 설정하세요.',
      );
    }
  }

  /** SMS 발송 가능 여부 */
  isSmsConfigured(): boolean {
    return !!this.solapi && !!this.senderNo;
  }

  /** 카카오 알림톡 발송 가능 여부 */
  isConfigured(): boolean {
    // 알림톡은 pfId(카카오채널)가 필요, SMS는 senderNo만 필요
    // pfId 없어도 SMS fallback으로 동작하도록 solapi 존재만 체크
    return !!this.solapi;
  }

  /**
   * 알림톡 발송 (카카오 알림톡 → SMS fallback → 이메일 fallback)
   */
  async send(options: SendAlimtalkOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    method: 'alimtalk' | 'sms' | 'email' | 'none';
  }> {
    if (!options.recipients.length) {
      return { success: true, sentCount: 0, failedCount: 0, method: 'none' };
    }

    // 1) 카카오 알림톡 시도 (pfId가 설정된 경우만)
    if (this.solapi && this.pfId) {
      try {
        const result = await this.sendViaAlimtalk(options);
        if (result.success) return result;
        this.logger.warn('카카오 알림톡 실패, SMS fallback 시도');
      } catch (err) {
        this.logger.error(`카카오 알림톡 발송 오류: ${(err as Error).message}`);
      }
    }

    // 2) SMS fallback (senderNo가 설정된 경우)
    if (this.isSmsConfigured()) {
      try {
        const result = await this.sendViaSms(options);
        if (result.success) return result;
        this.logger.warn('SMS 발송 실패, 이메일 fallback 시도');
      } catch (err) {
        this.logger.error(`SMS 발송 오류: ${(err as Error).message}`);
      }
    }

    // 3) 이메일 fallback
    if (options.emailFallback && this.emailService.isConfigured()) {
      return this.sendViaEmail(options);
    }

    this.logger.warn('알림톡/SMS/이메일 모두 미설정. 알림 발송 생략.');
    return { success: false, sentCount: 0, failedCount: options.recipients.length, method: 'none' };
  }

  /**
   * Solapi 카카오 알림톡 발송
   */
  private async sendViaAlimtalk(options: SendAlimtalkOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    method: 'alimtalk';
  }> {
    const phoneRecipients = options.recipients.filter((r) => r.phone);
    if (!phoneRecipients.length) {
      return { success: false, sentCount: 0, failedCount: 0, method: 'alimtalk' };
    }

    // 변수 치환하여 메시지 본문 생성
    let messageText = options.variables['#{내용}'] || '';
    for (const [key, value] of Object.entries(options.variables)) {
      messageText = messageText.replace(
        new RegExp(key.replace(/[{}#]/g, '\\$&'), 'g'),
        value,
      );
    }

    try {
      if (phoneRecipients.length === 1) {
        // 단일 발송
        await this.solapi!.sendOne({
          to: phoneRecipients[0].phone.replace(/-/g, ''),
          from: this.senderNo,
          text: messageText,
          type: 'ATA',
          kakaoOptions: {
            pfId: this.pfId,
            templateId: options.templateCode,
            variables: options.variables,
          },
        });
      } else {
        // 다건 발송
        const messages = phoneRecipients.map((r) => ({
          to: r.phone.replace(/-/g, ''),
          from: this.senderNo,
          text: messageText,
          type: 'ATA' as const,
          kakaoOptions: {
            pfId: this.pfId,
            templateId: options.templateCode,
            variables: options.variables,
          },
        }));
        await this.solapi!.send(messages);
      }

      this.logger.log(
        `[Solapi 알림톡] 발송 성공 - 템플릿: ${options.templateCode}, 수신: ${phoneRecipients.length}명`,
      );
      return { success: true, sentCount: phoneRecipients.length, failedCount: 0, method: 'alimtalk' };
    } catch (err) {
      this.logger.error(`[Solapi 알림톡] 발송 실패: ${(err as Error).message}`);
      return { success: false, sentCount: 0, failedCount: phoneRecipients.length, method: 'alimtalk' };
    }
  }

  /**
   * Solapi SMS 발송
   */
  private async sendViaSms(options: SendAlimtalkOptions): Promise<{
    success: boolean;
    sentCount: number;
    failedCount: number;
    method: 'sms';
  }> {
    const phoneRecipients = options.recipients.filter((r) => r.phone);
    if (!phoneRecipients.length) {
      return { success: false, sentCount: 0, failedCount: 0, method: 'sms' };
    }

    const messageText = options.variables['#{내용}'] || Object.values(options.variables).join(' ');

    try {
      if (phoneRecipients.length === 1) {
        await this.solapi!.sendOne({
          to: phoneRecipients[0].phone.replace(/-/g, ''),
          from: this.senderNo,
          text: messageText,
        });
      } else {
        const messages = phoneRecipients.map((r) => ({
          to: r.phone.replace(/-/g, ''),
          from: this.senderNo,
          text: messageText,
        }));
        await this.solapi!.send(messages);
      }

      this.logger.log(`[Solapi SMS] 발송 성공 - 수신: ${phoneRecipients.length}명`);
      return { success: true, sentCount: phoneRecipients.length, failedCount: 0, method: 'sms' };
    } catch (err) {
      this.logger.error(`[Solapi SMS] 발송 실패: ${(err as Error).message}`);
      return { success: false, sentCount: 0, failedCount: phoneRecipients.length, method: 'sms' };
    }
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

    this.logger.log(`[이메일 fallback] 수신: ${emails.length}명, 성공: ${sentCount}`);
    return { success: result.success, sentCount, failedCount, method: 'email' };
  }
}
