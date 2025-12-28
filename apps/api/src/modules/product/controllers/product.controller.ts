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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ProductService } from '../services/product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ProductQueryDto,
  ProductSpecificationDto,
  ProductBindingDto,
  ProductPaperDto,
  ProductCoverDto,
  ProductFoilDto,
  ProductFinishingDto,
} from '../dto';

@ApiTags('상품')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: '상품 목록 조회' })
  async findAll(@Query() query: ProductQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    return this.productService.findAll({ skip, take: limit, ...filters });
  }

  @Get(':id')
  @ApiOperation({ summary: '상품 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '상품 생성' })
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '상품 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '상품 삭제' })
  async delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }

  // ==================== 옵션 개별 관리 ====================

  @Post(':id/specifications')
  @ApiOperation({ summary: '규격 옵션 추가' })
  async addSpecification(
    @Param('id') id: string,
    @Body() dto: ProductSpecificationDto,
  ) {
    return this.productService.addSpecification(id, dto);
  }

  @Put('specifications/:specId')
  @ApiOperation({ summary: '규격 옵션 수정' })
  async updateSpecification(
    @Param('specId') specId: string,
    @Body() dto: ProductSpecificationDto,
  ) {
    return this.productService.updateSpecification(specId, dto);
  }

  @Delete('specifications/:specId')
  @ApiOperation({ summary: '규격 옵션 삭제' })
  async deleteSpecification(@Param('specId') specId: string) {
    return this.productService.deleteSpecification(specId);
  }

  @Post(':id/bindings')
  @ApiOperation({ summary: '제본 옵션 추가' })
  async addBinding(
    @Param('id') id: string,
    @Body() dto: ProductBindingDto,
  ) {
    return this.productService.addBinding(id, dto);
  }

  @Post(':id/papers')
  @ApiOperation({ summary: '용지 옵션 추가' })
  async addPaper(
    @Param('id') id: string,
    @Body() dto: ProductPaperDto,
  ) {
    return this.productService.addPaper(id, dto);
  }

  @Post(':id/covers')
  @ApiOperation({ summary: '커버 옵션 추가' })
  async addCover(
    @Param('id') id: string,
    @Body() dto: ProductCoverDto,
  ) {
    return this.productService.addCover(id, dto);
  }

  @Post(':id/foils')
  @ApiOperation({ summary: '박 옵션 추가' })
  async addFoil(
    @Param('id') id: string,
    @Body() dto: ProductFoilDto,
  ) {
    return this.productService.addFoil(id, dto);
  }

  @Post(':id/finishings')
  @ApiOperation({ summary: '후가공 옵션 추가' })
  async addFinishing(
    @Param('id') id: string,
    @Body() dto: ProductFinishingDto,
  ) {
    return this.productService.addFinishing(id, dto);
  }

  // ==================== 반제품 연결 ====================

  @Post(':id/half-products/:halfProductId')
  @ApiOperation({ summary: '반제품 연결' })
  async linkHalfProduct(
    @Param('id') id: string,
    @Param('halfProductId') halfProductId: string,
    @Body('isRequired') isRequired?: boolean,
  ) {
    return this.productService.linkHalfProduct(id, halfProductId, isRequired);
  }

  @Delete(':id/half-products/:halfProductId')
  @ApiOperation({ summary: '반제품 연결 해제' })
  async unlinkHalfProduct(
    @Param('id') id: string,
    @Param('halfProductId') halfProductId: string,
  ) {
    return this.productService.unlinkHalfProduct(id, halfProductId);
  }
}
