import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateDisciplineRecordDto, DisciplineQueryDto } from '../dto';

@Injectable()
export class DisciplineService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DisciplineQueryDto) {
    const { page = 1, limit = 20, staffId, type } = query;

    const where: Prisma.StaffDisciplineRecordWhereInput = {};
    if (staffId) where.staffId = staffId;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.staffDisciplineRecord.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { effectiveDate: 'desc' },
        include: {
          staff: { select: { id: true, name: true, position: true, department: true } },
        },
      }),
      this.prisma.staffDisciplineRecord.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const record = await this.prisma.staffDisciplineRecord.findUnique({
      where: { id },
      include: {
        staff: { select: { id: true, name: true, position: true, department: true } },
      },
    });
    if (!record) {
      throw new NotFoundException(`인사기록 ID ${id}를 찾을 수 없습니다.`);
    }
    return record;
  }

  async create(dto: CreateDisciplineRecordDto, createdBy: string) {
    return this.prisma.staffDisciplineRecord.create({
      data: {
        staffId: dto.staffId,
        agendaId: dto.agendaId,
        type: dto.type,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        effectiveDate: new Date(dto.effectiveDate),
        createdBy,
      },
      include: {
        staff: { select: { id: true, name: true, position: true } },
      },
    });
  }

  async remove(id: string) {
    const record = await this.prisma.staffDisciplineRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`인사기록 ID ${id}를 찾을 수 없습니다.`);
    }
    return this.prisma.staffDisciplineRecord.delete({ where: { id } });
  }
}
