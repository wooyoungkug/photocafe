import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FileStorageService } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { B2StorageService } from './services/b2-storage.service';
import { R2StorageService } from './services/r2-storage.service';
import { WorkerUploadProxyService } from './services/worker-upload-proxy.service';
import { FileRetentionSchedulerService } from './services/file-retention-scheduler.service';
import { TempCleanupSchedulerService } from './services/temp-cleanup-scheduler.service';
import { UploadMetricsService } from './services/upload-metrics.service';
import { UploadMetricsInterceptor } from './interceptors/upload-metrics.interceptor';
import { PrismaModule } from '../../common/prisma/prisma.module';

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
        TempCleanupSchedulerService,
        UploadMetricsService,
        UploadMetricsInterceptor,
    ],
    exports: [
        FileStorageService,
        ThumbnailService,
        PdfGeneratorService,
        B2StorageService,
        R2StorageService,
        WorkerUploadProxyService,
        FileRetentionSchedulerService,
        TempCleanupSchedulerService,
        UploadMetricsService,
    ],
})
export class UploadModule {}
