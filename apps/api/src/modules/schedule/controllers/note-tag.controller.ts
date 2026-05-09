import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NoteTagService } from '../services/note-tag.service';
import { CreateNoteTagDto, UpdateNoteTagDto } from '../dto';

@ApiTags('노트 태그')
@Controller('note-tags')
export class NoteTagController {
  constructor(private readonly service: NoteTagService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '태그 생성' })
  create(@Body() dto: CreateNoteTagDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 태그 목록' })
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '태그 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateNoteTagDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '태그 삭제 (연결된 노트는 자동 분리)' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user);
  }
}
