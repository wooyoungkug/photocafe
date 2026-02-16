import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FileStorageService } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6시간

@Module({
    controllers: [UploadController],
    providers: [FileStorageService, ThumbnailService, PdfGeneratorService],
    exports: [FileStorageService, ThumbnailService, PdfGeneratorService],
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
