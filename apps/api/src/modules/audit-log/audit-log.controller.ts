import { Controller, Get, Param, Query, UseGuards, ForbiddenException, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StaffOnlyGuard } from '@/common/guards/staff-only.guard';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log.dto';
import { PrismaService } from '@/common/prisma/prisma.service';

@ApiTags('감사로그')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(StaffOnlyGuard)
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: '감사 로그 전체 조회 (관리자 전용)' })
  async findAll(@Query() query: AuditLogQueryDto, @Request() req: any) {
    // isSuperAdmin 또는 canViewAuditLogs 권한 확인
    const staff = await this.prisma.staff.findUnique({
      where: { id: req.user.id },
      select: { isSuperAdmin: true, canViewAuditLogs: true },
    });

    if (!staff?.isSuperAdmin && !staff?.canViewAuditLogs) {
      throw new ForbiddenException('감사 로그 조회 권한이 없습니다');
    }

    return this.auditLogService.findAll(query);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: '특정 엔티티의 감사 로그 조회' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId, query);
  }
}
