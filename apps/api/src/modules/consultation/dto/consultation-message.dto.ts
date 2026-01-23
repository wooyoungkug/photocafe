import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsDateString,
  IsEnum,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

export enum MessageChannel {
  KAKAO = 'kakao',
  PHONE = 'phone',
  EMAIL = 'email',
  SYSTEM = 'system',
}

export enum MessageSenderType {
  STAFF = 'staff',
  CLIENT = 'client',
}

export class AttachmentDto {
  @ApiProperty({ description: '첨부파일 유형', example: 'image' })
  @IsString()
  type: string;

  @ApiProperty({ description: '첨부파일 URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: '첨부파일명' })
  @IsString()
  @IsOptional()
  name?: string;
}

export class CreateMessageDto {
  @ApiProperty({
    description: '메시지 방향',
    enum: MessageDirection,
    example: MessageDirection.OUTBOUND,
  })
  @IsEnum(MessageDirection)
  direction: MessageDirection;

  @ApiPropertyOptional({
    description: '채널 유형',
    enum: MessageChannel,
    default: MessageChannel.KAKAO,
  })
  @IsEnum(MessageChannel)
  @IsOptional()
  channel?: MessageChannel;

  @ApiProperty({ description: '메시지 내용' })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: '첨부파일 배열',
    type: [AttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];

  @ApiProperty({ description: '발신자명' })
  @IsString()
  senderName: string;

  @ApiProperty({
    description: '발신자 유형',
    enum: MessageSenderType,
  })
  @IsEnum(MessageSenderType)
  senderType: MessageSenderType;

  @ApiPropertyOptional({ description: '기록 직원 ID' })
  @IsString()
  @IsOptional()
  staffId?: string;

  @ApiPropertyOptional({ description: '기록 직원명' })
  @IsString()
  @IsOptional()
  staffName?: string;

  @ApiPropertyOptional({ description: '실제 대화 시간' })
  @IsDateString()
  @IsOptional()
  messageAt?: string;
}

export class UpdateMessageDto {
  @ApiPropertyOptional({ description: '메시지 내용' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: '첨부파일 배열',
    type: [AttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}

export class MessageQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 50 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: '채널 필터',
    enum: MessageChannel,
  })
  @IsEnum(MessageChannel)
  @IsOptional()
  channel?: MessageChannel;
}

export class MarkAsReadDto {
  @ApiPropertyOptional({ description: '읽음 처리할 메시지 ID 배열 (없으면 전체)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  messageIds?: string[];
}
