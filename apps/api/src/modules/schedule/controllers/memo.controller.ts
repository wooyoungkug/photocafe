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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { MemoService } from '../services/memo.service';
import { CreateMemoDto, UpdateMemoDto, QueryMemoDto } from '../dto';

@ApiTags('메모')
@Controller('memos')
export class MemoController {
  constructor(private readonly memoService: MemoService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메모 생성' })
  create(@Body() dto: CreateMemoDto, @Req() req: any) {
    return this.memoService.create(dto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메모 목록 조회 (개인/부서/전체 필터)' })
  findAll(@Query() query: QueryMemoDto, @Req() req: any) {
    return this.memoService.findAll(query, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메모 상세 조회' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.memoService.findOne(id, req.user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메모 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateMemoDto, @Req() req: any) {
    return this.memoService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '메모 삭제' })
  delete(@Param('id') id: string, @Req() req: any) {
    return this.memoService.delete(id, req.user);
  }
}
