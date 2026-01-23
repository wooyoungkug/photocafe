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
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { FabricService } from '../services/fabric.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
  CreateFabricDto,
  UpdateFabricDto,
  CreateFabricSupplierDto,
  UpdateFabricSupplierDto,
  FABRIC_CATEGORY_LABELS,
  FABRIC_MATERIAL_LABELS,
  FABRIC_UNIT_LABELS,
} from '../dto/fabric.dto';

@ApiTags('원단 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fabrics')
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  // 라벨 조회 (프론트엔드용)
  @Get('labels')
  @ApiOperation({ summary: '원단 분류, 재질, 단위 라벨 조회' })
  getLabels() {
    return {
      categories: FABRIC_CATEGORY_LABELS,
      materials: FABRIC_MATERIAL_LABELS,
      units: FABRIC_UNIT_LABELS,
    };
  }

  // ==================== 원단 공급업체 ====================

  @Get('suppliers')
  @ApiOperation({ summary: '원단 공급업체 목록 조회' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAllSuppliers(@Query('includeInactive') includeInactive?: string) {
    return this.fabricService.findAllSuppliers(includeInactive === 'true');
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: '원단 공급업체 상세 조회' })
  findSupplier(@Param('id') id: string) {
    return this.fabricService.findSupplier(id);
  }

  @Post('suppliers')
  @ApiOperation({ summary: '원단 공급업체 등록' })
  createSupplier(@Body() dto: CreateFabricSupplierDto) {
    return this.fabricService.createSupplier(dto);
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: '원단 공급업체 수정' })
  updateSupplier(@Param('id') id: string, @Body() dto: UpdateFabricSupplierDto) {
    return this.fabricService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: '원단 공급업체 삭제' })
  deleteSupplier(@Param('id') id: string) {
    return this.fabricService.deleteSupplier(id);
  }

  // ==================== 원단 ====================

  @Get()
  @ApiOperation({ summary: '원단 목록 조회' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'material', required: false })
  @ApiQuery({ name: 'supplierId', required: false })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('material') material?: string,
    @Query('supplierId') supplierId?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fabricService.findAll({
      search,
      category,
      material,
      supplierId,
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('low-stock')
  @ApiOperation({ summary: '재고 부족 원단 조회' })
  findLowStock() {
    return this.fabricService.findLowStock();
  }

  @Get(':id')
  @ApiOperation({ summary: '원단 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.fabricService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '원단 등록' })
  create(@Body() dto: CreateFabricDto) {
    return this.fabricService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '원단 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateFabricDto) {
    return this.fabricService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '원단 삭제' })
  delete(@Param('id') id: string) {
    return this.fabricService.delete(id);
  }

  @Post(':id/stock')
  @ApiOperation({ summary: '원단 재고 업데이트' })
  updateStock(
    @Param('id') id: string,
    @Body() dto: { quantity: number; operation: 'add' | 'subtract' | 'set' },
  ) {
    return this.fabricService.updateStock(id, dto.quantity, dto.operation);
  }

  @Post(':id/reorder')
  @ApiOperation({ summary: '원단 순서 변경' })
  reorder(
    @Param('id') id: string,
    @Body() dto: { direction: 'up' | 'down' },
  ) {
    return this.fabricService.reorder(id, dto.direction);
  }
}
