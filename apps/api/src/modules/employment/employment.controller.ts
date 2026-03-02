import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
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
  CreateClientDepartmentDto,
  UpdateClientDepartmentDto,
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

  @Get('history/member/:memberClientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '개인회원 스튜디오 소속 이력 조회 (관리자용)' })
  async getEmploymentHistoryByMember(
    @Param('memberClientId') memberClientId: string,
  ) {
    return this.employmentService.getEmploymentHistoryByMember(memberClientId);
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

  @Get('departments/:clientId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래처 부서 목록' })
  async getDepartmentsByClient(@Param('clientId') clientId: string) {
    return this.employmentService.getDepartmentsByClient(clientId);
  }

  @Post('departments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래처 부서 추가 (Manager/소유자 전용)' })
  async createClientDepartment(
    @Body() dto: CreateClientDepartmentDto,
    @Request() req: any,
  ) {
    this.ensureManagerOrOwner(req.user, dto.clientId);
    return this.employmentService.createClientDepartment(dto);
  }

  @Put('departments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래처 부서 수정 (Manager/소유자 전용)' })
  async updateClientDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateClientDepartmentDto,
    @Request() req: any,
  ) {
    // dept에서 clientId를 조회하여 권한 검증
    const dept = await this.employmentService.getDepartmentById(id);
    this.ensureManagerOrOwner(req.user, dept.clientId);
    return this.employmentService.updateClientDepartment(id, dto);
  }

  @Delete('departments/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '거래처 부서 삭제 (Manager/소유자 전용)' })
  async deleteClientDepartment(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const dept = await this.employmentService.getDepartmentById(id);
    this.ensureManagerOrOwner(req.user, dept.clientId);
    return this.employmentService.deleteClientDepartment(id);
  }

  /** Manager 또는 거래처 소유자 권한 검증 */
  private ensureManagerOrOwner(user: any, clientId: string) {
    // 거래처 소유자
    if (user.type === 'client' && user.sub === clientId) return;
    // MANAGER 직원
    if (user.type === 'employee' && user.role === 'MANAGER' && user.clientId === clientId) return;
    throw new ForbiddenException('부서 관리는 Manager 또는 소유자만 가능합니다.');
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
  @Get('check-login-id/:loginId')
  @ApiOperation({ summary: '아이디 중복 확인 (Public)' })
  async checkLoginId(@Param('loginId') loginId: string) {
    return this.employmentService.checkLoginIdAvailable(loginId);
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
