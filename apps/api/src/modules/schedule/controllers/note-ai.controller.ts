import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NoteAiService } from '../services/note-ai.service';
import { NoteAiAssistDto } from '../dto/note-ai.dto';

@ApiTags('노트 AI 보조')
@Controller('notes')
export class NoteAiController {
  constructor(private readonly service: NoteAiService) {}

  @Get('ai/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 보조 사용 가능 여부' })
  status() {
    return { enabled: this.service.isEnabled() };
  }

  @Post('ai-assist')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI 보조 편집 (요약/맞춤법/제목 추천/글머리 기호 변환)',
  })
  assist(@Body() dto: NoteAiAssistDto, @Req() req: any) {
    return this.service.assist(dto, req.user);
  }
}
