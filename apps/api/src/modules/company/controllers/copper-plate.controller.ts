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
import { CopperPlateService } from '../services/copper-plate.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
  CreateCopperPlateDto,
  UpdateCopperPlateDto,
  RecordCopperPlateUsageDto,
  ChangeCopperPlateLocationDto,
  ChangeCopperPlateStatusDto,
  FOIL_COLOR_LABELS,
  COPPER_PLATE_STATUS_LABELS,
} from '../dto/copper-plate.dto';

@ApiTags('동판 관리')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('copper-plates')
export class CopperPlateController {
  constructor(private readonly copperPlateService: CopperPlateService) {}

  // 라벨 조회 (프론트엔드용)
  @Get('labels')
  @ApiOperation({ summary: '박 컬러 및 상태 라벨 조회' })
  getLabels() {
    return {
      foilColors: FOIL_COLOR_LABELS,
      statuses: COPPER_PLATE_STATUS_LABELS,
    };
  }

  // 전체 동판 검색 (관리자용)
  @Get()
  @ApiOperation({ summary: '전체 동판 검색' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'foilColor', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  search(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('foilColor') foilColor?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.copperPlateService.search({
      search,
      status,
      foilColor,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // 회원별 동판 목록 조회
  @Get('client/:clientId')
  @ApiOperation({ summary: '회원별 동판 목록 조회' })
  findByClientId(@Param('clientId') clientId: string) {
    return this.copperPlateService.findByClientId(clientId);
  }

  // 동판 상세 조회
  @Get(':id')
  @ApiOperation({ summary: '동판 상세 조회' })
  findOne(@Param('id') id: string) {
    return this.copperPlateService.findOne(id);
  }

  // 동판 등록
  @Post()
  @ApiOperation({ summary: '동판 등록' })
  create(@Body() dto: CreateCopperPlateDto) {
    return this.copperPlateService.create(dto);
  }

  // 동판 수정
  @Put(':id')
  @ApiOperation({ summary: '동판 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateCopperPlateDto) {
    return this.copperPlateService.update(id, dto);
  }

  // 동판 삭제
  @Delete(':id')
  @ApiOperation({ summary: '동판 삭제' })
  delete(@Param('id') id: string) {
    return this.copperPlateService.delete(id);
  }

  // 사용 기록 추가
  @Post(':id/usage')
  @ApiOperation({ summary: '동판 사용 기록 추가' })
  recordUsage(
    @Param('id') id: string,
    @Body() dto: RecordCopperPlateUsageDto,
  ) {
    return this.copperPlateService.recordUsage(id, dto);
  }

  // 위치 변경
  @Post(':id/location')
  @ApiOperation({ summary: '동판 보관 위치 변경' })
  changeLocation(
    @Param('id') id: string,
    @Body() dto: ChangeCopperPlateLocationDto,
  ) {
    return this.copperPlateService.changeLocation(id, dto);
  }

  // 상태 변경
  @Post(':id/status')
  @ApiOperation({ summary: '동판 상태 변경' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeCopperPlateStatusDto,
  ) {
    return this.copperPlateService.changeStatus(id, dto);
  }

  // 이력 조회
  @Get(':id/histories')
  @ApiOperation({ summary: '동판 이력 조회' })
  @ApiQuery({ name: 'limit', required: false })
  getHistories(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.copperPlateService.getHistories(
      id,
      limit ? parseInt(limit) : undefined,
    );
  }

  // 순서 변경
  @Post(':id/reorder')
  @ApiOperation({ summary: '동판 순서 변경' })
  reorder(
    @Param('id') id: string,
    @Body() dto: { direction: 'up' | 'down' },
  ) {
    return this.copperPlateService.reorder(id, dto.direction);
  }
}
