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
import { NotebookService } from '../services/notebook.service';
import { CreateNotebookDto, UpdateNotebookDto } from '../dto';

@ApiTags('노트북')
@Controller('notebooks')
export class NotebookController {
  constructor(private readonly service: NotebookService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트북 생성' })
  create(@Body() dto: CreateNotebookDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '접근 가능한 노트북 목록' })
  findAll(@Req() req: any) {
    return this.service.findAll(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트북 상세' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트북 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateNotebookDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '노트북 삭제 (하위/메모 없을 때만)' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.service.delete(id, req.user);
  }
}
