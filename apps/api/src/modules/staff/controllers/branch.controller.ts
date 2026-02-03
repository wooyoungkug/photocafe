import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BranchService } from '../services/branch.service';

@ApiTags('Branches')
@Controller('branches')
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  @ApiOperation({ summary: '지점 목록 조회' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.branchService.findAll(active);
  }

  @Get(':id')
  @ApiOperation({ summary: '지점 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.branchService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '지점 생성' })
  async create(
    @Body() data: { branchCode: string; branchName: string; isHeadquarters?: boolean; address?: string; phone?: string },
  ) {
    return this.branchService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '지점 수정' })
  async update(
    @Param('id') id: string,
    @Body() data: { branchCode?: string; branchName?: string; isHeadquarters?: boolean; address?: string; phone?: string; isActive?: boolean },
  ) {
    return this.branchService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '지점 삭제' })
  async delete(@Param('id') id: string) {
    return this.branchService.delete(id);
  }
}
