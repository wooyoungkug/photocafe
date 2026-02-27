import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ShootingService } from '../services/shooting.service';
import {
  CreateShootingDto,
  UpdateShootingDto,
  QueryShootingDto,
  UpdateShootingStatusDto,
} from '../dto';

@ApiTags('촬영일정')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shootings')
export class ShootingController {
  constructor(private readonly shootingService: ShootingService) {}

  @Post()
  @ApiOperation({ summary: '촬영 일정 생성' })
  async create(@Body() dto: CreateShootingDto, @Request() req: any) {
    return this.shootingService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '촬영 일정 목록 조회' })
  async findAll(@Query() query: QueryShootingDto) {
    return this.shootingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '촬영 일정 상세 조회' })
  async findOne(@Param('id') id: string) {
    return this.shootingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '촬영 일정 수정' })
  async update(@Param('id') id: string, @Body() dto: UpdateShootingDto) {
    return this.shootingService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '촬영 일정 삭제' })
  async delete(@Param('id') id: string) {
    return this.shootingService.delete(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '촬영 일정 상태 변경' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShootingStatusDto,
  ) {
    return this.shootingService.updateStatus(id, dto);
  }
}
