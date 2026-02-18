import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertSettingDto {
    @IsString()
    value: string;

    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    label?: string;
}

export class BulkSettingItemDto {
    @IsString()
    key: string;

    @IsString()
    value: string;

    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    label?: string;
}

export class BulkUpsertSettingsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkSettingItemDto)
    settings: BulkSettingItemDto[];
}
