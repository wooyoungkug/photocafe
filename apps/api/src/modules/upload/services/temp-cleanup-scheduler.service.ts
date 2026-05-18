import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FileStorageService } from './file-storage.service';
import { B2StorageService } from './b2-storage.service';

/**
 * 임시 업로드 파일(temp) 자동 정리 스케줄러
 *
 * - 매일 KST 03:30 실행 (보관기간 정리 FileRetentionSchedulerService 직후)
 * - 로컬 디스크: `${UPLOAD_BASE_PATH}/temp/{tempFolderId}/` 중 24시간 이상 미수정 폴더 삭제
 * - B2 private 버킷: `temp/` prefix 객체 중 LastModified > 24시간 객체 삭제
 *
 * 정리 대상: 사용자가 업로드 중 페이지 이탈/중단으로 주문 확정으로 final 경로(orders/{orderNumber}/...)
 *           로 이동되지 못한 고아 파일.
 *
 * 운영 정상 흐름:
 *   업로드 → temp/{tfid}/ → 주문확정 → orders/{orderNumber}/ (복사) + temp/ 삭제
 *
 * 따라서 24시간 지나도 temp/ 에 남아있는 객체 = 고아 → 안전하게 삭제 가능.
 */
@Injectable()
export class TempCleanupSchedulerService {
  private readonly logger = new Logger(TempCleanupSchedulerService.name);
  private isRunning = false;

  /** temp 파일 보관 시간 (시간 단위) — 이보다 오래된 파일 삭제 */
  private readonly TEMP_CUTOFF_HOURS = 24;

  constructor(
    private readonly fileStorage: FileStorageService,
    private readonly b2: B2StorageService,
  ) {}

  /** 매일 KST 03:30 자동 실행 (보관기간 정리 03:00 직후) */
  @Cron('0 30 3 * * *', { timeZone: 'Asia/Seoul' })
  async scheduledRun() {
    await this.runTempCleanup();
  }

  /**
   * 실제 정리 로직 (스케줄/수동 공통).
   * 로컬 디스크 + B2 private 양쪽 정리.
   */
  async runTempCleanup(): Promise<{
    localCleaned: number;
    b2Deleted: number;
    b2FreedBytes: number;
  }> {
    if (this.isRunning) {
      this.logger.warn('이전 temp 정리 작업이 아직 실행 중입니다. 건너뜁니다.');
      return { localCleaned: 0, b2Deleted: 0, b2FreedBytes: 0 };
    }

    this.isRunning = true;
    this.logger.log(`=== Temp 파일 자동 정리 시작 (cutoff: ${this.TEMP_CUTOFF_HOURS}h) ===`);

    let localCleaned = 0;
    let b2Deleted = 0;
    let b2FreedBytes = 0;

    try {
      // 1) 로컬 디스크 temp 폴더 정리
      try {
        const localResult = this.fileStorage.cleanupStaleTempFiles(this.TEMP_CUTOFF_HOURS);
        localCleaned = localResult.cleaned;
      } catch (err) {
        this.logger.error('로컬 temp 정리 실패', err);
      }

      // 2) B2 private 버킷 temp/ 프리픽스 정리
      try {
        const b2Result = await this.b2.cleanupStaleTempObjects(this.TEMP_CUTOFF_HOURS);
        b2Deleted = b2Result.deletedCount;
        b2FreedBytes = b2Result.freedBytes;
      } catch (err) {
        this.logger.error('B2 temp 정리 실패', err);
      }

      this.logger.log(
        `=== Temp 정리 완료 - 로컬: ${localCleaned}개 폴더, B2: ${b2Deleted}개 객체 (${(b2FreedBytes / 1024 / 1024).toFixed(1)} MB) ===`,
      );
    } finally {
      this.isRunning = false;
    }

    return { localCleaned, b2Deleted, b2FreedBytes };
  }
}
