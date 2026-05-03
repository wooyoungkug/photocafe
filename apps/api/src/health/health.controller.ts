import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import {
  HealthCheckService,
  HealthCheck,
  HealthIndicatorResult,
  PrismaHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@/common/prisma/prisma.service';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private prisma: PrismaService,
    private b2: B2StorageService,
  ) {}

  /**
   * Terminus 호환 indicator: B2 활성/비활성 상태를 반환.
   * - 운영(B2 미설정 시점)에서 빨간불을 띄우고 싶지 않으므로 비활성도 ok 로 처리하고
   *   `enabled=false` 메타로 구분.
   */
  private async checkB2(): Promise<HealthIndicatorResult> {
    const enabled = this.b2.isEnabled();
    return {
      b2: {
        status: 'up',
        enabled,
        privateBucket: enabled ? this.b2.getPrivateBucket() : null,
        publicBucket: enabled ? this.b2.getPublicBucket() || null : null,
      },
    };
  }

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '서버 Health Check (db + b2 + memory + disk)' })
  check() {
    return this.health.check([
      // DB 연결 체크
      () => this.prismaHealth.pingCheck('database', this.prisma),
      // B2 스토리지 활성 여부
      () => this.checkB2(),
      // 메모리 체크 (힙 메모리 1GB 이하)
      () => this.memory.checkHeap('memory_heap', 1024 * 1024 * 1024),
      // RSS 메모리 체크 (1.5GB 이하)
      () => this.memory.checkRSS('memory_rss', 1536 * 1024 * 1024),
      // 디스크 공간 체크 (90% 이하)
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('ready')
  @ApiOperation({ summary: '서버 Ready 상태 체크 (DB만)' })
  @HealthCheck()
  checkReady() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('live')
  @ApiOperation({ summary: '서버 Live 상태 체크 (간단)' })
  checkLive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }
}
