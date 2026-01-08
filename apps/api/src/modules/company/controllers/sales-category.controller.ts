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
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { SalesCategoryService } from '../services/sales-category.service';
import {
  CreateSalesCategoryDto,
  UpdateSalesCategoryDto,
  SalesCategoryQueryDto,
} from '../dto/sales-category.dto';

@ApiTags('sales-categories')
@Controller('sales-categories')
export class SalesCategoryController {
  constructor(private salesCategoryService: SalesCategoryService) {}

  @Get()
  @ApiOperation({ summary: '매출품목분류 목록 조회' })
  @ApiQuery({ name: 'parentId', required: false, description: '상위 분류 ID' })
  @ApiQuery({ name: 'isActive', required: false, description: '활성화 여부' })
  @ApiQuery({ name: 'search', required: false, description: '검색어' })
  @ApiQuery({ name: 'depth', required: false, description: '계층 깊이 (1: 대분류, 2: 소분류)' })
  async findAll(@Query() query: SalesCategoryQueryDto) {
    return this.salesCategoryService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: '매출품목분류 트리 조회 (계층형)' })
  async findTree() {
    return this.salesCategoryService.findTree();
  }

  @Get(':id')
  @ApiOperation({ summary: '매출품목분류 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.salesCategoryService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '매출품목분류 생성' })
  async create(@Body() data: CreateSalesCategoryDto) {
    return this.salesCategoryService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '매출품목분류 수정' })
  async update(@Param('id') id: string, @Body() data: UpdateSalesCategoryDto) {
    return this.salesCategoryService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '매출품목분류 삭제' })
  async delete(@Param('id') id: string) {
    return this.salesCategoryService.delete(id);
  }

  @Post(':id/move-up')
  @ApiOperation({ summary: '매출품목분류 위로 이동' })
  async moveUp(@Param('id') id: string) {
    return this.salesCategoryService.moveUp(id);
  }

  @Post(':id/move-down')
  @ApiOperation({ summary: '매출품목분류 아래로 이동' })
  async moveDown(@Param('id') id: string) {
    return this.salesCategoryService.moveDown(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: '매출품목분류 순서 일괄 변경' })
  @ApiBody({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sortOrder: { type: 'number' },
        },
      },
    },
  })
  async reorder(@Body() items: { id: string; sortOrder: number }[]) {
    return this.salesCategoryService.reorder(items);
  }
}
