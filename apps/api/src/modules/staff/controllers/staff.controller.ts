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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StaffService } from '../services/staff.service';
import {
  CreateStaffDto,
  UpdateStaffDto,
  StaffQueryDto,
  AssignClientsDto,
  StaffChangePasswordDto,
} from '../dto/staff.dto';

@ApiTags('직원관리')
@Controller('staff')
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

  @Post()
  @ApiOperation({ summary: '직원 등록' })
  @ApiResponse({ status: 201, description: '직원 등록 성공' })
  create(@Body() data: CreateStaffDto) {
    return this.staffService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '직원 수정' })
  @ApiResponse({ status: 200, description: '직원 수정 성공' })
  update(@Param('id') id: string, @Body() data: UpdateStaffDto) {
    return this.staffService.update(id, data);
  }

  @Patch(':id/password')
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  changePassword(@Param('id') id: string, @Body() data: StaffChangePasswordDto) {
    return this.staffService.changePassword(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '직원 삭제' })
  @ApiResponse({ status: 200, description: '직원 삭제 성공' })
  delete(@Param('id') id: string) {
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
  updateAllowedIps(@Param('id') id: string, @Body() data: { ips: string[] }) {
    return this.staffService.updateAllowedIps(id, data.ips);
  }

  // ==================== 권한 관리 ====================

  @Patch(':id/menu-permissions')
  @ApiOperation({ summary: '메뉴 권한 업데이트' })
  @ApiResponse({ status: 200, description: '메뉴 권한 업데이트 성공' })
  updateMenuPermissions(
    @Param('id') id: string,
    @Body() data: { permissions: Record<string, any> },
  ) {
    return this.staffService.updateMenuPermissions(id, data.permissions);
  }

  @Patch(':id/category-permissions')
  @ApiOperation({ summary: '카테고리 권한 업데이트' })
  @ApiResponse({ status: 200, description: '카테고리 권한 업데이트 성공' })
  updateCategoryPermissions(
    @Param('id') id: string,
    @Body() data: { permissions: Record<string, boolean> },
  ) {
    return this.staffService.updateCategoryPermissions(id, data.permissions);
  }

  @Patch(':id/process-permissions')
  @ApiOperation({ summary: '공정 권한 업데이트' })
  @ApiResponse({ status: 200, description: '공정 권한 업데이트 성공' })
  updateProcessPermissions(
    @Param('id') id: string,
    @Body() data: { permissions: Record<string, any> },
  ) {
    return this.staffService.updateProcessPermissions(id, data.permissions);
  }
}
