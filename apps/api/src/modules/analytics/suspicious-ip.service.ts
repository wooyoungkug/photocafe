import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSuspiciousIpDto, UpdateSuspiciousIpDto, SuspiciousIpQueryDto } from './dto/suspicious-ip.dto';
import * as geoip from 'geoip-lite';

@Injectable()
export class SuspiciousIpService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: SuspiciousIpQueryDto) {
    const where: any = {};
    if (query.action) where.action = query.action;
    if (query.search) where.ip = { contains: query.search };

    return this.prisma.suspiciousIp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateSuspiciousIpDto) {
    const existing = await this.prisma.suspiciousIp.findUnique({
      where: { ip: dto.ip },
    });
    if (existing) {
      throw new ConflictException('이미 등록된 IP 주소입니다.');
    }

    const geo = geoip.lookup(dto.ip);

    return this.prisma.suspiciousIp.create({
      data: {
        ip: dto.ip,
        reason: dto.reason,
        action: dto.action || 'monitor',
        country: geo?.country || null,
        city: geo?.city || null,
        isKorea: geo?.country === 'KR',
        memo: dto.memo,
        visitCount: dto.visitCount || 0,
        blockedAt: dto.action === 'block' ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: UpdateSuspiciousIpDto) {
    const existing = await this.prisma.suspiciousIp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`ID ${id}인 의심 IP를 찾을 수 없습니다.`);
    }

    const data: Record<string, unknown> = {};
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.memo !== undefined) data.memo = dto.memo;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.action !== undefined) {
      data.action = dto.action;
      data.blockedAt = dto.action === 'block' ? new Date() : null;
    }

    return this.prisma.suspiciousIp.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.suspiciousIp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`ID ${id}인 의심 IP를 찾을 수 없습니다.`);
    }
    return this.prisma.suspiciousIp.delete({ where: { id } });
  }

  /** IP 차단 목록 (미들웨어 캐싱용) */
  async getBlockedIps(): Promise<string[]> {
    const blocked = await this.prisma.suspiciousIp.findMany({
      where: { action: 'block', isActive: true },
      select: { ip: true },
    });
    return blocked.map((b) => b.ip);
  }
}
