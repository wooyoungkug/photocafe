import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePaperSupplierDto, UpdatePaperSupplierDto } from '../dto';

@Injectable()
export class PaperSupplierService {
  constructor(private prisma: PrismaService) { }

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};

    return this.prisma.paperSupplier.findMany({
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
    const supplier = await this.prisma.paperSupplier.findUnique({
      where: { id },
      include: {
        papers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('용지대리점을 찾을 수 없습니다');
    }

    return supplier;
  }

  async create(dto: CreatePaperSupplierDto) {
    // 코드 자동 생성
    const code = dto.code || `SP${Date.now().toString(36).toUpperCase()}`;

    // 코드 중복 검사
    const existing = await this.prisma.paperSupplier.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 대리점 코드입니다');
    }

    return this.prisma.paperSupplier.create({
      data: {
        ...dto,
        code,
      },
    });
  }

  async update(id: string, dto: UpdatePaperSupplierDto) {
    const supplier = await this.prisma.paperSupplier.findUnique({
      where: { id },
    });

    if (!supplier) {
      throw new NotFoundException('용지대리점을 찾을 수 없습니다');
    }

    // 코드 변경 시 중복 검사
    if (dto.code && dto.code !== supplier.code) {
      const existing = await this.prisma.paperSupplier.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 대리점 코드입니다');
      }
    }

    return this.prisma.paperSupplier.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const supplier = await this.prisma.paperSupplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { papers: true },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException('용지대리점을 찾을 수 없습니다');
    }

    if (supplier._count.papers > 0) {
      throw new ConflictException('이 대리점에 연결된 용지가 있어 삭제할 수 없습니다');
    }

    return this.prisma.paperSupplier.delete({
      where: { id },
    });
  }
}
