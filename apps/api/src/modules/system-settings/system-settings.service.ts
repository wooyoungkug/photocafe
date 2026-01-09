import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertSettingDto } from './dto/system-settings.dto';

@Injectable()
export class SystemSettingsService {
    constructor(private prisma: PrismaService) { }

    async findAll(category?: string) {
        return this.prisma.systemSetting.findMany({
            where: category ? { category } : undefined,
            orderBy: { key: 'asc' },
        });
    }

    async findByKey(key: string) {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key },
        });

        if (!setting) {
            throw new NotFoundException(`설정 '${key}'을(를) 찾을 수 없습니다`);
        }

        return setting;
    }

    async getValue(key: string, defaultValue: string = ''): Promise<string> {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key },
        });
        return setting?.value ?? defaultValue;
    }

    async getNumericValue(key: string, defaultValue: number = 0): Promise<number> {
        const value = await this.getValue(key, String(defaultValue));
        return parseFloat(value) || defaultValue;
    }

    async upsert(key: string, dto: UpsertSettingDto) {
        return this.prisma.systemSetting.upsert({
            where: { key },
            update: {
                value: dto.value,
                category: dto.category,
                label: dto.label,
            },
            create: {
                key,
                value: dto.value,
                category: dto.category,
                label: dto.label,
            },
        });
    }

    async bulkUpsert(settings: { key: string; value: string; category: string; label?: string }[]) {
        const results = await Promise.all(
            settings.map((s) =>
                this.prisma.systemSetting.upsert({
                    where: { key: s.key },
                    update: { value: s.value, category: s.category, label: s.label },
                    create: { key: s.key, value: s.value, category: s.category, label: s.label },
                })
            )
        );
        return results;
    }

    // 무료배송 기준 금액 조회
    async getFreeShippingThreshold(): Promise<number> {
        return this.getNumericValue('free_shipping_threshold', 50000);
    }
}
