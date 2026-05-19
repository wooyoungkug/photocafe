import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';

/**
 * 핫폴더 에이전트 비즈니스 로직 (Phase 8).
 *
 * - getPendingFiles: PrintReadyFile 중 해당 에이전트가 아직 다운받지 않은 것
 * - markDownloaded: 다운로드 성공 시 PrintDownloadLog 기록 + OrderItem 상태 갱신
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  /** 5분 유효 presigned URL */
  private readonly PRESIGN_TTL = 300;

  constructor(
    private readonly prisma: PrismaService,
    private readonly b2: B2StorageService,
  ) {}

  /**
   * 해당 에이전트가 아직 다운로드하지 않은 PrintReadyFile 목록.
   * 각 파일에 5분 유효한 B2 presigned URL 을 포함.
   */
  async getPendingFiles(agentId: string, limit = 50) {
    // PrintDownloadLog 에서 agentId 가 이미 받은 printReadyFileId 들 제외
    const downloaded = await this.prisma.printDownloadLog.findMany({
      where: { agentId, printReadyFileId: { not: null } },
      select: { printReadyFileId: true },
    });
    const excludeIds = new Set(
      downloaded
        .map((d) => d.printReadyFileId)
        .filter((v): v is string => !!v),
    );

    const files = await this.prisma.printReadyFile.findMany({
      where: excludeIds.size
        ? { id: { notIn: Array.from(excludeIds) } }
        : undefined,
      orderBy: { preparedAt: 'asc' },
      take: limit,
      include: {
        orderItem: {
          select: {
            id: true,
            productionNumber: true,
            productName: true,
            size: true,
            order: {
              select: {
                id: true,
                orderNumber: true,
                orderedAt: true,
                client: {
                  select: { id: true, clientCode: true, clientName: true },
                },
              },
            },
          },
        },
      },
    });

    const result = await Promise.all(
      files.map(async (f) => {
        let downloadUrl: string | null = null;
        try {
          downloadUrl = await this.b2.getPrivatePresignedUrl(
            f.b2Key,
            this.PRESIGN_TTL,
            { downloadFileName: f.fileName },
          );
        } catch (err) {
          this.logger.warn(
            `[Agent] presigned URL 생성 실패 (${f.b2Key}): ${(err as Error)?.message}`,
          );
        }
        return {
          printReadyFileId: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          printMethod: f.printMethod, // 'indigo' or 'inkjet'
          fileType: f.fileType, // 'pdf' or 'jpg'
          b2Key: f.b2Key,
          downloadUrl,
          orderItemId: f.orderItemId,
          orderNumber: f.orderItem?.order?.orderNumber ?? null,
          studioCode: f.orderItem?.order?.client?.clientCode ?? null,
          studioName: f.orderItem?.order?.client?.clientName ?? null,
          productionNumber: f.orderItem?.productionNumber ?? null,
          productName: f.orderItem?.productName ?? null,
          orderedAt: f.orderItem?.order?.orderedAt ?? null,
          preparedAt: f.preparedAt,
        };
      }),
    );

    return result.filter((r) => r.downloadUrl);
  }

  /**
   * 에이전트가 파일을 핫폴더에 성공적으로 저장한 후 호출.
   * - PrintDownloadLog 신규 row
   * - 해당 PrintReadyFile 의 OrderItem.printRoomStatus 가 'imposed' 또는 'ready' 일 때 → 'printing' 으로 전환
   */
  async markDownloaded(input: {
    agentId: string;
    printReadyFileId: string;
    localPath: string;
    fileSize: number;
  }) {
    const file = await this.prisma.printReadyFile.findUnique({
      where: { id: input.printReadyFileId },
      select: { id: true, orderItemId: true, fileSize: true },
    });
    if (!file) {
      // 비정상 상황. 200 으로 응답하되 로그
      this.logger.warn(
        `[Agent] markDownloaded: PrintReadyFile ${input.printReadyFileId} 없음`,
      );
      return { recorded: false, reason: 'file_not_found' as const };
    }

    await this.prisma.printDownloadLog.create({
      data: {
        orderItemId: file.orderItemId,
        printReadyFileId: file.id,
        agentId: input.agentId,
        downloadType: 'agent_hotfolder',
        fileCount: 1,
        totalBytes: BigInt(input.fileSize ?? file.fileSize),
        localPath: input.localPath,
      },
    });

    // OrderItem 상태 — imposed/ready 일 때만 printing 으로
    await this.prisma.orderItem.updateMany({
      where: {
        id: file.orderItemId,
        printRoomStatus: { in: ['imposed', 'ready'] },
      },
      data: { printRoomStatus: 'printing' },
    });

    return { recorded: true };
  }
}
