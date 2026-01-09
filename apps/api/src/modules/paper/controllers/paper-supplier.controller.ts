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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PaperSupplierService } from '../services/paper-supplier.service';
import { CreatePaperSupplierDto, UpdatePaperSupplierDto } from '../dto';

@ApiTags('용지대리점')
@Controller('paper-suppliers')
export class PaperSupplierController {
  constructor(private readonly service: PaperSupplierService) {}

  @Get()
  @ApiOperation({ summary: '용지대리점 목록 조회' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.findAll(active);
  }

  @Get(':id')
  @ApiOperation({ summary: '용지대리점 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '용지대리점 생성' })
  async create(@Body() dto: CreatePaperSupplierDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '용지대리점 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaperSupplierDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '용지대리점 삭제' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
