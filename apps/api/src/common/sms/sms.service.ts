import { Injectable, Logger } from '@nestjs/common';
import { SolapiMessageService } from 'solapi';

export interface SendSmsResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly solapi: SolapiMessageService | null;
  private readonly senderNo: string;

  constructor() {
    const apiKey = process.env.SOLAPI_API_KEY || '';
    const apiSecret = process.env.SOLAPI_API_SECRET || '';
    this.senderNo = process.env.SOLAPI_SENDER_NO || '';

    if (apiKey && apiSecret) {
      this.solapi = new SolapiMessageService(apiKey, apiSecret);
    } else {
      this.solapi = null;
      this.logger.warn(
        'Solapi SMS 설정이 없습니다. SOLAPI_API_KEY, SOLAPI_API_SECRET을 설정하세요.',
      );
    }

    if (!this.senderNo) {
      this.logger.warn(
        'SOLAPI_SENDER_NO(발신번호)가 설정되지 않았습니다. SMS 발송 기능이 비활성화됩니다.',
      );
    }
  }

  isConfigured(): boolean {
    return !!this.solapi && !!this.senderNo;
  }

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    if (!this.isConfigured()) {
      this.logger.warn(`SMS 미설정 상태 - 수신: ${to}, 내용: ${message}`);
      return { success: false, error: 'SMS가 설정되지 않았습니다.' };
    }

    try {
      const result = await this.solapi!.sendOne({
        to: to.replace(/-/g, ''),
        from: this.senderNo,
        text: message,
      });

      this.logger.log(`SMS 발송 완료: ${to} (messageId: ${result.messageId})`);
      return { success: true, requestId: result.messageId };
    } catch (error: any) {
      this.logger.error(`SMS 발송 오류: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
