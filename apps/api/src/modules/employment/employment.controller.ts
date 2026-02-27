import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ClientOwnerOrManagerGuard } from '@/common/guards/client-owner-or-manager.guard';
import { Public } from '@/common/decorators/public.decorator';
import { EmploymentService } from './employment.service';
import {
  CreateInvitationDto,
  UpdateEmploymentDto,
  AcceptInvitationDto,
  AcceptInvitationExistingDto,
} from './dto/employment.dto';

@ApiTags('employments')
@Controller('employments')
export class EmploymentController {
  constructor(private readonly employmentService: EmploymentService) {}

  // ==================== 인증 필요 엔드포인트 ====================

  @Get('client/:clientId')
  @UseGuards(JwtAuthGuard, ClientOwnerOrManagerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래처 직원 목록' })
  async getEmployeesByClient(@Param('clientId') clientId: string) {
    return this.employmentService.getEmployeesByClient(clientId);
  }

  @Get('invitations/:clientId')
  @UseGuards(JwtAuthGuard, ClientOwnerOrManagerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래처 초대 목록' })
  async getInvitationsByClient(@Param('clientId') clientId: string) {
    return this.employmentService.getInvitationsByClient(clientId);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard, ClientOwnerOrManagerGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 초대 생성' })
  async createInvitation(
    @Body() dto: CreateInvitationDto,
    @Request() req: any,
  ) {
    const sentById = req.user?.sub || req.user?.id;
    return this.employmentService.createInvitation(
      dto.clientId,
      dto,
      sentById,
    );
  }

  @Delete('invitations/:invId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '초대 취소' })
  async cancelInvitation(@Param('invId') invId: string) {
    return this.employmentService.cancelInvitation(invId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 권한/역할 수정' })
  async updateEmployment(
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentDto,
  ) {
    return this.employmentService.updateEmployment(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '직원 제거' })
  async removeEmployment(@Param('id') id: string) {
    return this.employmentService.removeEmployment(id);
  }

  // ==================== Public 엔드포인트 ====================

  @Public()
  @Get('invite/:token')
  @ApiOperation({ summary: '초대 토큰 검증 (Public)' })
  async validateInvitation(@Param('token') token: string) {
    return this.employmentService.getInvitationByToken(token);
  }

  @Public()
  @Post('invite/accept')
  @ApiOperation({ summary: '초대 수락 - 신규 계정' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.employmentService.acceptInvitation(dto);
  }

  @Public()
  @Post('invite/accept-existing')
  @ApiOperation({ summary: '초대 수락 - 기존 계정' })
  async acceptInvitationExisting(@Body() dto: AcceptInvitationExistingDto) {
    return this.employmentService.acceptInvitationExisting(dto);
  }
}
