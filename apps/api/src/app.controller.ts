import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiExcludeController()
@Public()
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Redirect('/api/docs', 302)
  root() {
    return;
  }

  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '인쇄업 ERP API',
      version: '1.0.0',
    };
  }

  @Get('health/db')
  async healthDb() {
    const startTime = Date.now();
    try {
      // 간단한 쿼리로 DB 연결 확인
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'PostgreSQL',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
