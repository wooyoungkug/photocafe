import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { extractClientIp } from '../../common/utils/extract-client-ip';

@Injectable()
export class IpBlockMiddleware implements NestMiddleware {
  private blockedIps: Set<string> = new Set();
  private lastRefresh: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5분

  constructor(private readonly prisma: PrismaService) {}

  private extractIp(req: Request): string | null {
    // Cloudflare/Vercel 등 프록시 헤더 우선. analytics 와 동일 규칙으로 통일하여
    // "차단된 IP" 와 "통계에 기록되는 IP" 의 정합성을 보장.
    return extractClientIp(req);
  }

  private async refreshCache(): Promise<void> {
    const now = Date.now();
    if (now - this.lastRefresh < this.CACHE_TTL_MS) return;

    const blocked = await this.prisma.suspiciousIp.findMany({
      where: { action: 'block', isActive: true },
      select: { ip: true },
    });
    this.blockedIps = new Set(blocked.map((b) => b.ip));
    this.lastRefresh = now;
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // 페이지뷰 트래킹 엔드포인트는 차단하지 않음 (로깅 목적)
    if (req.path === '/analytics/page-view' && req.method === 'POST') {
      return next();
    }

    await this.refreshCache();

    const ip = this.extractIp(req);
    if (ip && this.blockedIps.has(ip)) {
      res.status(403).json({
        statusCode: 403,
        message: '접속이 차단된 IP입니다.',
        error: 'Forbidden',
      });
      return;
    }

    next();
  }
}
