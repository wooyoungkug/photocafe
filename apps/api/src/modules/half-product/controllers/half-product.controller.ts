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
import { HalfProductService } from '../services/half-product.service';
import {
  CreateHalfProductDto,
  UpdateHalfProductDto,
  HalfProductQueryDto,
} from '../dto';

@ApiTags('반제품')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('half-products')
export class HalfProductController {
  constructor(private halfProductService: HalfProductService) {}

  @Get()
  @ApiOperation({ summary: '반제품 목록 조회' })
  async findAll(@Query() query: HalfProductQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    return this.halfProductService.findAll({ skip, take: limit, ...filters });
  }

  @Get(':id')
  @ApiOperation({ summary: '반제품 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.halfProductService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '반제품 생성' })
  async create(@Body() dto: CreateHalfProductDto) {
    return this.halfProductService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '반제품 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateHalfProductDto) {
    return this.halfProductService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '반제품 삭제' })
  async delete(@Param('id') id: string) {
    return this.halfProductService.delete(id);
  }

  @Post(':id/calculate-price')
  @ApiOperation({ summary: '반제품 가격 계산' })
  async calculatePrice(
    @Param('id') id: string,
    @Body()
    body: {
      quantity: number;
      specificationId?: string;
      optionSelections?: { optionId: string; value: string }[];
    },
  ) {
    return this.halfProductService.calculatePrice(
      id,
      body.quantity,
      body.specificationId,
      body.optionSelections,
    );
  }
}
