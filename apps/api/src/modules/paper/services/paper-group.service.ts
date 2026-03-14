import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePaperGroupDto, UpdatePaperGroupDto } from '../dto';

@Injectable()
export class PaperGroupService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    const where = isActive !== undefined ? { isActive } : {};

    return this.prisma.paperGroup.findMany({
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
    const group = await this.prisma.paperGroup.findUnique({
      where: { id },
      include: {
        papers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('용지 그룹을 찾을 수 없습니다');
    }

    return group;
  }

  async create(dto: CreatePaperGroupDto) {
    const code = dto.code || `GRP${Date.now().toString(36).toUpperCase()}`;

    const existing = await this.prisma.paperGroup.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 그룹 코드입니다');
    }

    return this.prisma.paperGroup.create({
      data: {
        ...dto,
        code,
      },
    });
  }

  async update(id: string, dto: UpdatePaperGroupDto) {
    const group = await this.prisma.paperGroup.findUnique({
      where: { id },
    });

    if (!group) {
      throw new NotFoundException('용지 그룹을 찾을 수 없습니다');
    }

    if (dto.code && dto.code !== group.code) {
      const existing = await this.prisma.paperGroup.findUnique({
        where: { code: dto.code },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 그룹 코드입니다');
      }
    }

    return this.prisma.paperGroup.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const group = await this.prisma.paperGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { papers: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('용지 그룹을 찾을 수 없습니다');
    }

    if (group._count.papers > 0) {
      throw new ConflictException('이 그룹에 연결된 용지가 있어 삭제할 수 없습니다');
    }

    return this.prisma.paperGroup.delete({
      where: { id },
    });
  }
}
