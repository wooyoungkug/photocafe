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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClientGroupService } from '../services/client-group.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('client-groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('client-groups')
export class ClientGroupController {
  constructor(private clientGroupService: ClientGroupService) {}

  @Get()
  @ApiOperation({ summary: '거래처 그룹 목록 조회' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('branchId') branchId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    const skip = page ? (page - 1) * (limit || 20) : 0;
    const take = limit || 20;

    return this.clientGroupService.findAll({ skip, take, search, branchId, isActive });
  }

  @Get(':id')
  @ApiOperation({ summary: '거래처 그룹 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.clientGroupService.findOne(id);
  }

  @Get(':id/clients')
  @ApiOperation({ summary: '그룹 소속 거래처 조회' })
  async getClients(@Param('id') id: string) {
    return this.clientGroupService.getClients(id);
  }

  @Post()
  @ApiOperation({ summary: '거래처 그룹 생성' })
  async create(@Body() data: any) {
    return this.clientGroupService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '거래처 그룹 수정' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.clientGroupService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '거래처 그룹 삭제' })
  async delete(@Param('id') id: string) {
    return this.clientGroupService.delete(id);
  }
}
