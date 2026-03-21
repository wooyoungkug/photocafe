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
import { LeaveRequestService } from '../services/leave-request.service';
import { CreateLeaveRequestDto, QueryLeaveRequestDto, ApproveLeaveRequestDto } from '../dto';

@ApiTags('휴가 신청')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leave-requests')
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Get()
  @ApiOperation({ summary: '휴가 신청 목록 조회' })
  async findAll(@Query() query: QueryLeaveRequestDto) {
    return this.leaveRequestService.findAll(query);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: '내 결재 대기 목록' })
  async pendingApprovals(@Request() req: any) {
    return this.leaveRequestService.findPendingApprovals(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '휴가 신청 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.leaveRequestService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '휴가 신청' })
  async create(@Body() dto: CreateLeaveRequestDto, @Request() req: any) {
    return this.leaveRequestService.create(dto, req.user.id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '휴가 신청 취소' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.leaveRequestService.cancel(id, req.user.id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '휴가 승인/반려' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveLeaveRequestDto,
    @Request() req: any,
  ) {
    return this.leaveRequestService.approve(id, dto, req.user.id);
  }
}
