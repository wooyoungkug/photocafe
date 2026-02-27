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
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { StaffService } from '../services/staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffQueryDto,
  AssignClientsDto,
  StaffChangePasswordDto,
  ChangeStaffStatusDto,
  BulkImportStaffDto,
} from '../dto/staff.dto';

@ApiTags('직원관리')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(StaffOnlyGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOperation({ summary: '직원 목록 조회' })
  @ApiResponse({ status: 200, description: '직원 목록' })
  findAll(@Query() query: StaffQueryDto) {
    return this.staffService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '직원 상세 조회' })
  @ApiResponse({ status: 200, description: '직원 상세 정보' })
  findOne(@Param('id') id: string) {
    return this.staffService.findOne(id);
  }

  @Post('bulk-import')
  @ApiOperation({ summary: '직원 일괄 등록 (CSV/Excel 데이터)' })
  @ApiResponse({ status: 201, description: '일괄 등록 결과' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async bulkImport(@Body() data: BulkImportStaffDto, @Request() req: any) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('직원 일괄 등록 권한이 없습니다.');
    }
    return this.staffService.bulkImport(data.rows, { id: req.user.id, name: req.user.name });
  }

  @Post()
  @ApiOperation({ summary: '직원 등록' })
  @ApiResponse({ status: 201, description: '직원 등록 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async create(@Body() data: CreateStaffDto, @Request() req: any) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('직원 등록 권한이 없습니다. 최고관리자 또는 회원수정 권한이 필요합니다.');
    }
    return this.staffService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '직원 수정' })
  @ApiResponse({ status: 200, description: '직원 수정 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async update(@Param('id') id: string, @Body() data: UpdateStaffDto, @Request() req: any) {
    // 본인 정보 수정은 허용, 타인 수정은 관리자 권한 필요
    if (req.user.id !== id) {
      const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
      if (!hasPermission) {
        throw new ForbiddenException('다른 직원의 정보를 수정할 권한이 없습니다.');
      }
    }
    return this.staffService.update(id, data);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async changePassword(@Param('id') id: string, @Body() data: StaffChangePasswordDto, @Request() req: any) {
    // 본인 비밀번호 변경은 허용, 타인은 관리자 권한 필요
    if (req.user.id !== id) {
      const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
      if (!hasPermission) {
        throw new ForbiddenException('다른 직원의 비밀번호를 변경할 권한이 없습니다.');
      }
    }
    return this.staffService.changePassword(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '직원 삭제' })
  @ApiResponse({ status: 200, description: '직원 삭제 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('직원 삭제 권한이 없습니다. 최고관리자 또는 회원수정 권한이 필요합니다.');
    }
    return this.staffService.delete(id);
  }

  // ==================== 담당 회원 관리 ====================

  @Put(':id/clients')
  @ApiOperation({ summary: '담당 회원 일괄 할당' })
  @ApiResponse({ status: 200, description: '담당 회원 할당 성공' })
  assignClients(@Param('id') id: string, @Body() data: AssignClientsDto) {
    return this.staffService.assignClients(id, data);
  }

  @Post(':id/clients/:clientId')
  @ApiOperation({ summary: '담당 회원 추가' })
  @ApiResponse({ status: 200, description: '담당 회원 추가 성공' })
  addClient(
    @Param('id') id: string,
    @Param('clientId') clientId: string,
    @Query('isPrimary') isPrimary?: boolean,
  ) {
    return this.staffService.addClient(id, clientId, isPrimary);
  }

  @Delete(':id/clients/:clientId')
  @ApiOperation({ summary: '담당 회원 제거' })
  @ApiResponse({ status: 200, description: '담당 회원 제거 성공' })
  removeClient(@Param('id') id: string, @Param('clientId') clientId: string) {
    return this.staffService.removeClient(id, clientId);
  }

  // ==================== IP 접근 관리 ====================

  @Patch(':id/allowed-ips')
  @ApiOperation({ summary: '허용 IP 목록 업데이트' })
  @ApiResponse({ status: 200, description: '허용 IP 업데이트 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async updateAllowedIps(@Param('id') id: string, @Body() data: { ips: string[] }, @Request() req: any) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('IP 접근 관리 권한이 없습니다.');
    }
    return this.staffService.updateAllowedIps(id, data.ips);
  }

  // ==================== 권한 관리 ====================

  @Patch(':id/menu-permissions')
  @ApiOperation({ summary: '메뉴 권한 업데이트' })
  @ApiResponse({ status: 200, description: '메뉴 권한 업데이트 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async updateMenuPermissions(
    @Param('id') id: string,
    @Body() data: { permissions: Record<string, any> },
    @Request() req: any,
  ) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('권한 설정을 변경할 수 없습니다.');
    }
    return this.staffService.updateMenuPermissions(id, data.permissions);
  }

  @Patch(':id/category-permissions')
  @ApiOperation({ summary: '카테고리 권한 업데이트' })
  @ApiResponse({ status: 200, description: '카테고리 권한 업데이트 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async updateCategoryPermissions(
    @Param('id') id: string,
    @Body() data: { permissions: Record<string, boolean> },
    @Request() req: any,
  ) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('권한 설정을 변경할 수 없습니다.');
    }
    return this.staffService.updateCategoryPermissions(id, data.permissions);
  }

  @Patch(':id/process-permissions')
  @ApiOperation({ summary: '공정 권한 업데이트' })
  @ApiResponse({ status: 200, description: '공정 권한 업데이트 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async updateProcessPermissions(
    @Param('id') id: string,
    @Body() data: { permissions: Record<string, any> },
    @Request() req: any,
  ) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('권한 설정을 변경할 수 없습니다.');
    }
    return this.staffService.updateProcessPermissions(id, data.permissions);
  }

  // ==================== 상태 변경 ====================

  @Patch(':id/status')
  @ApiOperation({ summary: '직원 상태 변경 (active/suspended/inactive)' })
  @ApiResponse({ status: 200, description: '상태 변경 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async updateStatus(@Param('id') id: string, @Body() data: ChangeStaffStatusDto, @Request() req: any) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('직원 상태 변경 권한이 없습니다.');
    }
    return this.staffService.updateStatus(id, data, { id: req.user.id, name: req.user.name });
  }

  // ==================== 임시 비밀번호 발급 ====================

  @Post(':id/temp-password')
  @ApiOperation({ summary: '임시 비밀번호 발급 + 이메일 발송' })
  @ApiResponse({ status: 200, description: '임시 비밀번호 발급 성공' })
  @ApiResponse({ status: 403, description: '권한 없음' })
  async issueTemporaryPassword(@Param('id') id: string, @Request() req: any) {
    const hasPermission = await this.staffService.checkAdminPermission(req.user.id);
    if (!hasPermission) {
      throw new ForbiddenException('임시 비밀번호 발급 권한이 없습니다.');
    }
    return this.staffService.issueTemporaryPassword(id, { id: req.user.id, name: req.user.name });
  }

}
