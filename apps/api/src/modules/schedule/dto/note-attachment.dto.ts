import { ApiPropertyOptional } from '@nestjs/swagger';

export class AttachmentResponseDto {
  @ApiPropertyOptional() id!: string;
  @ApiPropertyOptional() memoId!: string;
  @ApiPropertyOptional() url!: string;
  @ApiPropertyOptional() fileName!: string;
  @ApiPropertyOptional() mimeType!: string;
  @ApiPropertyOptional() sizeBytes!: number;
  @ApiPropertyOptional() uploadedBy!: string;
  @ApiPropertyOptional() createdAt!: Date;
}
