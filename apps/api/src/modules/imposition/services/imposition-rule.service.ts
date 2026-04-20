import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface CreateRuleInput {
  productSize?: string | null;
  bindingType?: string | null;
  minPages?: number | null;
  maxPages?: number | null;
  priority?: number;
  presetId: string;
  description?: string | null;
  isActive?: boolean;
}

export interface UpdateRuleInput extends Partial<CreateRuleInput> {}

@Injectable()
export class ImpositionRuleService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return (this.prisma as any).impositionRule.findMany({
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
      include: { preset: true },
    });
  }

  async get(id: string) {
    const rule = await (this.prisma as any).impositionRule.findUnique({
      where: { id },
      include: { preset: true },
    });
    if (!rule) throw new NotFoundException(`Rule ${id} not found`);
    return rule;
  }

  create(dto: CreateRuleInput) {
    return (this.prisma as any).impositionRule.create({
      data: {
        productSize: dto.productSize ?? null,
        bindingType: dto.bindingType ?? null,
        minPages: dto.minPages ?? null,
        maxPages: dto.maxPages ?? null,
        priority: dto.priority ?? 0,
        presetId: dto.presetId,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
      include: { preset: true },
    });
  }

  async update(id: string, dto: UpdateRuleInput) {
    await this.get(id);
    return (this.prisma as any).impositionRule.update({
      where: { id },
      data: {
        ...(dto.productSize !== undefined && { productSize: dto.productSize }),
        ...(dto.bindingType !== undefined && { bindingType: dto.bindingType }),
        ...(dto.minPages !== undefined && { minPages: dto.minPages }),
        ...(dto.maxPages !== undefined && { maxPages: dto.maxPages }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.presetId !== undefined && { presetId: dto.presetId }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { preset: true },
    });
  }

  async delete(id: string) {
    await this.get(id);
    return (this.prisma as any).impositionRule.delete({ where: { id } });
  }
}
