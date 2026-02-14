import { Module, OnModuleInit } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { FileStorageService } from './services/file-storage.service';
import { ThumbnailService } from './services/thumbnail.service';
import { PdfGeneratorService } from './services/pdf-generator.service';

@Module({
    controllers: [UploadController],
    providers: [FileStorageService, ThumbnailService, PdfGeneratorService],
    exports: [FileStorageService, ThumbnailService, PdfGeneratorService],
})
export class UploadModule implements OnModuleInit {
    constructor(private readonly fileStorage: FileStorageService) {}

    onModuleInit() {
        // 서버 시작 시 24시간 이상 된 임시 파일 정리
        this.fileStorage.cleanupStaleTempFiles();
    }
}
