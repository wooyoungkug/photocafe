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
import { PublicCopperPlateService } from '../services/public-copper-plate.service';
import {
  CreatePublicCopperPlateDto,
  UpdatePublicCopperPlateDto,
  PublicCopperPlateQueryDto,
} from '../dto';

@ApiTags('공용동판')
@Controller('public-copper-plates')
export class PublicCopperPlateController {
  constructor(private publicCopperPlateService: PublicCopperPlateService) {}

  @Get()
  @ApiOperation({ summary: '공용동판 목록 조회' })
  async findAll(@Query() query: PublicCopperPlateQueryDto) {
    const { page = 1, limit = 20, ...filters } = query;
    const skip = (page - 1) * limit;

    return this.publicCopperPlateService.findAll({ skip, take: limit, ...filters });
  }

  @Get(':id')
  @ApiOperation({ summary: '공용동판 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.publicCopperPlateService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '공용동판 생성' })
  async create(@Body() dto: CreatePublicCopperPlateDto) {
    return this.publicCopperPlateService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '공용동판 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdatePublicCopperPlateDto) {
    return this.publicCopperPlateService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '공용동판 삭제' })
  async delete(@Param('id') id: string) {
    return this.publicCopperPlateService.delete(id);
  }

  // 상품-공용동판 연결 API
  @Post('product/:productId/link/:plateId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '상품에 공용동판 연결' })
  async linkToProduct(
    @Param('productId') productId: string,
    @Param('plateId') plateId: string,
    @Body() data: { engravingText?: string },
  ) {
    return this.publicCopperPlateService.linkToProduct(productId, plateId, data);
  }

  @Delete('product/:productId/unlink/:plateId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '상품에서 공용동판 연결 해제' })
  async unlinkFromProduct(
    @Param('productId') productId: string,
    @Param('plateId') plateId: string,
  ) {
    return this.publicCopperPlateService.unlinkFromProduct(productId, plateId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: '상품의 공용동판 목록 조회' })
  async getProductPlates(@Param('productId') productId: string) {
    return this.publicCopperPlateService.getProductPlates(productId);
  }
}
