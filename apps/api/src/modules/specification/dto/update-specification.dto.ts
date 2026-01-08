import { PartialType } from '@nestjs/swagger';
import { CreateSpecificationDto } from './create-specification.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSpecificationDto extends PartialType(CreateSpecificationDto) {
    @ApiPropertyOptional({ description: '활성화 상태' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
