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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CommitteeService } from '../services/committee.service';
import {
  CreateCommitteeDto,
  UpdateCommitteeDto,
  AddMemberDto,
  CommitteeQueryDto,
} from '../dto';

@ApiTags('인사위원회')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hr-committees')
export class CommitteeController {
  constructor(private readonly committeeService: CommitteeService) {}

  @Get()
  @ApiOperation({ summary: '위원회 목록 조회' })
  findAll(@Query() query: CommitteeQueryDto) {
    return this.committeeService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: '위원회 생성' })
  create(@Body() dto: CreateCommitteeDto) {
    return this.committeeService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '위원회 상세 조회 (위원 포함)' })
  findOne(@Param('id') id: string) {
    return this.committeeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '위원회 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateCommitteeDto) {
    return this.committeeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '위원회 삭제' })
  remove(@Param('id') id: string) {
    return this.committeeService.remove(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: '위원 추가' })
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.committeeService.addMember(id, dto);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: '위원 해임 (releasedAt 설정)' })
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.committeeService.removeMember(id, memberId);
  }
}
