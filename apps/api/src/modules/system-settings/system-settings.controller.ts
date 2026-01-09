import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { UpsertSettingDto } from './dto/system-settings.dto';

@Controller('system-settings')
export class SystemSettingsController {
    constructor(private readonly settingsService: SystemSettingsService) { }

    @Get()
    findAll(@Query('category') category?: string) {
        return this.settingsService.findAll(category);
    }

    @Get(':key')
    findByKey(@Param('key') key: string) {
        return this.settingsService.findByKey(key);
    }

    @Put(':key')
    upsert(@Param('key') key: string, @Body() dto: UpsertSettingDto) {
        return this.settingsService.upsert(key, dto);
    }

    @Post('bulk')
    bulkUpsert(@Body() settings: { key: string; value: string; category: string; label?: string }[]) {
        return this.settingsService.bulkUpsert(settings);
    }
}
