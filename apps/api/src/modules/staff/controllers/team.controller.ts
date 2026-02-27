import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { TeamService } from '../services/team.service';
import { StaffService } from '../services/staff.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  TeamQueryDto,
  AssignTeamMembersDto,
  SetTeamLeaderDto,
} from '../dto/team.dto';

@ApiTags('팀관리')
@ApiBearerAuth()
@Controller('teams')
@UseGuards(StaffOnlyGuard)
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly staffService: StaffService,
  ) {}

  private async checkPermission(requesterId: string) {
    const hasAdmin = await this.staffService.checkAdminPermission(requesterId);
    if (hasAdmin) return;
    throw new ForbiddenException('팀 관리 권한이 없습니다');
  }

  @Get()
  @ApiOperation({ summary: '팀 목록 조회' })
  async findAll(@Query() query: TeamQueryDto) {
    return this.teamService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '팀 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.teamService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '팀 생성' })
  async create(@Body() data: CreateTeamDto, @Request() req: any) {
    await this.checkPermission(req.user.id);
    return this.teamService.create(data, { id: req.user.id, name: req.user.name });
  }

  @Put(':id')
  @ApiOperation({ summary: '팀 수정' })
  async update(@Param('id') id: string, @Body() data: UpdateTeamDto, @Request() req: any) {
    await this.checkPermission(req.user.id);
    return this.teamService.update(id, data, { id: req.user.id, name: req.user.name });
  }

  @Delete(':id')
  @ApiOperation({ summary: '팀 삭제' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.checkPermission(req.user.id);
    return this.teamService.delete(id, { id: req.user.id, name: req.user.name });
  }

  @Put(':id/members')
  @ApiOperation({ summary: '팀 멤버 일괄 배정' })
  async assignMembers(
    @Param('id') id: string,
    @Body() data: AssignTeamMembersDto,
    @Request() req: any,
  ) {
    await this.checkPermission(req.user.id);
    return this.teamService.assignMembers(id, data.staffIds, { id: req.user.id, name: req.user.name });
  }

  @Delete(':id/members/:staffId')
  @ApiOperation({ summary: '팀 멤버 제거' })
  async removeMember(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
    @Request() req: any,
  ) {
    await this.checkPermission(req.user.id);
    return this.teamService.removeMember(id, staffId, { id: req.user.id, name: req.user.name });
  }

  @Patch(':id/leader')
  @ApiOperation({ summary: '팀 리더 지정' })
  async setLeader(
    @Param('id') id: string,
    @Body() data: SetTeamLeaderDto,
    @Request() req: any,
  ) {
    await this.checkPermission(req.user.id);
    return this.teamService.setLeader(id, data.staffId, { id: req.user.id, name: req.user.name });
  }
}
