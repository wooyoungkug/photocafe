import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FileStorageService } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { B2StorageService } from './services/b2-storage.service';
import { R2StorageService } from './services/r2-storage.service';
import { WorkerUploadProxyService } from './services/worker-upload-proxy.service';
import { FileRetentionSchedulerService } from './services/file-retention-scheduler.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6시간

@Module({
    imports: [PrismaModule],
    controllers: [UploadController],
    providers: [
        FileStorageService,
        ThumbnailService,
        PdfGeneratorService,
        B2StorageService,
        R2StorageService,
        WorkerUploadProxyService,
        FileRetentionSchedulerService,
    ],
    exports: [
        FileStorageService,
        ThumbnailService,
        PdfGeneratorService,
        B2StorageService,
        R2StorageService,
        WorkerUploadProxyService,
        FileRetentionSchedulerService,
    ],
})
export class UploadModule implements OnModuleInit, OnModuleDestroy {
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly fileStorage: FileStorageService) {}

    onModuleInit() {
        // 서버 시작 시 즉시 실행 + 6시간마다 반복
        this.fileStorage.cleanupStaleTempFiles();
        this.cleanupTimer = setInterval(() => {
            this.fileStorage.cleanupStaleTempFiles();
        }, CLEANUP_INTERVAL_MS);
    }

    onModuleDestroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }
}
