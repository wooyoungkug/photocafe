import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateMyProductDto, UpdateMyProductDto } from './dto/my-product.dto';

@Injectable()
export class MyProductService {
  constructor(private prisma: PrismaService) {}

  // 고객별 마이상품 목록 조회
  async findByClient(clientId: string) {
    return this.prisma.myProduct.findMany({
      where: { clientId },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            thumbnailUrl: true,
            basePrice: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // 마이상품 상세 조회
  async findOne(id: string) {
    const myProduct = await this.prisma.myProduct.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            thumbnailUrl: true,
            basePrice: true,
            isActive: true,
            specifications: true,
            bindings: true,
            papers: true,
            covers: true,
            finishings: true,
          },
        },
      },
    });

    if (!myProduct) {
      throw new NotFoundException('마이상품을 찾을 수 없습니다.');
    }

    return myProduct;
  }

  // 마이상품 생성
  async create(dto: CreateMyProductDto) {
    // 중복 체크 (같은 고객 + 같은 상품 + 같은 이름)
    const existing = await this.prisma.myProduct.findFirst({
      where: {
        clientId: dto.clientId,
        productId: dto.productId,
        name: dto.name,
      },
    });

    if (existing) {
      // 기존 것을 업데이트
      return this.prisma.myProduct.update({
        where: { id: existing.id },
        data: {
          options: dto.options as object,
          thumbnailUrl: dto.thumbnailUrl,
          defaultQuantity: dto.defaultQuantity ?? 1,
          memo: dto.memo,
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
        include: {
          product: {
            select: {
              id: true,
              productCode: true,
              productName: true,
              thumbnailUrl: true,
              basePrice: true,
            },
          },
        },
      });
    }

    // 새로 생성
    return this.prisma.myProduct.create({
      data: {
        clientId: dto.clientId,
        productId: dto.productId,
        name: dto.name,
        thumbnailUrl: dto.thumbnailUrl,
        options: dto.options as object,
        defaultQuantity: dto.defaultQuantity ?? 1,
        memo: dto.memo,
      },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            thumbnailUrl: true,
            basePrice: true,
          },
        },
      },
    });
  }

  // 마이상품 수정
  async update(id: string, dto: UpdateMyProductDto) {
    const existing = await this.prisma.myProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('마이상품을 찾을 수 없습니다.');
    }

    return this.prisma.myProduct.update({
      where: { id },
      data: {
        name: dto.name,
        thumbnailUrl: dto.thumbnailUrl,
        options: dto.options as object | undefined,
        defaultQuantity: dto.defaultQuantity,
        memo: dto.memo,
        sortOrder: dto.sortOrder,
      },
      include: {
        product: {
          select: {
            id: true,
            productCode: true,
            productName: true,
            thumbnailUrl: true,
            basePrice: true,
          },
        },
      },
    });
  }

  // 마이상품 삭제
  async delete(id: string) {
    const existing = await this.prisma.myProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('마이상품을 찾을 수 없습니다.');
    }

    await this.prisma.myProduct.delete({
      where: { id },
    });

    return { success: true };
  }

  // 사용 기록 업데이트 (주문 시 호출)
  async recordUsage(id: string) {
    return this.prisma.myProduct.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  // 순서 변경
  async reorder(clientId: string, items: { id: string; sortOrder: number }[]) {
    const updates = items.map((item) =>
      this.prisma.myProduct.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }
}
