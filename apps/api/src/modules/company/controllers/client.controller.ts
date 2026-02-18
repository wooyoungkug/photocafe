import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientService } from '../services/client.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientController {
  constructor(private clientService: ClientService) {}

  @Get()
  @ApiOperation({ summary: '거래처 목록 조회' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'status', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('groupId') groupId?: string,
    @Query('status') status?: string,
  ) {
    const skip = page ? (page - 1) * (limit || 20) : 0;
    const take = limit || 20;

    return this.clientService.findAll({ skip, take, search, groupId, status });
  }

  @Get('next-code')
  @ApiOperation({ summary: '다음 회원코드 조회' })
  async getNextCode() {
    const code = await this.clientService.getNextClientCode();
    return { code };
  }

  @Get(':id')
  @ApiOperation({ summary: '거래처 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.clientService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '거래처 생성' })
  async create(@Body() data: any) {
    return this.clientService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '거래처 수정' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.clientService.update(id, data);
  }

  @Patch(':id/group')
  @ApiOperation({ summary: '거래처 그룹 변경' })
  async updateGroup(
    @Param('id') id: string,
    @Body('groupId') groupId: string | null,
  ) {
    return this.clientService.updateGroup(id, groupId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '거래처 삭제' })
  async delete(@Param('id') id: string) {
    return this.clientService.delete(id);
  }

  @Patch(':id/staff')
  @ApiOperation({ summary: '거래처 영업담당자 할당' })
  async assignStaff(
    @Param('id') id: string,
    @Body() data: { staffIds: string[]; primaryStaffId?: string },
  ) {
    return this.clientService.assignStaff(id, data.staffIds, data.primaryStaffId);
  }

  @Delete(':id/staff/:staffId')
  @ApiOperation({ summary: '거래처 영업담당자 제거' })
  async removeStaff(
    @Param('id') id: string,
    @Param('staffId') staffId: string,
  ) {
    return this.clientService.removeStaff(id, staffId);
  }
}
