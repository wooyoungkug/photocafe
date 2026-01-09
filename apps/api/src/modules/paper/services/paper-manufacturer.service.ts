import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePaperManufacturerDto, UpdatePaperManufacturerDto } from '../dto';

@Injectable()
export class PaperManufacturerService {
  constructor(private prisma: PrismaService) { }

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};

    return this.prisma.paperManufacturer.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { papers: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const manufacturer = await this.prisma.paperManufacturer.findUnique({
      where: { id },
      include: {
        papers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException('제지사를 찾을 수 없습니다');
    }

    return manufacturer;
  }

  async create(dto: CreatePaperManufacturerDto) {
    // 코드 자동 생성
    const code = dto.code || `MF${Date.now().toString(36).toUpperCase()}`;

    // 코드 중복 검사
    const existing = await this.prisma.paperManufacturer.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 제지사 코드입니다');
    }

    return this.prisma.paperManufacturer.create({
      data: {
        ...dto,
        code,
      },
    });
  }

  async update(id: string, dto: UpdatePaperManufacturerDto) {
    const manufacturer = await this.prisma.paperManufacturer.findUnique({
      where: { id },
    });

    if (!manufacturer) {
      throw new NotFoundException('제지사를 찾을 수 없습니다');
    }

    // 코드 변경 시 중복 검사
    if (dto.code && dto.code !== manufacturer.code) {
      const existing = await this.prisma.paperManufacturer.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 제지사 코드입니다');
      }
    }

    return this.prisma.paperManufacturer.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const manufacturer = await this.prisma.paperManufacturer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { papers: true },
        },
      },
    });

    if (!manufacturer) {
      throw new NotFoundException('제지사를 찾을 수 없습니다');
    }

    if (manufacturer._count.papers > 0) {
      throw new ConflictException('이 제지사에 연결된 용지가 있어 삭제할 수 없습니다');
    }

    return this.prisma.paperManufacturer.delete({
      where: { id },
    });
  }
}
