import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type NoteAiAction = 'summarize' | 'proofread' | 'suggest-title' | 'to-bullets';

export class NoteAiAssistDto {
  @ApiProperty({
    description: 'AI 보조 작업 종류',
    enum: ['summarize', 'proofread', 'suggest-title', 'to-bullets'],
  })
  @IsIn(['summarize', 'proofread', 'suggest-title', 'to-bullets'])
  action!: NoteAiAction;

  @ApiPropertyOptional({ description: '메모 ID (요약 캐시·로깅용)' })
  @IsOptional()
  @IsString()
  noteId?: string;

  @ApiPropertyOptional({ description: '제목 (제목 추천 시 참고)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '본문 (HTML 또는 plain text)' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: "본문 형식 ('html' | 'text')", enum: ['html', 'text'] })
  @IsOptional()
  @IsIn(['html', 'text'])
  contentFormat?: 'html' | 'text';
}
