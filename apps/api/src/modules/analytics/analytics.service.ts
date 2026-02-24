import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { Request } from 'express';
import * as geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private extractIp(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return ip.trim();
    }
    return req.ip || req.socket?.remoteAddress || null;
  }

  private parseUserAgent(ua: string | undefined) {
    if (!ua) return { os: null, browser: null, device: null };
    const parser = new UAParser(ua);
    const result = parser.getResult();
    return {
      os: result.os?.name || null,
      browser: result.browser?.name || null,
      device: result.device?.type || 'desktop',
    };
  }

  private getDateRange(query: AnalyticsQueryDto): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (query.startDate && query.endDate) {
      return {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      };
    }

    const period = query.period || '30d';
    const start = new Date(now);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === '30d') {
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (period === '90d') {
      start.setDate(start.getDate() - 90);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end };
  }

  async createPageView(dto: CreatePageViewDto, req: Request): Promise<void> {
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'];

    let country: string | null = null;
    let city: string | null = null;
    let isKorea = false;

    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.')) {
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country;
        city = geo.city || null;
        isKorea = geo.country === 'KR';
      }
    } else {
      // 로컬 환경 → 국내로 처리
      isKorea = true;
      country = 'KR';
    }

    const { os, browser, device } = this.parseUserAgent(userAgent);

    await this.prisma.pageView.create({
      data: {
        path: dto.path,
        title: dto.title,
        ip,
        country,
        city,
        isKorea,
        os,
        browser,
        device,
        userAgent,
        referer: dto.referer,
        sessionId: dto.sessionId,
      },
    });
  }

  async getStats(query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const where = { createdAt: { gte: start, lte: end } };

    const [
      totalViews,
      koreaViews,
      overseasViews,
      uniqueSessions,
    ] = await Promise.all([
      this.prisma.pageView.count({ where }),
      this.prisma.pageView.count({ where: { ...where, isKorea: true } }),
      this.prisma.pageView.count({ where: { ...where, isKorea: false } }),
      this.prisma.pageView.groupBy({
        by: ['sessionId'],
        where: { ...where, sessionId: { not: null } },
        _count: true,
      }).then((r) => r.length),
    ]);

    return {
      totalViews,
      koreaViews,
      overseasViews,
      uniqueSessions,
      period: query.period || '30d',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }

  async getTopPages(query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const limit = parseInt(query.limit || '10', 10);

    const result = await this.prisma.pageView.groupBy({
      by: ['path'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: limit,
    });

    const total = result.reduce((sum, r) => sum + r._count.path, 0);

    return result.map((r) => ({
      path: r.path,
      count: r._count.path,
      percentage: total > 0 ? Math.round((r._count.path / total) * 100 * 10) / 10 : 0,
    }));
  }

  async getOsStats(query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);

    const result = await this.prisma.pageView.groupBy({
      by: ['os'],
      where: { createdAt: { gte: start, lte: end } },
      _count: { os: true },
      orderBy: { _count: { os: 'desc' } },
    });

    const total = result.reduce((sum, r) => sum + r._count.os, 0);

    return result.map((r) => ({
      os: r.os || '알 수 없음',
      count: r._count.os,
      percentage: total > 0 ? Math.round((r._count.os / total) * 100 * 10) / 10 : 0,
    }));
  }

  async getGeoStats(query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const where = { createdAt: { gte: start, lte: end } };

    const [koreaCount, overseasCount, countryResult, cityResult] = await Promise.all([
      this.prisma.pageView.count({ where: { ...where, isKorea: true } }),
      this.prisma.pageView.count({ where: { ...where, isKorea: false } }),
      this.prisma.pageView.groupBy({
        by: ['country'],
        where: { ...where, isKorea: false, country: { not: null } },
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      this.prisma.pageView.groupBy({
        by: ['city'],
        where: { ...where, isKorea: true, city: { not: null } },
        _count: { city: true },
        orderBy: { _count: { city: 'desc' } },
        take: 10,
      }),
    ]);

    const total = koreaCount + overseasCount;

    return {
      korea: {
        count: koreaCount,
        percentage: total > 0 ? Math.round((koreaCount / total) * 100 * 10) / 10 : 0,
      },
      overseas: {
        count: overseasCount,
        percentage: total > 0 ? Math.round((overseasCount / total) * 100 * 10) / 10 : 0,
      },
      topKoreaCities: cityResult.map((r) => ({
        city: r.city,
        count: r._count.city,
      })),
      topOverseasCountries: countryResult.map((r) => ({
        country: r.country,
        count: r._count.country,
      })),
    };
  }

  async getTrend(query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const granularity = query.granularity || 'daily';

    let dateFormat: string;
    if (granularity === 'yearly') {
      dateFormat = 'YYYY';
    } else if (granularity === 'monthly') {
      dateFormat = 'YYYY-MM';
    } else {
      dateFormat = 'YYYY-MM-DD';
    }

    const result = await this.prisma.$queryRaw<
      Array<{ date: string; count: bigint }>
    >`
      SELECT
        TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', ${dateFormat}) as date,
        COUNT(*) as count
      FROM page_views
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
      GROUP BY TO_CHAR("createdAt" AT TIME ZONE 'Asia/Seoul', ${dateFormat})
      ORDER BY date ASC
    `;

    return result.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));
  }

  async getIpStats(query: AnalyticsQueryDto) {
    const { start, end } = this.getDateRange(query);
    const limit = parseInt(query.limit || '50', 10);

    const result = await this.prisma.$queryRaw<
      Array<{
        ip: string;
        count: bigint;
        last_visit: Date;
        country: string | null;
        city: string | null;
        is_korea: boolean;
        os: string | null;
        browser: string | null;
      }>
    >`
      SELECT
        ip,
        COUNT(*) as count,
        MAX("createdAt") as last_visit,
        (array_agg(country ORDER BY "createdAt" DESC))[1] as country,
        (array_agg(city ORDER BY "createdAt" DESC))[1] as city,
        (array_agg("isKorea" ORDER BY "createdAt" DESC))[1] as is_korea,
        (array_agg(os ORDER BY "createdAt" DESC))[1] as os,
        (array_agg(browser ORDER BY "createdAt" DESC))[1] as browser
      FROM page_views
      WHERE "createdAt" >= ${start} AND "createdAt" <= ${end}
        AND ip IS NOT NULL
      GROUP BY ip
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    const ips = result.map((r) => r.ip);
    const suspiciousIps =
      ips.length > 0
        ? await this.prisma.suspiciousIp.findMany({
            where: { ip: { in: ips } },
            select: { ip: true, action: true, isActive: true, reason: true },
          })
        : [];

    const suspiciousMap = new Map(suspiciousIps.map((s) => [s.ip, s]));

    return result.map((r) => ({
      ip: r.ip,
      count: Number(r.count),
      lastVisit: r.last_visit,
      country: r.country,
      city: r.city,
      isKorea: r.is_korea,
      os: r.os,
      browser: r.browser,
      suspicious: suspiciousMap.get(r.ip) || null,
    }));
  }
}
