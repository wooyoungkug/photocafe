import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async findAll(isActive?: boolean) {
    return this.prisma.branch.findMany({
      where: isActive !== undefined ? { isActive } : undefined,
      orderBy: [{ isHeadquarters: 'desc' }, { branchName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('지점을 찾을 수 없습니다');
    }

    return branch;
  }

  async create(data: { branchCode: string; branchName: string; isHeadquarters?: boolean; address?: string; phone?: string }) {
    const existing = await this.prisma.branch.findUnique({
      where: { branchCode: data.branchCode },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 지점 코드입니다');
    }

    return this.prisma.branch.create({
      data: {
        ...data,
        isActive: true,
      },
    });
  }

  async update(id: string, data: { branchCode?: string; branchName?: string; isHeadquarters?: boolean; address?: string; phone?: string; isActive?: boolean }) {
    await this.findOne(id);

    if (data.branchCode) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          branchCode: data.branchCode,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 지점 코드입니다');
      }
    }

    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    // 해당 지점에 직원이 있는지 확인
    const staffCount = await this.prisma.staff.count({
      where: { branchId: id },
    });

    if (staffCount > 0) {
      throw new ConflictException('해당 지점에 소속된 직원이 있어 삭제할 수 없습니다');
    }

    await this.prisma.branch.delete({
      where: { id },
    });

    return { success: true, message: '지점이 삭제되었습니다' };
  }
}
