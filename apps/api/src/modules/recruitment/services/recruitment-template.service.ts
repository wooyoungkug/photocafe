import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  CreateRecruitmentTemplateDto,
  UpdateRecruitmentTemplateDto,
} from '../dto/recruitment-template.dto';

@Injectable()
export class RecruitmentTemplateService {
  constructor(private prisma: PrismaService) {}

  async findAll(clientId: string, category?: string) {
    return this.prisma.recruitmentTemplate.findMany({
      where: {
        clientId,
        ...(category ? { category } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(clientId: string, dto: CreateRecruitmentTemplateDto) {
    return this.prisma.recruitmentTemplate.create({
      data: {
        clientId,
        category: dto.category,
        title: dto.title,
        content: dto.content,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(id: string, clientId: string, dto: UpdateRecruitmentTemplateDto) {
    const template = await this.prisma.recruitmentTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('템플릿을 찾을 수 없습니다');
    if (template.clientId !== clientId) throw new ForbiddenException();

    return this.prisma.recruitmentTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, clientId: string) {
    const template = await this.prisma.recruitmentTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('템플릿을 찾을 수 없습니다');
    if (template.clientId !== clientId) throw new ForbiddenException();

    return this.prisma.recruitmentTemplate.delete({ where: { id } });
  }
}
