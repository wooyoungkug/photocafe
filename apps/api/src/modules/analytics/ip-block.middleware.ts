import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class IpBlockMiddleware implements NestMiddleware {
  private blockedIps: Set<string> = new Set();
  private lastRefresh: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5분

  constructor(private readonly prisma: PrismaService) {}

  private extractIp(req: Request): string | null {
    // Express trust proxy 설정 시 req.ip가 올바른 클라이언트 IP를 반환.
    // X-Forwarded-For 헤더를 직접 파싱하면 클라이언트가 헤더를 조작하여
    // 차단을 우회할 수 있으므로 req.ip를 우선 사용.
    if (req.ip) {
      // IPv4-mapped IPv6 주소 정규화 (::ffff:1.2.3.4 → 1.2.3.4)
      return req.ip.replace(/^::ffff:/, '');
    }
    const remoteAddr = req.socket?.remoteAddress ?? null;
    return remoteAddr ? remoteAddr.replace(/^::ffff:/, '') : null;
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
