import { Injectable, Logger } from '@nestjs/common';

export interface SendSmsResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly appKey: string | undefined;
  private readonly secretKey: string | undefined;
  private readonly senderNo: string | undefined;

  constructor() {
    this.appKey = process.env.NHN_SMS_APP_KEY;
    this.secretKey = process.env.NHN_SMS_SECRET_KEY;
    this.senderNo = process.env.NHN_SMS_SENDER_NO;

    if (!this.appKey || !this.secretKey || !this.senderNo) {
      this.logger.warn(
        'NHN Cloud SMS 설정이 없습니다. SMS 발송 기능이 비활성화됩니다. (.env에 NHN_SMS_APP_KEY, NHN_SMS_SECRET_KEY, NHN_SMS_SENDER_NO 설정 필요)',
      );
    }
  }

  isConfigured(): boolean {
    return !!(this.appKey && this.secretKey && this.senderNo);
  }

  async sendSms(to: string, message: string): Promise<SendSmsResult> {
    if (!this.isConfigured()) {
      this.logger.warn(`SMS 미설정 상태 - 수신: ${to}, 내용: ${message}`);
      return { success: false, error: 'SMS가 설정되지 않았습니다.' };
    }

    try {
      const url = `https://api-sms.cloud.toast.com/sms/v3.0/appKeys/${this.appKey}/sender/sms`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-Secret-Key': this.secretKey!,
        },
        body: JSON.stringify({
          body: message,
          sendNo: this.senderNo,
          recipientList: [{ recipientNo: to }],
        }),
      });

      const result = await response.json();

      if (result.header?.isSuccessful) {
        const requestId = result.body?.data?.requestId;
        this.logger.log(`SMS 발송 완료: ${to} (requestId: ${requestId})`);
        return { success: true, requestId };
      }

      this.logger.error(`SMS 발송 실패: ${result.header?.resultMessage}`);
      return { success: false, error: result.header?.resultMessage || 'SMS 발송 실패' };
    } catch (error: any) {
      this.logger.error(`SMS 발송 오류: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
