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
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { CategoryService } from '../services/category.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  MoveCategoryDto,
  VisibilityDto,
  CATEGORY_TYPES,
  LOGIN_VISIBILITY_OPTIONS,
} from '../dto/category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  // 공개 API (인증 불필요)
  @Get()
  @ApiOperation({ summary: '카테고리 목록 조회' })
  @ApiQuery({ name: 'level', required: false, enum: ['large', 'medium', 'small'] })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'isVisible', required: false })
  @ApiQuery({ name: 'isTopMenu', required: false })
  @ApiQuery({ name: 'categoryType', required: false, enum: CATEGORY_TYPES })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@Query() query: CategoryQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: '카테고리 트리 조회 (계층형)' })
  async findTree() {
    return this.categoryService.findTree();
  }

  @Get('top-menu')
  @ApiOperation({ summary: '상단메뉴용 카테고리 조회' })
  async findTopMenu() {
    return this.categoryService.findTopMenuCategories();
  }

  @Get('visible')
  @ApiOperation({ summary: '로그인 상태에 따른 노출 카테고리 조회' })
  @ApiQuery({ name: 'isLoggedIn', required: false, type: Boolean })
  async findVisible(@Query('isLoggedIn') isLoggedIn: boolean = false) {
    return this.categoryService.findVisibleCategories(isLoggedIn);
  }

  @Get(':id')
  @ApiOperation({ summary: '카테고리 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '카테고리 생성' })
  async create(@Body() data: CreateCategoryDto) {
    return this.categoryService.create(data);
  }

  @Put(':id')
  @ApiOperation({ summary: '카테고리 수정' })
  async update(@Param('id') id: string, @Body() data: UpdateCategoryDto) {
    return this.categoryService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '카테고리 삭제' })
  async delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: '카테고리 노출 설정 변경' })
  async updateVisibility(@Param('id') id: string, @Body() data: VisibilityDto) {
    return this.categoryService.updateVisibility(id, data);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: '카테고리 이동 (부모 변경/순서 변경)' })
  async move(@Param('id') id: string, @Body() data: MoveCategoryDto) {
    return this.categoryService.move(id, data);
  }

  @Post(':id/move-up')
  @ApiOperation({ summary: '카테고리 위로 이동' })
  async moveUp(@Param('id') id: string) {
    return this.categoryService.moveUp(id);
  }

  @Post(':id/move-down')
  @ApiOperation({ summary: '카테고리 아래로 이동' })
  async moveDown(@Param('id') id: string) {
    return this.categoryService.moveDown(id);
  }

  @Post(':id/move-to-top')
  @ApiOperation({ summary: '카테고리 최상위로 이동' })
  async moveToTop(@Param('id') id: string) {
    return this.categoryService.moveToTop(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: '카테고리 순서 일괄 변경' })
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
    return this.categoryService.reorder(items);
  }
}
