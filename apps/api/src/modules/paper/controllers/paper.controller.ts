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
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PaperService } from '../services/paper.service';
import { CreatePaperDto, UpdatePaperDto, PaperQueryDto } from '../dto';

@ApiTags('용지')
@Controller('papers')
export class PaperController {
  constructor(private readonly service: PaperService) {}

  @Get()
  @ApiOperation({ summary: '용지 목록 조회' })
  async findAll(@Query() query: PaperQueryDto) {
    return this.service.findAll(query);
  }

  @Get('type/:paperType')
  @ApiOperation({ summary: '용지 타입별 조회' })
  @ApiParam({ name: 'paperType', enum: ['roll', 'sheet'] })
  async findByType(@Param('paperType') paperType: 'roll' | 'sheet') {
    return this.service.findByType(paperType);
  }

  @Get('print-method/:method')
  @ApiOperation({ summary: '출력 방식별 용지 조회' })
  @ApiParam({ name: 'method', enum: ['indigo', 'inkjet', 'offset'] })
  async findByPrintMethod(@Param('method') method: string) {
    return this.service.findByPrintMethod(method);
  }

  @Get(':id')
  @ApiOperation({ summary: '용지 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '용지 생성' })
  async create(@Body() dto: CreatePaperDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '용지 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdatePaperDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '용지 삭제' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
