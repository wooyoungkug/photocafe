import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { DisciplineService } from '../services/discipline.service';
import { CreateDisciplineRecordDto, DisciplineQueryDto } from '../dto';

@ApiTags('인사기록 (포상/징계)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('discipline-records')
export class DisciplineController {
  constructor(private readonly disciplineService: DisciplineService) {}

  @Get()
  @ApiOperation({ summary: '인사기록 목록 조회' })
  findAll(@Query() query: DisciplineQueryDto) {
    return this.disciplineService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: '인사기록 생성' })
  create(@Body() dto: CreateDisciplineRecordDto, @Request() req: any) {
    return this.disciplineService.create(dto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '인사기록 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.disciplineService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '인사기록 삭제' })
  remove(@Param('id') id: string) {
    return this.disciplineService.remove(id);
  }
}
