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
  ForbiddenException,
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

/** 관리자(staff) 여부 확인 */
function isStaff(user: any): boolean {
  return user?.type === 'staff';
}

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
  async findAll(@Query() query: QueryShootingDto, @Request() req: any) {
    if (!isStaff(req.user)) {
      // employee: 본인 ID + 소속 회사 ID 모두 포함
      const createdByIds = [req.user.id];
      if (req.user.type === 'employee' && req.user.clientId && req.user.clientId !== req.user.id) {
        createdByIds.push(req.user.clientId);
      }
      return this.shootingService.findAll(query, createdByIds);
    }
    return this.shootingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '촬영 일정 상세 조회' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const shooting = await this.shootingService.findOne(id);
    if (!isStaff(req.user)) {
      const allowedIds = this.getAllowedIds(req.user);
      if (!allowedIds.includes(shooting.createdBy)) {
        throw new ForbiddenException('접근 권한이 없습니다.');
      }
    }
    return shooting;
  }

  @Patch(':id')
  @ApiOperation({ summary: '촬영 일정 수정' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShootingDto,
    @Request() req: any,
  ) {
    if (!isStaff(req.user)) {
      await this.assertOwnership(id, req.user);
    }
    return this.shootingService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '촬영 일정 삭제' })
  async delete(@Param('id') id: string, @Request() req: any) {
    if (!isStaff(req.user)) {
      await this.assertOwnership(id, req.user);
    }
    return this.shootingService.delete(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '촬영 일정 상태 변경' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateShootingStatusDto,
    @Request() req: any,
  ) {
    if (!isStaff(req.user)) {
      await this.assertOwnership(id, req.user);
    }
    return this.shootingService.updateStatus(id, dto);
  }

  /** 접근 허용 ID 목록: 본인 + employee면 소속 회사 포함 */
  private getAllowedIds(user: any): string[] {
    const ids = [user.id];
    if (user.type === 'employee' && user.clientId && user.clientId !== user.id) {
      ids.push(user.clientId);
    }
    return ids;
  }

  /** 소유권 검증 헬퍼 */
  private async assertOwnership(id: string, user: any): Promise<void> {
    const shooting = await this.shootingService.findOne(id);
    const allowedIds = this.getAllowedIds(user);
    if (!allowedIds.includes(shooting.createdBy)) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }
  }
}
