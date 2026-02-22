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
import { Public } from '@/common/decorators/public.decorator';
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
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  PRODUCT_PROCESS_TEMPLATES,
} from '../constants/process-templates';
import { PRODUCT_TYPE_OPTIONS } from '../constants/product-type-options';

@ApiTags('상품')
@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) { }

  // ==================== 공정 템플릿 / 상품유형 API ====================

  @Public()
  @Get('product-types')
  @ApiOperation({ summary: '상품 유형 목록 조회' })
  async getProductTypes() {
    return Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
      value,
      label,
      stepCount: PRODUCT_PROCESS_TEMPLATES[value]?.length || 0,
    }));
  }

  @Public()
  @Get('process-templates')
  @ApiOperation({ summary: '전체 공정 템플릿 조회' })
  async getAllProcessTemplates() {
    return PRODUCT_PROCESS_TEMPLATES;
  }

  @Public()
  @Get('process-templates/:productType')
  @ApiOperation({ summary: '상품유형별 공정 템플릿 조회' })
  async getProcessTemplate(@Param('productType') productType: string) {
    return PRODUCT_PROCESS_TEMPLATES[productType] || [];
  }

  @Public()
  @Get('type-options/:productType')
  @ApiOperation({ summary: '상품유형별 옵션 매트릭스 조회' })
  async getTypeOptions(@Param('productType') productType: string) {
    return PRODUCT_TYPE_OPTIONS[productType] || null;
  }

  // 공개 API (인증 불필요)
  @Public()
  @Get()
  @ApiOperation({ summary: '상품 목록 조회' })
  async findAll(@Query() query: ProductQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    return this.productService.findAll({ skip, take: limit, ...filters });
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: '상품 상세 조회' })
  async findOne(@Param('id') id: string) {
    // 조회수 증가 (별도 처리, 에러 무시)
    this.productService.incrementViewCount(id).catch(() => { });
    return this.productService.findOne(id);
  }

  // 관리자 전용 API (인증 필요)
  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '상품 생성' })
  async create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '상품 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '상품 삭제' })
  async delete(@Param('id') id: string) {
    return this.productService.delete(id);
  }

  // ==================== 옵션 개별 관리 ====================

  @Post(':id/specifications')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '규격 옵션 추가' })
  async addSpecification(
    @Param('id') id: string,
    @Body() dto: ProductSpecificationDto,
  ) {
    return this.productService.addSpecification(id, dto);
  }

  @Put('specifications/:specId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '규격 옵션 수정' })
  async updateSpecification(
    @Param('specId') specId: string,
    @Body() dto: ProductSpecificationDto,
  ) {
    return this.productService.updateSpecification(specId, dto);
  }

  @Delete('specifications/:specId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '규격 옵션 삭제' })
  async deleteSpecification(@Param('specId') specId: string) {
    return this.productService.deleteSpecification(specId);
  }

  @Post(':id/bindings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '제본 옵션 추가' })
  async addBinding(
    @Param('id') id: string,
    @Body() dto: ProductBindingDto,
  ) {
    return this.productService.addBinding(id, dto);
  }

  @Post(':id/papers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '용지 옵션 추가' })
  async addPaper(
    @Param('id') id: string,
    @Body() dto: ProductPaperDto,
  ) {
    return this.productService.addPaper(id, dto);
  }

  @Post(':id/covers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '커버 옵션 추가' })
  async addCover(
    @Param('id') id: string,
    @Body() dto: ProductCoverDto,
  ) {
    return this.productService.addCover(id, dto);
  }

  @Post(':id/foils')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '박 옵션 추가' })
  async addFoil(
    @Param('id') id: string,
    @Body() dto: ProductFoilDto,
  ) {
    return this.productService.addFoil(id, dto);
  }

  @Post(':id/finishings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '후가공 옵션 추가' })
  async addFinishing(
    @Param('id') id: string,
    @Body() dto: ProductFinishingDto,
  ) {
    return this.productService.addFinishing(id, dto);
  }

  // ==================== 반제품 연결 ====================

  @Post(':id/half-products/:halfProductId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '반제품 연결' })
  async linkHalfProduct(
    @Param('id') id: string,
    @Param('halfProductId') halfProductId: string,
    @Body('isRequired') isRequired?: boolean,
  ) {
    return this.productService.linkHalfProduct(id, halfProductId, isRequired);
  }

  @Delete(':id/half-products/:halfProductId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '반제품 연결 해제' })
  async unlinkHalfProduct(
    @Param('id') id: string,
    @Param('halfProductId') halfProductId: string,
  ) {
    return this.productService.unlinkHalfProduct(id, halfProductId);
  }

  // ==================== 용지 마스터 동기화 ====================

  @Post('sync-all-papers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '전체 상품 용지 마스터 일괄 동기화' })
  async syncAllPapers() {
    return this.productService.syncAllProductPapers();
  }

  @Post(':id/sync-papers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '개별 상품 용지 마스터 동기화' })
  async syncPapers(
    @Param('id') id: string,
    @Body() body?: { printMethods?: string[] },
  ) {
    return this.productService.syncProductPapers(id, body?.printMethods);
  }

  // ==================== 규격 정리 ====================

  @Post('cleanup-specs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '전체 상품 규격 일괄 정리 (출력방식에 맞는 규격만 유지)' })
  async cleanupAllSpecs() {
    return this.productService.cleanupProductSpecifications();
  }

  @Post(':id/cleanup-specs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '개별 상품 규격 정리' })
  async cleanupProductSpecs(@Param('id') id: string) {
    return this.productService.cleanupProductSpecifications(id);
  }
}
