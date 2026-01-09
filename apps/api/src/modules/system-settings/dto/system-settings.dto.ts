import { IsString, IsOptional } from 'class-validator';

export class UpsertSettingDto {
    @IsString()
    value: string;

    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    label?: string;
}
