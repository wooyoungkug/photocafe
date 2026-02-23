import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ToolUsageService {
    constructor(private prisma: PrismaService) {}

    async getStats(toolId: string) {
        const stat = await this.prisma.toolUsageStat.findUnique({
            where: { toolId },
            select: { accessCount: true, useCount: true },
        });

        return stat ?? { accessCount: 0, useCount: 0 };
    }

    async getBatchStats(toolIds: string[]) {
        const stats = await this.prisma.toolUsageStat.findMany({
            where: { toolId: { in: toolIds } },
            select: { toolId: true, accessCount: true, useCount: true },
        });

        const statsMap: Record<string, { accessCount: number; useCount: number }> = {};

        for (const id of toolIds) {
            const found = stats.find((s) => s.toolId === id);
            statsMap[id] = found
                ? { accessCount: found.accessCount, useCount: found.useCount }
                : { accessCount: 0, useCount: 0 };
        }

        return statsMap;
    }

    async incrementAccess(toolId: string) {
        const stat = await this.prisma.toolUsageStat.upsert({
            where: { toolId },
            create: { toolId, accessCount: 1, useCount: 0 },
            update: { accessCount: { increment: 1 } },
            select: { accessCount: true, useCount: true },
        });

        return stat;
    }

    async incrementUse(toolId: string) {
        const stat = await this.prisma.toolUsageStat.upsert({
            where: { toolId },
            create: { toolId, accessCount: 0, useCount: 1 },
            update: { useCount: { increment: 1 } },
            select: { accessCount: true, useCount: true },
        });

        return stat;
    }
}
