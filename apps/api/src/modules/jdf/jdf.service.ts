import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class JdfService {
  constructor(private prisma: PrismaService) {}

  // ==================== ColorIntent ====================
  async findAllColorIntents(includeInactive = false) {
    return this.prisma.colorIntent.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findColorIntentById(id: string) {
    return this.prisma.colorIntent.findUnique({ where: { id } });
  }

  async createColorIntent(data: any) {
    return this.prisma.colorIntent.create({ data });
  }

  async updateColorIntent(id: string, data: any) {
    return this.prisma.colorIntent.update({ where: { id }, data });
  }

  async deleteColorIntent(id: string) {
    return this.prisma.colorIntent.delete({ where: { id } });
  }

  // ==================== BindingIntent ====================
  async findAllBindingIntents(includeInactive = false) {
    return this.prisma.bindingIntent.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBindingIntentById(id: string) {
    return this.prisma.bindingIntent.findUnique({ where: { id } });
  }

  async createBindingIntent(data: any) {
    return this.prisma.bindingIntent.create({ data });
  }

  async updateBindingIntent(id: string, data: any) {
    return this.prisma.bindingIntent.update({ where: { id }, data });
  }

  async deleteBindingIntent(id: string) {
    return this.prisma.bindingIntent.delete({ where: { id } });
  }

  // ==================== FoldingIntent ====================
  async findAllFoldingIntents(includeInactive = false) {
    return this.prisma.foldingIntent.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findFoldingIntentById(id: string) {
    return this.prisma.foldingIntent.findUnique({ where: { id } });
  }

  async createFoldingIntent(data: any) {
    return this.prisma.foldingIntent.create({ data });
  }

  async updateFoldingIntent(id: string, data: any) {
    return this.prisma.foldingIntent.update({ where: { id }, data });
  }

  async deleteFoldingIntent(id: string) {
    return this.prisma.foldingIntent.delete({ where: { id } });
  }

  // ==================== ProofingIntent ====================
  async findAllProofingIntents(includeInactive = false) {
    return this.prisma.proofingIntent.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findProofingIntentById(id: string) {
    return this.prisma.proofingIntent.findUnique({ where: { id } });
  }

  async createProofingIntent(data: any) {
    return this.prisma.proofingIntent.create({ data });
  }

  async updateProofingIntent(id: string, data: any) {
    return this.prisma.proofingIntent.update({ where: { id }, data });
  }

  async deleteProofingIntent(id: string) {
    return this.prisma.proofingIntent.delete({ where: { id } });
  }

  // ==================== FileSpec ====================
  async findAllFileSpecs(includeInactive = false) {
    return this.prisma.fileSpec.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findFileSpecById(id: string) {
    return this.prisma.fileSpec.findUnique({ where: { id } });
  }

  async createFileSpec(data: any) {
    return this.prisma.fileSpec.create({ data });
  }

  async updateFileSpec(id: string, data: any) {
    return this.prisma.fileSpec.update({ where: { id }, data });
  }

  async deleteFileSpec(id: string) {
    return this.prisma.fileSpec.delete({ where: { id } });
  }

  // ==================== QualityControl ====================
  async findAllQualityControls(includeInactive = false) {
    return this.prisma.qualityControl.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findQualityControlById(id: string) {
    return this.prisma.qualityControl.findUnique({ where: { id } });
  }

  async createQualityControl(data: any) {
    return this.prisma.qualityControl.create({ data });
  }

  async updateQualityControl(id: string, data: any) {
    return this.prisma.qualityControl.update({ where: { id }, data });
  }

  async deleteQualityControl(id: string) {
    return this.prisma.qualityControl.delete({ where: { id } });
  }

  // ==================== 전체 JDF Intent 조회 ====================
  async findAllJdfIntents() {
    const [colorIntents, bindingIntents, foldingIntents, proofingIntents, fileSpecs, qualityControls] = await Promise.all([
      this.findAllColorIntents(),
      this.findAllBindingIntents(),
      this.findAllFoldingIntents(),
      this.findAllProofingIntents(),
      this.findAllFileSpecs(),
      this.findAllQualityControls(),
    ]);

    return {
      colorIntents,
      bindingIntents,
      foldingIntents,
      proofingIntents,
      fileSpecs,
      qualityControls,
    };
  }
}
