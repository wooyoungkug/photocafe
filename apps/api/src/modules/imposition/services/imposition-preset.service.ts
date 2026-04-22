import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePresetDto, UpdatePresetDto } from '../dto/preset.dto';

@Injectable()
export class ImpositionPresetService {
  constructor(private readonly prisma: PrismaService) {}

  async list(bindingType?: string) {
    return this.prisma.impositionPreset.findMany({
      where: bindingType ? { bindingType } : undefined,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async get(id: string) {
    const preset = await this.prisma.impositionPreset.findUnique({ where: { id } });
    if (!preset) throw new NotFoundException(`Preset ${id} not found`);
    return preset;
  }

  async create(dto: CreatePresetDto) {
    // isDefault = true 인 프리셋은 같은 bindingType 안에서 하나만 유지
    if (dto.isDefault) {
      await this.prisma.impositionPreset.updateMany({
        where: { bindingType: dto.bindingType, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.impositionPreset.create({
      data: {
        name: dto.name,
        bindingType: dto.bindingType,
        sheetWidth: dto.sheetWidth,
        sheetHeight: dto.sheetHeight,
        marginTop: dto.marginTop ?? 5,
        marginRight: dto.marginRight ?? 5,
        marginBottom: dto.marginBottom ?? 5,
        marginLeft: dto.marginLeft ?? 5,
        creaseWidth: dto.creaseWidth ?? null,
        tackMargin: dto.tackMargin ?? null,
        tackEdge: dto.tackEdge ?? null,
        gutter: dto.gutter ?? 3,
        bleed: dto.bleed ?? 3,
        grainDirection: dto.grainDirection ?? 'short',
        rotationPolicy: dto.rotationPolicy ?? 'auto',
        isDefault: dto.isDefault ?? false,
        companyId: dto.companyId ?? null,
      },
    });
  }

  /**
   * 임시(`_즉시_` prefix) 프리셋 재사용.
   * 임포지션 설정 다이얼로그가 "실행"할 때마다 신규 프리셋을 저장해 쌓이는 문제를 해결.
   * 동일 파라미터의 `_즉시_` prefix 프리셋이 있으면 해당 레코드를 반환, 없으면 새로 생성한다.
   * 검색 키: bindingType + sheet/margin/gutter/bleed + compressed/tack 전용 필드 + 회전/결 정책.
   */
  async findOrCreateTransient(dto: CreatePresetDto) {
    const toNum = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const where = {
      name: { startsWith: '_즉시_' },
      bindingType: dto.bindingType,
      sheetWidth: toNum(dto.sheetWidth, 0),
      sheetHeight: toNum(dto.sheetHeight, 0),
      marginTop: toNum(dto.marginTop, 5),
      marginRight: toNum(dto.marginRight, 5),
      marginBottom: toNum(dto.marginBottom, 5),
      marginLeft: toNum(dto.marginLeft, 5),
      gutter: toNum(dto.gutter, 3),
      bleed: toNum(dto.bleed, 3),
      creaseWidth: dto.creaseWidth ?? null,
      tackMargin: dto.tackMargin ?? null,
      tackEdge: dto.tackEdge ?? null,
      grainDirection: dto.grainDirection ?? 'short',
      rotationPolicy: dto.rotationPolicy ?? 'auto',
    };
    const existing = await this.prisma.impositionPreset.findFirst({
      where,
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) {
      // LRU 용도로 updatedAt 갱신 (동일 파라미터로 계속 쓰는 프리셋을 상단에 유지)
      return this.prisma.impositionPreset.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
    }
    return this.create({ ...dto, isDefault: false });
  }

  async update(id: string, dto: UpdatePresetDto) {
    const existing = await this.get(id);
    if (dto.isDefault) {
      await this.prisma.impositionPreset.updateMany({
        where: {
          bindingType: dto.bindingType ?? existing.bindingType,
          isDefault: true,
          NOT: { id },
        },
        data: { isDefault: false },
      });
    }
    return this.prisma.impositionPreset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bindingType !== undefined && { bindingType: dto.bindingType }),
        ...(dto.sheetWidth !== undefined && { sheetWidth: dto.sheetWidth }),
        ...(dto.sheetHeight !== undefined && { sheetHeight: dto.sheetHeight }),
        ...(dto.marginTop !== undefined && { marginTop: dto.marginTop }),
        ...(dto.marginRight !== undefined && { marginRight: dto.marginRight }),
        ...(dto.marginBottom !== undefined && { marginBottom: dto.marginBottom }),
        ...(dto.marginLeft !== undefined && { marginLeft: dto.marginLeft }),
        ...(dto.creaseWidth !== undefined && { creaseWidth: dto.creaseWidth }),
        ...(dto.tackMargin !== undefined && { tackMargin: dto.tackMargin }),
        ...(dto.tackEdge !== undefined && { tackEdge: dto.tackEdge }),
        ...(dto.gutter !== undefined && { gutter: dto.gutter }),
        ...(dto.bleed !== undefined && { bleed: dto.bleed }),
        ...(dto.grainDirection !== undefined && { grainDirection: dto.grainDirection }),
        ...(dto.rotationPolicy !== undefined && { rotationPolicy: dto.rotationPolicy }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
      },
    });
  }

  async delete(id: string) {
    await this.get(id);
    return this.prisma.impositionPreset.delete({ where: { id } });
  }
}
