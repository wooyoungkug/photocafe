import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MyProductService } from './my-product.service';
import { CreateMyProductDto, UpdateMyProductDto } from './dto/my-product.dto';

@ApiTags('마이상품')
@Controller('my-products')
export class MyProductController {
  constructor(private readonly myProductService: MyProductService) {}

  @Get('client/:clientId')
  @ApiOperation({ summary: '고객별 마이상품 목록 조회' })
  async findByClient(@Param('clientId') clientId: string) {
    return this.myProductService.findByClient(clientId);
  }

  @Get(':id')
  @ApiOperation({ summary: '마이상품 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.myProductService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '마이상품 저장' })
  async create(@Body() dto: CreateMyProductDto) {
    return this.myProductService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '마이상품 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateMyProductDto) {
    return this.myProductService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '마이상품 삭제' })
  async delete(@Param('id') id: string) {
    return this.myProductService.delete(id);
  }

  @Post(':id/usage')
  @ApiOperation({ summary: '마이상품 사용 기록' })
  async recordUsage(@Param('id') id: string) {
    return this.myProductService.recordUsage(id);
  }

  @Post('client/:clientId/reorder')
  @ApiOperation({ summary: '마이상품 순서 변경' })
  async reorder(
    @Param('clientId') clientId: string,
    @Body() items: { id: string; sortOrder: number }[],
  ) {
    return this.myProductService.reorder(clientId, items);
  }
}
