import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto/staff.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { staff: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            name: true,
            position: true,
            isActive: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('부서를 찾을 수 없습니다');
    }

    return department;
  }

  async create(data: CreateDepartmentDto) {
    // 중복 체크
    const existing = await this.prisma.department.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 부서 코드입니다');
    }

    return this.prisma.department.create({
      data,
    });
  }

  async update(id: string, data: UpdateDepartmentDto) {
    await this.findOne(id);

    // 코드 중복 체크
    if (data.code) {
      const existing = await this.prisma.department.findFirst({
        where: {
          code: data.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 부서 코드입니다');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const department = await this.findOne(id);

    // 소속 직원이 있으면 삭제 불가
    if (department.staff.length > 0) {
      throw new ConflictException('소속 직원이 있는 부서는 삭제할 수 없습니다');
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { success: true, message: '부서가 삭제되었습니다' };
  }
}
