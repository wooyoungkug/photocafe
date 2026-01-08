import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/staff.dto';

@ApiTags('부서관리')
@Controller('departments')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: '부서 목록 조회' })
  @ApiResponse({ status: 200, description: '부서 목록' })
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '부서 상세 조회' })
  @ApiResponse({ status: 200, description: '부서 상세 정보' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '부서 등록' })
  @ApiResponse({ status: 201, description: '부서 등록 성공' })
  create(@Body() data: CreateDepartmentDto) {
    return this.departmentService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '부서 수정' })
  @ApiResponse({ status: 200, description: '부서 수정 성공' })
  update(@Param('id') id: string, @Body() data: UpdateDepartmentDto) {
    return this.departmentService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '부서 삭제' })
  @ApiResponse({ status: 200, description: '부서 삭제 성공' })
  delete(@Param('id') id: string) {
    return this.departmentService.delete(id);
  }
}
