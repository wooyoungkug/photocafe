import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { NoteService } from '../services/note.service';
import { CreateNoteDto, UpdateNoteDto, QueryNoteDto } from '../dto';

@ApiTags('노트')
@Controller('notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트 생성' })
  create(@Body() dto: CreateNoteDto, @Req() req: any) {
    return this.noteService.create(dto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트 목록 조회 (개인/부서/전체 + 노트북/태그 필터)' })
  findAll(@Query() query: QueryNoteDto, @Req() req: any) {
    return this.noteService.findAll(query, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트 상세 조회' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.noteService.findOne(id, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto, @Req() req: any) {
    return this.noteService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트 삭제' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.noteService.delete(id, req.user);
  }
}
