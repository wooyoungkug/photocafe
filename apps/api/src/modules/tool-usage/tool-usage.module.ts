import { Module } from '@nestjs/common';
import { ToolUsageController } from './tool-usage.controller';
import { ToolUsageService } from './tool-usage.service';

@Module({
    controllers: [ToolUsageController],
    providers: [ToolUsageService],
    exports: [ToolUsageService],
})
export class ToolUsageModule {}
