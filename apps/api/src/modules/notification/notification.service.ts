import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { KakaoAlimtalkService } from '@/common/kakao-alimtalk/kakao-alimtalk.service';
import { CreateNotificationDto, NOTIFICATION_TYPES } from './dto/notification.dto';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly kakao: KakaoAlimtalkService,
  ) {}

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
    if (!templateCode) {
      this.logger.warn(`Kakao 템플릿 미설정: type=${notification.type} (${envKey ?? 'no-mapping'})`);
      await this.updateKakaoStatus(notification.id, 'skipped', null);
      return;
    }

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
}
