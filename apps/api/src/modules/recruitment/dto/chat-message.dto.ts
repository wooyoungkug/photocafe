import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({ description: '메시지 내용', minLength: 1, maxLength: 1000 })
  @IsString()
  @MinLength(1, { message: '메시지를 입력해주세요.' })
  @MaxLength(1000, { message: '메시지는 1000자 이내로 입력해주세요.' })
  content: string;
}
