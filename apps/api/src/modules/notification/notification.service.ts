import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import * as webpush from 'web-push';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KakaoAlimtalkService } from '@/common/kakao-alimtalk/kakao-alimtalk.service';
import {
  CreateNotificationDto,
  NOTIFICATION_TYPES,
  PushSubscribeDto,
} from './dto/notification.dto';

interface ListOptions {
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string;
}

/** Notification 발송/조회 통합 서비스 — DB 저장 + 카카오 알림톡 fire-and-forget 발송. */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  /** type → ENV 키 매핑 (값 미설정 시 카카오 발송 skip) */
  private readonly TEMPLATE_ENV_KEYS: Record<string, string> = {
    [NOTIFICATION_TYPES.ORDER_EDIT]: 'KAKAO_TPL_ORDER_EDIT',
    [NOTIFICATION_TYPES.REPRINT_REQUEST]: 'KAKAO_TPL_REPRINT_REQUEST',
    [NOTIFICATION_TYPES.PRINT_OPERATOR_ASSIGNED]: 'KAKAO_TPL_PRINT_OPERATOR_ASSIGNED',
    [NOTIFICATION_TYPES.PRINT_OPERATOR_UNASSIGNED]: 'KAKAO_TPL_PRINT_OPERATOR_ASSIGNED',
    [NOTIFICATION_TYPES.ORDER_STATUS_CHANGED]: 'KAKAO_TPL_ORDER_STATUS_CHANGED',
  };

  /** VAPID 설정 1회 적용 플래그 — 미설정 시 Web Push 발송 skip. */
  private vapidConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly kakao: KakaoAlimtalkService,
  ) {
    this.configureVapid();
  }

  /** 환경변수에서 VAPID 키를 읽어 web-push 라이브러리에 1회 설정한다. */
  private configureVapid(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@photocafe.co.kr';
    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID 키 미설정 — Web Push 발송이 비활성화됩니다.');
      return;
    }
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
    } catch (err) {
      this.logger.error(`VAPID 설정 실패: ${(err as Error).message}`);
    }
  }

  /** VAPID 설정 여부 — 카카오의 isConfigured()와 동일 패턴. */
  private isWebPushConfigured(): boolean {
    return this.vapidConfigured;
  }

  /** 단건 알림 생성 + (가능하면) 카카오 알림톡 비동기 발송. 카카오 실패는 throw하지 않음. */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: {
        recipientStaffId: dto.recipientStaffId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        payload: (dto.payload ?? null) as Prisma.InputJsonValue | typeof Prisma.JsonNull,
        link: dto.link ?? null,
        channel: dto.channel ?? 'inapp',
      },
    });

    // fire-and-forget: 호출자 흐름을 막지 않음
    void this.sendKakao(created).catch((err) => {
      this.logger.warn(`카카오 발송 백그라운드 실패 [${created.id}]: ${(err as Error).message}`);
    });
    void this.sendWebPush(created).catch((err) => {
      this.logger.warn(`Web Push 발송 백그라운드 실패 [${created.id}]: ${(err as Error).message}`);
    });

    return created;
  }

  /** 다건 일괄 생성 — 트랜잭션 외부에서 호출 권장 (카카오 발송이 트랜잭션 시간을 늘리지 않게). */
  async createMany(dtos: CreateNotificationDto[]): Promise<number> {
    if (!dtos.length) return 0;
    let count = 0;
    for (const dto of dtos) {
      try {
        await this.create(dto);
        count++;
      } catch (err) {
        this.logger.error(
          `알림 생성 실패 (recipient=${dto.recipientStaffId}, type=${dto.type}): ${(err as Error).message}`,
        );
      }
    }
    return count;
  }

  /** 직원의 알림 목록 — cursor 기반 무한스크롤. cursor=base64({createdAt,id}). */
  async listForStaff(staffId: string, opts: ListOptions = {}) {
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const where: Prisma.NotificationWhereInput = { recipientStaffId: staffId };
    if (opts.unreadOnly) where.readAt = null;

    let cursorClause: Prisma.NotificationWhereUniqueInput | undefined;
    if (opts.cursor) {
      try {
        const decoded = Buffer.from(opts.cursor, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded) as { id: string };
        if (parsed?.id) cursorClause = { id: parsed.id };
      } catch {
        // 잘못된 cursor 는 무시 (첫 페이지부터)
      }
    }

    const items = await this.prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursorClause ? { cursor: cursorClause, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const last = data[data.length - 1];
    const nextCursor = hasMore && last
      ? Buffer.from(JSON.stringify({ id: last.id, createdAt: last.createdAt }))
          .toString('base64')
      : null;

    return { items: data, nextCursor, hasMore };
  }

  /** 자기 알림만 읽음 처리 — 타인 알림 접근은 NotFoundException. */
  async markRead(id: string, staffId: string): Promise<Notification> {
    const target = await this.prisma.notification.findUnique({ where: { id } });
    if (!target || target.recipientStaffId !== staffId) {
      throw new NotFoundException('알림을 찾을 수 없습니다');
    }
    if (target.readAt) return target;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  /** 본인의 모든 미확인 알림 일괄 읽음 처리. */
  async markAllRead(staffId: string): Promise<{ updated: number }> {
    const res = await this.prisma.notification.updateMany({
      where: { recipientStaffId: staffId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: res.count };
  }

  /** 미확인 알림 개수 (배지용). */
  async unreadCount(staffId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientStaffId: staffId, readAt: null },
    });
  }

  /** Kakao 알림톡 발송 — 미설정/템플릿 미매핑/수신자 폰 없음 시 skip. 결과를 DB에 기록. */
  private async sendKakao(notification: Notification): Promise<void> {
    if (!this.kakao.isConfigured()) {
      await this.updateKakaoStatus(notification.id, 'skipped', null);
      return;
    }

    const envKey = this.TEMPLATE_ENV_KEYS[notification.type];
    const templateCode = envKey ? process.env[envKey] : undefined;

    const recipient = await this.prisma.staff.findUnique({
      where: { id: notification.recipientStaffId },
      select: { phone: true, mobile: true, email: true, name: true },
    });
    const phone = recipient?.mobile || recipient?.phone || '';
    if (!phone) {
      this.logger.warn(`Kakao 발송 skip: 수신자 ${notification.recipientStaffId} 전화번호 없음`);
      await this.updateKakaoStatus(notification.id, 'skipped', null);
      return;
    }

    // 템플릿 코드 없음 → SMS로 직접 발송
    if (!templateCode) {
      this.logger.warn(`Kakao 템플릿 미설정(${envKey ?? 'no-mapping'}), SMS로 대체 발송`);
      const smsText = `[${notification.title}]\n${notification.body}`;
      const ok = await this.kakao.sendPlainSms(phone, smsText);
      await this.updateKakaoStatus(notification.id, ok ? 'sent' : 'failed', ok ? new Date() : null);
      return;
    }

    try {
      const result = await this.kakao.send({
        templateCode,
        recipients: [
          {
            phone,
            email: recipient?.email ?? undefined,
            name: recipient?.name ?? undefined,
          },
        ],
        variables: {
          '#{제목}': notification.title,
          '#{내용}': notification.body,
        },
        emailFallback: recipient?.email
          ? {
              subject: notification.title,
              html: `<p>${notification.body.replace(/\n/g, '<br/>')}</p>${
                notification.link ? `<p><a href="${notification.link}">자세히 보기</a></p>` : ''
              }`,
            }
          : undefined,
      });
      await this.updateKakaoStatus(
        notification.id,
        result.success ? 'sent' : 'failed',
        result.success ? new Date() : null,
      );
    } catch (err) {
      this.logger.error(`Kakao 발송 예외 [${notification.id}]: ${(err as Error).message}`);
      await this.updateKakaoStatus(notification.id, 'failed', null).catch(() => undefined);
    }
  }

  private async updateKakaoStatus(
    id: string,
    status: 'sent' | 'failed' | 'skipped',
    sentAt: Date | null,
  ): Promise<void> {
    try {
      await this.prisma.notification.update({
        where: { id },
        data: { kakaoStatus: status, kakaoSentAt: sentAt },
      });
    } catch (err) {
      this.logger.warn(`Kakao 상태 업데이트 실패 [${id}]: ${(err as Error).message}`);
    }
  }

  /**
   * Web Push 발송 — 수신자의 모든 구독에 병렬 전송.
   * - VAPID 미설정/구독 없음 시 skip.
   * - 응답 410(Gone) 또는 404 → 만료 구독으로 간주, DB에서 자동 삭제.
   * - 카카오와 동일하게 호출자 흐름을 막지 않는 fire-and-forget 패턴.
   */
  private async sendWebPush(notification: Notification): Promise<void> {
    if (!this.isWebPushConfigured()) return;

    const subs = await this.prisma.staffPushSubscription.findMany({
      where: { staffId: notification.recipientStaffId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });
    if (!subs.length) return;

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      link: notification.link ?? null,
      type: notification.type,
    });

    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            // 만료된 구독 → 삭제
            await this.prisma.staffPushSubscription
              .delete({ where: { id: sub.id } })
              .catch(() => undefined);
            this.logger.log(`만료 구독 삭제: ${sub.endpoint}`);
          } else {
            this.logger.warn(
              `Web Push 발송 실패 [${notification.id}] (status=${statusCode ?? 'n/a'}): ${(err as Error).message}`,
            );
          }
        }
      }),
    );
  }

  /** Web Push 구독 등록 — endpoint 중복 시 갱신 (upsert). */
  async subscribePush(staffId: string, dto: PushSubscribeDto): Promise<void> {
    await this.prisma.staffPushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: {
        staffId,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
      create: {
        staffId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
    });
  }

  /** Web Push 구독 해제 — 본인 구독만 삭제 (타인 endpoint는 무시). */
  async unsubscribePush(staffId: string, endpoint: string): Promise<void> {
    await this.prisma.staffPushSubscription.deleteMany({
      where: { staffId, endpoint },
    });
  }
}
