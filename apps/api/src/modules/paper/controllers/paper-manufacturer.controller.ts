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
import { PaperManufacturerService } from '../services/paper-manufacturer.service';
import { CreatePaperManufacturerDto, UpdatePaperManufacturerDto } from '../dto';

@ApiTags('제지사')
@Controller('paper-manufacturers')
export class PaperManufacturerController {
  constructor(private readonly service: PaperManufacturerService) {}

  @Get()
  @ApiOperation({ summary: '제지사 목록 조회' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(@Query('isActive') isActive?: string) {
    const active = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.findAll(active);
  }

  @Get(':id')
  @ApiOperation({ summary: '제지사 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '제지사 생성' })
  async create(@Body() dto: CreatePaperManufacturerDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '제지사 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaperManufacturerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '제지사 삭제' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
