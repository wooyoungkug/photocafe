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
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConsultationCategoryService } from '../services/consultation-category.service';
import {
  CreateConsultationCategoryDto,
  UpdateConsultationCategoryDto,
} from '../dto';

@ApiTags('Consultation Categories')
@Controller('consultation-categories')
export class ConsultationCategoryController {
  constructor(
    private readonly categoryService: ConsultationCategoryService,
  ) {}

  @Get()
  @ApiOperation({ summary: '상담 분류 목록 조회' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: '상담 분류 목록' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.categoryService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: '상담 분류 상세 조회' })
  @ApiResponse({ status: 200, description: '상담 분류 상세 정보' })
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '상담 분류 등록' })
  @ApiResponse({ status: 201, description: '상담 분류 등록 완료' })
  async create(@Body() data: CreateConsultationCategoryDto) {
    return this.categoryService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '상담 분류 수정' })
  @ApiResponse({ status: 200, description: '상담 분류 수정 완료' })
  async update(
    @Param('id') id: string,
    @Body() data: UpdateConsultationCategoryDto,
  ) {
    return this.categoryService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '상담 분류 삭제' })
  @ApiResponse({ status: 200, description: '상담 분류 삭제 완료' })
  async delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Post('initialize')
  @ApiOperation({ summary: '기본 상담 분류 초기화' })
  @ApiResponse({ status: 201, description: '기본 상담 분류 초기화 완료' })
  async initialize() {
    return this.categoryService.initializeDefaultCategories();
  }
}
