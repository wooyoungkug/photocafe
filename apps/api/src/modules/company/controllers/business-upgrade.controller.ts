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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { BusinessUpgradeService } from '../services/business-upgrade.service';
import { BusinessUpgradeRequestDto, ProcessBusinessUpgradeDto } from '../dto';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class BusinessUpgradeController {
  constructor(private businessUpgradeService: BusinessUpgradeService) {}

  // ==================== 회원 본인 ====================

  @Post('me/business-upgrade')
  @ApiOperation({ summary: '사업자 회원 전환 신청 (마이페이지)' })
  async requestUpgrade(@Request() req: any, @Body() dto: BusinessUpgradeRequestDto) {
    this.assertClient(req);
    return this.businessUpgradeService.requestUpgrade(req.user.clientId || req.user.sub, dto);
  }

  @Get('me/business-upgrade')
  @ApiOperation({ summary: '내 사업자 회원 전환 신청 상태 조회' })
  async getMyUpgradeStatus(@Request() req: any) {
    this.assertClient(req);
    return this.businessUpgradeService.getMyUpgradeStatus(req.user.clientId || req.user.sub);
  }

  @Get('me/business-cert-url')
  @ApiOperation({ summary: '내가 제출한 사업자등록증 다운로드 URL (5분 유효)' })
  async getMyCertUrl(@Request() req: any) {
    this.assertClient(req);
    return this.businessUpgradeService.getMyCertUrl(req.user.clientId || req.user.sub);
  }

  // ==================== 관리자 ====================

  @Get('business-upgrade-requests')
  @UseGuards(StaffOnlyGuard)
  @ApiOperation({ summary: '[관리자] 사업자 회원 전환 신청 목록' })
  @ApiQuery({ name: 'status', required: false, description: '기본값 pending (pending|approved|rejected)' })
  async listRequests(@Query('status') status?: string) {
    return this.businessUpgradeService.listRequests(status || 'pending');
  }

  @Get(':id/business-cert-url')
  @UseGuards(StaffOnlyGuard)
  @ApiOperation({ summary: '[관리자] 회원의 사업자등록증 다운로드 URL (5분 유효)' })
  async getCertUrl(@Param('id') id: string) {
    return this.businessUpgradeService.getCertUrl(id);
  }

  @Patch(':id/business-upgrade')
  @UseGuards(StaffOnlyGuard)
  @ApiOperation({ summary: '[관리자] 사업자 회원 전환 신청 승인/반려' })
  async process(@Param('id') id: string, @Body() dto: ProcessBusinessUpgradeDto) {
    return this.businessUpgradeService.process(id, dto);
  }

  private assertClient(req: any) {
    if (req.user?.type === 'staff') {
      throw new ForbiddenException('회원 계정으로만 사업자 전환을 신청할 수 있습니다');
    }
  }
}
