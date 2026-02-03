import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  CreateConsultationCategoryDto,
  UpdateConsultationCategoryDto,
} from '../dto';

@Injectable()
export class ConsultationCategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.consultationCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.consultationCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { consultations: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('상담 분류를 찾을 수 없습니다.');
    }

    return category;
  }

  async create(data: CreateConsultationCategoryDto) {
    const existing = await this.prisma.consultationCategory.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException('이미 존재하는 분류 코드입니다.');
    }

    return this.prisma.consultationCategory.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        colorCode: data.colorCode,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async update(id: string, data: UpdateConsultationCategoryDto) {
    await this.findOne(id);

    if (data.code) {
      const existing = await this.prisma.consultationCategory.findFirst({
        where: {
          code: data.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('이미 존재하는 분류 코드입니다.');
      }
    }

    return this.prisma.consultationCategory.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const category = await this.findOne(id);

    if (category._count.consultations > 0) {
      throw new ConflictException(
        '해당 분류에 연결된 상담이 있어 삭제할 수 없습니다.',
      );
    }

    return this.prisma.consultationCategory.delete({
      where: { id },
    });
  }

  async initializeDefaultCategories() {
    const defaultCategories = [
      { code: 'claim_quality', name: '품질 클레임', colorCode: 'red', sortOrder: 1 },
      { code: 'claim_delivery', name: '배송 클레임', colorCode: 'orange', sortOrder: 2 },
      { code: 'claim_quantity', name: '수량 클레임', colorCode: 'yellow', sortOrder: 3 },
      { code: 'inquiry_order', name: '주문 문의', colorCode: 'blue', sortOrder: 4 },
      { code: 'inquiry_price', name: '가격 문의', colorCode: 'purple', sortOrder: 5 },
      { code: 'inquiry_product', name: '상품 문의', colorCode: 'cyan', sortOrder: 6 },
      { code: 'suggestion', name: '제안/건의', colorCode: 'green', sortOrder: 7 },
      { code: 'compliment', name: '칭찬', colorCode: 'pink', sortOrder: 8 },
      { code: 'schedule', name: '일정 조율', colorCode: 'indigo', sortOrder: 9 },
      { code: 'other', name: '기타', colorCode: 'gray', sortOrder: 10 },
    ];

    for (const category of defaultCategories) {
      await this.prisma.consultationCategory.upsert({
        where: { code: category.code },
        update: {},
        create: category,
      });
    }

    return { message: '기본 상담 분류가 초기화되었습니다.' };
  }
}
