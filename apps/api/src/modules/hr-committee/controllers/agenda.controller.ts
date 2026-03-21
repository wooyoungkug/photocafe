import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AgendaService } from '../services/agenda.service';
import {
  CreateAgendaDto,
  AgendaQueryDto,
  UpdateAgendaStatusDto,
  CastVoteDto,
  MakeDecisionDto,
} from '../dto';

@ApiTags('인사위원회 안건')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr-agendas')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @ApiOperation({ summary: '안건 목록 조회' })
  findAll(@Query() query: AgendaQueryDto) {
    return this.agendaService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: '안건 생성' })
  create(@Body() dto: CreateAgendaDto, @Request() req: any) {
    return this.agendaService.create(dto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '안건 상세 조회 (투표, 결정 포함)' })
  findOne(@Param('id') id: string) {
    return this.agendaService.findOne(id);
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: '안건 제출 (DRAFT → SUBMITTED)' })
  submit(@Param('id') id: string) {
    return this.agendaService.submit(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '안건 상태 변경' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAgendaStatusDto) {
    return this.agendaService.updateStatus(id, dto);
  }

  @Post(':id/vote')
  @ApiOperation({ summary: '투표 (전원 투표 시 자동 VOTED 상태 전환)' })
  castVote(
    @Param('id') id: string,
    @Body() dto: CastVoteDto,
    @Request() req: any,
  ) {
    return this.agendaService.castVote(id, req.user.id, dto);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: '결정 기록 (가결/부결)' })
  makeDecision(@Param('id') id: string, @Body() dto: MakeDecisionDto) {
    return this.agendaService.makeDecision(id, dto);
  }
}
