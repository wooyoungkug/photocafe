import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from '../dto';

@Injectable()
export class LeaveTypeService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.leaveType.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async create(dto: CreateLeaveTypeDto) {
    const exists = await this.prisma.leaveType.findUnique({
      where: { code: dto.code },
    });
    if (exists) {
      throw new ConflictException(`이미 존재하는 휴가 유형 코드입니다: ${dto.code}`);
    }

    return this.prisma.leaveType.create({ data: dto });
  }

  async update(id: string, dto: UpdateLeaveTypeDto) {
    const type = await this.prisma.leaveType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException(`휴가 유형을 찾을 수 없습니다: ${id}`);
    }

    if (dto.code && dto.code !== type.code) {
      const exists = await this.prisma.leaveType.findUnique({
        where: { code: dto.code },
      });
      if (exists) {
        throw new ConflictException(`이미 존재하는 휴가 유형 코드입니다: ${dto.code}`);
      }
    }

    return this.prisma.leaveType.update({
      where: { id },
      data: dto,
    });
  }
}
