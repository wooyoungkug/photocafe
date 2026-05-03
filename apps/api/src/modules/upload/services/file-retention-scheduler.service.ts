import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { existsSync, rmSync, readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { FileStorageService } from './file-storage.service';

/**
 * 파일 자동삭제 스케줄러
 *
 * - 매일 KST 03:00 실행
 * - 배송완료(shipped) 주문에 대해 거래처별 보관 기간을 적용해
 *   originals / thumbnails 폴더를 자동 삭제한다.
 * - B2 클라우드 스토리지는 이번 스코프에서 제외 (로컬 uploads 폴더만 대상)
 */
@Injectable()
export class FileRetentionSchedulerService {
  private readonly logger = new Logger(FileRetentionSchedulerService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileStorage: FileStorageService,
  ) {}

  /** 매일 KST 03:00 자동 실행 */
  @Cron('0 0 3 * * *', { timeZone: 'Asia/Seoul' })
  async scheduledRun() {
    await this.runRetentionCleanup();
  }

  /**
   * 실제 보관기간 정리 로직 (스케줄/수동 공통)
   */
  async runRetentionCleanup(): Promise<{
    processedOrders: number;
    originalsDeletedOrders: number;
    thumbnailsDeletedOrders: number;
    deletedFiles: number;
    freedBytes: number;
  }> {
    if (this.isRunning) {
      this.logger.warn('이전 보관기간 정리 작업이 아직 실행 중입니다. 건너뜁니다.');
      return {
        processedOrders: 0,
        originalsDeletedOrders: 0,
        thumbnailsDeletedOrders: 0,
        deletedFiles: 0,
        freedBytes: 0,
      };
    }

    this.isRunning = true;
    this.logger.log('=== 파일 보관기간 자동삭제 시작 ===');

    let processedOrders = 0;
    let originalsDeletedOrders = 0;
    let thumbnailsDeletedOrders = 0;
    let deletedFiles = 0;
    let freedBytes = 0;

    try {
      const orders = (await this.prisma.order.findMany({
        where: {
          status: 'shipped',
          shipping: {
            shippedAt: { not: null },
          },
        },
        include: {
          shipping: true,
          client: true,
          items: {
            include: {
              files: {
                select: {
                  originalPath: true,
                  thumbnailPath: true,
                },
              },
            },
          },
        },
      })) as any[];

      this.logger.log(`대상 주문 (shipped + shippedAt): ${orders.length}건`);

      const now = new Date();

      for (const order of orders) {
        const shippedAt = order.shipping?.shippedAt;
        if (!shippedAt) continue;

        const fileDays = order.client?.fileRetentionDays ?? 90;
        const thumbMonths = order.client?.thumbnailRetentionMonths ?? 6;

        const orderDir = this.resolveOrderDir(order);
        if (!orderDir) {
          // 경로를 알 수 없는 주문은 skip
          continue;
        }

        const originalsExpired = this.isExpired(shippedAt, fileDays, now);
        const thumbnailsExpired = this.isExpired(shippedAt, thumbMonths, now);

        let touchedThisOrder = false;

        // 1) 원본 폴더 만료 처리
        if (originalsExpired) {
          const originalsDir = join(orderDir, 'originals');
          if (existsSync(originalsDir)) {
            try {
              const result = this.fileStorage.deleteOriginals(orderDir);
              if (result.deletedCount > 0 || existsSync(originalsDir) === false) {
                deletedFiles += result.deletedCount;
                freedBytes += result.freedBytes;
                originalsDeletedOrders++;
                touchedThisOrder = true;
                this.logger.log(
                  `[originals 삭제] ${order.orderNumber}: ${result.deletedCount}개 파일, ${(
                    result.freedBytes /
                    1024 /
                    1024
                  ).toFixed(2)}MB`,
                );
              }
            } catch (err) {
              this.logger.error(
                `originals 삭제 실패 ${order.orderNumber}: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        }

        // 2) 썸네일 폴더 만료 처리
        if (thumbnailsExpired) {
          const thumbnailsDir = join(orderDir, 'thumbnails');
          if (existsSync(thumbnailsDir)) {
            try {
              const removed = this.deleteFolder(thumbnailsDir);
              if (removed.deletedCount > 0) {
                deletedFiles += removed.deletedCount;
                freedBytes += removed.freedBytes;
                thumbnailsDeletedOrders++;
                touchedThisOrder = true;
                this.logger.log(
                  `[thumbnails 삭제] ${order.orderNumber}: ${removed.deletedCount}개 파일, ${(
                    removed.freedBytes /
                    1024 /
                    1024
                  ).toFixed(2)}MB`,
                );
              }
            } catch (err) {
              this.logger.error(
                `thumbnails 삭제 실패 ${order.orderNumber}: ${err instanceof Error ? err.message : String(err)}`,
              );
            }
          }
        }

        if (touchedThisOrder) processedOrders++;
      }

      this.logger.log(
        `=== 파일 보관기간 자동삭제 완료: 처리 ${processedOrders}건 ` +
          `(원본 ${originalsDeletedOrders} / 썸네일 ${thumbnailsDeletedOrders}), ` +
          `파일 ${deletedFiles}개, 절약 ${(freedBytes / 1024 / 1024).toFixed(2)}MB ===`,
      );
    } catch (err) {
      this.logger.error(
        `파일 보관기간 자동삭제 전체 오류: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.isRunning = false;
    }

    return {
      processedOrders,
      originalsDeletedOrders,
      thumbnailsDeletedOrders,
      deletedFiles,
      freedBytes,
    };
  }

  /**
   * shippedAt + days 가 now 보다 이전이면 만료된 것으로 판정
   */
  private isExpired(shippedAt: Date, days: number, now: Date): boolean {
    if (!days || days <= 0) return false;
    const expireAt = new Date(shippedAt);
    expireAt.setDate(expireAt.getDate() + days);
    return expireAt.getTime() < now.getTime();
  }

  /**
   * 주문 디렉토리 경로 추출
   *
   * 우선순위:
   *   1) 어떤 OrderFile.originalPath 가 있으면 그 부모의 부모를 사용
   *   2) OrderFile.thumbnailPath 가 있으면 그 부모의 부모를 사용
   *   3) 둘 다 없으면 null (skip)
   */
  private resolveOrderDir(order: {
    items: Array<{
      files: Array<{ originalPath: string | null; thumbnailPath: string | null }>;
    }>;
  }): string | null {
    for (const item of order.items) {
      for (const file of item.files) {
        if (file.originalPath) {
          return dirname(dirname(file.originalPath));
        }
      }
    }
    for (const item of order.items) {
      for (const file of item.files) {
        if (file.thumbnailPath) {
          return dirname(dirname(file.thumbnailPath));
        }
      }
    }
    return null;
  }

  /**
   * 폴더 내 파일 수 / 용량 집계 후 폴더 통째 삭제
   */
  private deleteFolder(dir: string): { deletedCount: number; freedBytes: number } {
    let deletedCount = 0;
    let freedBytes = 0;

    if (!existsSync(dir)) return { deletedCount, freedBytes };

    const walk = (target: string) => {
      const entries = readdirSync(target);
      for (const entry of entries) {
        const full = join(target, entry);
        try {
          const stat = statSync(full);
          if (stat.isDirectory()) {
            walk(full);
          } else {
            freedBytes += stat.size;
            deletedCount++;
          }
        } catch {
          // ignore individual stat errors
        }
      }
    };

    try {
      walk(dir);
      rmSync(dir, { recursive: true, force: true });
    } catch (err) {
      this.logger.error(
        `폴더 삭제 실패: ${dir} - ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { deletedCount, freedBytes };
  }
}
