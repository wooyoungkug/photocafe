import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpsertClientAlbumPreferenceDto, UpdateFromOrderDto } from '../dto/client-album-preference.dto';

@Injectable()
export class ClientAlbumPreferenceService {
  constructor(private prisma: PrismaService) {}

  async findByClientId(clientId: string) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('거래처를 찾을 수 없습니다');

    return this.prisma.clientAlbumPreference.findUnique({
      where: { clientId },
    });
  }

  async upsert(clientId: string, dto: UpsertClientAlbumPreferenceDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('거래처를 찾을 수 없습니다');

    return this.prisma.clientAlbumPreference.upsert({
      where: { clientId },
      create: { clientId, ...dto },
      update: dto,
    });
  }

  async updateFromOrder(clientId: string, dto: UpdateFromOrderDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('거래처를 찾을 수 없습니다');

    const existing = await this.prisma.clientAlbumPreference.findUnique({
      where: { clientId },
    });

    if (existing) {
      const newTotalOrders = existing.totalOrders + 1;
      const newAvgPageCount = dto.pageCount
        ? Math.round(
            ((existing.averagePageCount || 0) * existing.totalOrders + dto.pageCount) /
              newTotalOrders,
          )
        : existing.averagePageCount;

      return this.prisma.clientAlbumPreference.update({
        where: { clientId },
        data: {
          totalOrders: newTotalOrders,
          lastOrderDate: new Date(),
          mostUsedSize: dto.albumSize || existing.mostUsedSize,
          averagePageCount: newAvgPageCount,
        },
      });
    } else {
      return this.prisma.clientAlbumPreference.create({
        data: {
          clientId,
          totalOrders: 1,
          lastOrderDate: new Date(),
          mostUsedSize: dto.albumSize || null,
          averagePageCount: dto.pageCount || null,
        },
      });
    }
  }
}
