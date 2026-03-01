import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UpsertPhotographerProfileDto } from '../dto/photographer-profile.dto';
import { KOREAN_REGIONS, KOREAN_PROVINCES } from '../constants/korean-regions.constants';

@Injectable()
export class PhotographerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(clientId: string) {
    return this.prisma.photographerProfile.findUnique({
      where: { clientId },
    });
  }

  async upsertProfile(clientId: string, dto: UpsertPhotographerProfileDto) {
    return this.prisma.photographerProfile.upsert({
      where: { clientId },
      create: {
        clientId,
        ...dto,
      },
      update: dto,
    });
  }

  getRegions() {
    return {
      provinces: KOREAN_PROVINCES,
      regions: KOREAN_REGIONS,
    };
  }
}
