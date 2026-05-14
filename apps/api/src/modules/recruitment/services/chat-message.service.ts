import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class ChatMessageService {
  private readonly logger = new Logger(ChatMessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 채팅방 접근 권한 확인
   * - bid.bidderId === requesterId (응찰 작가 본인)
   * - recruitment.createdBy === requesterId (구인 등록자)
   * - recruitment.clientId === requesterId (구인 등록 스튜디오)
   *
   * @returns { role: 'studio' | 'photographer', clientName: string }
   */
  private async checkAccess(bidId: string, requesterId: string) {
    const bid = await this.prisma.recruitmentBid.findUnique({
      where: { id: bidId },
      include: {
        recruitment: {
          select: { id: true, createdBy: true, clientId: true },
        },
      },
    });

    if (!bid) {
      throw new NotFoundException('응찰 정보를 찾을 수 없습니다.');
    }

    const isBidder = bid.bidderId === requesterId;
    const isStudio =
      bid.recruitment.createdBy === requesterId ||
      bid.recruitment.clientId === requesterId;

    if (!isBidder && !isStudio) {
      throw new ForbiddenException('채팅에 접근할 권한이 없습니다.');
    }

    // 요청자 이름 조회
    const requester = await this.prisma.client.findUnique({
      where: { id: requesterId },
      select: { clientName: true },
    });

    return {
      role: (isBidder ? 'photographer' : 'studio') as 'photographer' | 'studio',
      clientName: requester?.clientName ?? '사용자',
      bid,
    };
  }

  /**
   * 메시지 목록 조회 (최신 100개, createdAt ASC)
   */
  async getMessages(bidId: string, requesterId: string) {
    await this.checkAccess(bidId, requesterId);

    // 최신 100개를 DESC로 가져온 뒤 ASC 순서로 반환
    const messages = await this.prisma.chatMessage.findMany({
      where: { bidId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return messages.reverse();
  }

  /**
   * 메시지 전송
   */
  async sendMessage(bidId: string, requesterId: string, content: string) {
    const { role, clientName } = await this.checkAccess(bidId, requesterId);

    const trimmed = content.trim();
    if (!trimmed) {
      throw new NotFoundException('메시지 내용이 비어 있습니다.');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        bidId,
        senderId: requesterId,
        senderName: clientName,
        senderRole: role,
        content: trimmed,
      },
    });

    this.logger.log(
      `채팅 메시지 전송: bid=${bidId}, sender=${requesterId} (${role})`,
    );

    return message;
  }
}
