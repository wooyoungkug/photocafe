import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  ImpositionCalcService,
  ImpositionInput,
} from '../services/imposition-calc.service';
import { ImpositionJdfService } from '../services/imposition-jdf.service';
import { ImpositionPdfService } from '../services/imposition-pdf.service';
import { ImpositionPresetService } from '../services/imposition-preset.service';
import { ImpositionRuleService } from '../services/imposition-rule.service';
import { ImpositionMatcherService } from '../services/imposition-matcher.service';
import { ImpositionImagePdfService } from '../services/imposition-image-pdf.service';
import { CalculateImpositionDto } from '../dto/calculate-imposition.dto';
import { CreatePresetDto, UpdatePresetDto } from '../dto/preset.dto';
import { RunImpositionDto } from '../dto/run-imposition.dto';
import {
  CreateRuleDto,
  UpdateRuleDto,
  MatchImpositionDto,
} from '../dto/rule.dto';
import { PrismaClient } from '@prisma/client';
import { seedImposition } from '../seed-imposition';

const IMPOSITION_OUTPUT_DIR = path.join(process.cwd(), 'uploads', 'imposition');

@ApiTags('imposition')
@Controller('imposition')
export class ImpositionController {
  constructor(
    private readonly calc: ImpositionCalcService,
    private readonly jdf: ImpositionJdfService,
    private readonly pdf: ImpositionPdfService,
    private readonly imagePdf: ImpositionImagePdfService,
    private readonly presets: ImpositionPresetService,
    private readonly rules: ImpositionRuleService,
    private readonly matcher: ImpositionMatcherService,
    private readonly prisma: PrismaService,
  ) {
    if (!fs.existsSync(IMPOSITION_OUTPUT_DIR)) {
      fs.mkdirSync(IMPOSITION_OUTPUT_DIR, { recursive: true });
    }
  }

  // ==================== Calculate (미저장 시뮬) ====================
  @Post('calculate')
  @ApiOperation({ summary: '임포지션 시뮬레이션 (미저장 프리뷰용)' })
  calculate(@Body() dto: CalculateImpositionDto) {
    const input: ImpositionInput = {
      productWidth: dto.productWidth,
      productHeight: dto.productHeight,
      pageCount: dto.pageCount,
      bindingType: dto.bindingType as any,
      sheetWidth: dto.sheetWidth,
      sheetHeight: dto.sheetHeight,
      marginTop: dto.marginTop,
      marginRight: dto.marginRight,
      marginBottom: dto.marginBottom,
      marginLeft: dto.marginLeft,
      bleed: dto.bleed,
      gutter: dto.gutter,
      creaseWidth: dto.creaseWidth,
      tackMargin: dto.tackMargin,
      tackEdge: dto.tackEdge as any,
      rotationPolicy: dto.rotationPolicy as any,
      grainDirection: dto.grainDirection as any,
      manualNup: dto.manualNup,
    };
    return this.calc.calculate(input);
  }

  // ==================== Presets ====================
  @Get('presets')
  listPresets(@Query('bindingType') bindingType?: string) {
    return this.presets.list(bindingType);
  }

  @Post('presets')
  createPreset(@Body() dto: CreatePresetDto) {
    return this.presets.create(dto);
  }

  @Post('presets/find-or-create')
  @ApiOperation({
    summary: '임시(_즉시_) 프리셋 find-or-create',
    description:
      '임포지션 실행 다이얼로그용. 동일 파라미터의 _즉시_ prefix 프리셋이 있으면 재사용, 없으면 생성. 프리셋 누적 방지.',
  })
  findOrCreatePreset(@Body() dto: CreatePresetDto) {
    return this.presets.findOrCreateTransient(dto);
  }

  @Patch('presets/:id')
  updatePreset(@Param('id') id: string, @Body() dto: UpdatePresetDto) {
    return this.presets.update(id, dto);
  }

  @Delete('presets/:id')
  deletePreset(@Param('id') id: string) {
    return this.presets.delete(id);
  }

  // ==================== Rules (매칭 규칙) ====================
  @Get('rules')
  @ApiOperation({ summary: '매칭 규칙 리스트 (priority desc)' })
  listRules() {
    return this.rules.list();
  }

  @Post('rules')
  @ApiOperation({ summary: '매칭 규칙 생성' })
  createRule(@Body() dto: CreateRuleDto) {
    return this.rules.create(dto);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: '매칭 규칙 수정' })
  updateRule(@Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '매칭 규칙 삭제' })
  deleteRule(@Param('id') id: string) {
    return this.rules.delete(id);
  }

  // ==================== Match (프리뷰) ====================
  @Post('match')
  @ApiOperation({ summary: '주문 특성 → 매칭 프리셋 조회' })
  async match(@Body() dto: MatchImpositionDto) {
    const result = await this.matcher.findPreset({
      productSize: dto.productSize ?? null,
      bindingType: (dto.bindingType as any) ?? null,
      pageCount: dto.pageCount ?? null,
    });
    if (!result) return { matched: false, preset: null, rule: null };
    return { matched: true, preset: result.preset, rule: result.rule };
  }

  // ==================== Seed (관리자 전용 재등록) ====================
  @Post('seed')
  @ApiOperation({ summary: '임포지션 프리셋+규칙 시드 재등록' })
  async seed() {
    const client = new PrismaClient();
    try {
      const count = await seedImposition(client);
      return { ok: true, count };
    } finally {
      await client.$disconnect();
    }
  }

  // ==================== Run: JDF+PDF 생성 ====================
  @Post('/orders/:orderId/items/:itemId/imposition')
  async run(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Body() dto: RunImpositionDto,
  ) {
    const preset = await this.presets.get(dto.presetId);
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: { include: { client: { select: { clientName: true } } } },
        files: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!item) throw new NotFoundException(`OrderItem ${itemId} not found`);
    if (item.orderId !== orderId) {
      throw new BadRequestException('orderId / itemId mismatch');
    }

    // product width/height 추출 (size 필드 "210x297" 가정)
    let { w, h } = parseSize(item.size);
    if (!w || !h) {
      throw new BadRequestException(`OrderItem.size 파싱 실패: ${item.size}`);
    }

    // 펼침면(spread) 주문에서 size가 스프레드 전체 규격으로 저장된 경우 보정.
    // 예: "24x15인치" (스프레드) → 실제 단면 12×15인치. w/h > 1.4 이면 가로가 세로보다
    // 40% 이상 크므로 스프레드 규격으로 판단하고 productWidth를 절반으로 사용한다.
    // "12×15인치"처럼 이미 단면 규격인 경우는 w < h 이므로 변환하지 않는다.
    const isSpread = item.pageLayout === 'spread';
    if (isSpread && w / h > 1.4) {
      w = w / 2;
    }

    const bindingType = mapBindingType(item.bindingType);

    const input: ImpositionInput = {
      productWidth: w,
      productHeight: h,
      pageCount: item.pages,
      bindingType,
      sheetWidth: Number(preset.sheetWidth),
      sheetHeight: Number(preset.sheetHeight),
      marginTop: Number(preset.marginTop),
      marginRight: Number(preset.marginRight),
      marginBottom: Number(preset.marginBottom),
      marginLeft: Number(preset.marginLeft),
      bleed: Number(preset.bleed),
      gutter: Number(preset.gutter),
      creaseWidth: preset.creaseWidth ? Number(preset.creaseWidth) : undefined,
      tackMargin: preset.tackMargin ? Number(preset.tackMargin) : undefined,
      tackEdge: preset.tackEdge as any,
      rotationPolicy: preset.rotationPolicy as any,
      grainDirection: preset.grainDirection as any,
      manualNup: dto.manualNup,
    };

    // 계산
    const result = this.calc.calculate(input);

    // 출력 경로
    const jobRecord = await this.prisma.impositionJob.create({
      data: {
        orderId,
        orderItemId: itemId,
        presetId: preset.id,
        pageCount: result.pageCount,
        sheetCount: result.sheetCount,
        nup: result.nup,
        rotation: result.rotation,
        utilization: result.utilization,
        layoutJson: result as any,
        status: 'pending',
      },
    });

    try {
      const base = `imposition_${jobRecord.id}`;
      const jdfPath = path.join(IMPOSITION_OUTPUT_DIR, `${base}.jdf`);
      const pdfPath = path.join(IMPOSITION_OUTPUT_DIR, `${base}.pdf`);

      const sourcePdfPath = dto.sourcePdfPath
        || (item.pdfPath ? path.isAbsolute(item.pdfPath) ? item.pdfPath : path.join(process.cwd(), item.pdfPath) : null);

      // JDF
      const jdfXml = this.jdf.build(result, {
        jobId: jobRecord.id,
        jobName: `${item.order.orderNumber}_${item.productName}`,
        sourcePdfFileName: sourcePdfPath ? path.basename(sourcePdfPath) : `${base}_source.pdf`,
        sourcePdfTotalPages: item.pages,
        bindingType,
      });
      fs.writeFileSync(jdfPath, jdfXml, 'utf-8');

      // 마크 옵션 (dto.marks 누락 시 전부 default=true 로 취급)
      const marks = dto.marks ?? {};
      const jobMetaText = marks.jobMeta !== false
        ? `${item.order.orderNumber} | ${item.order.client?.clientName ?? ''} | Job ${jobRecord.id.slice(0, 8)}`
        : null;

      // PDF (시뮬레이션 — 빈 박스 레이아웃)
      await this.pdf.build(result, {
        sourcePdfPath,
        outputPath: pdfPath,
        drawCropMarks: marks.crop !== false,
        drawBleedLines: marks.bleed !== false,
        drawRegistrationMarks: marks.registration !== false,
        drawColorBar: marks.colorBar !== false,
        drawFoldLines: marks.fold !== false,
        jobMetaText,
      });

      // 이미지 배치 인쇄용 PDF (OrderItem.files JPG 실제 배치)
      let imagePdfPath: string | undefined;
      if (dto.generateImagePdf !== false) {
        // 원본 파일 인덱스(1-based)를 그대로 pageNumber에 매핑해야
        // ImpositionCalcService가 할당한 Placement.pages 번호와 일치.
        // validFiles 필터 후 idx+1 재매핑은 누락 파일 발생 시 번호가 틀어짐.
        const allFiles = item.files ?? [];
        const images = allFiles
          .map((f, idx) => ({
            pageNumber: idx + 1,
            filePath: f.originalPath ?? '',
          }))
          .filter((e) => e.filePath && fs.existsSync(e.filePath));
        if (images.length > 0) {
          const imagePdfFilePath = path.join(IMPOSITION_OUTPUT_DIR, `${base}_image.pdf`);
          await this.imagePdf.build(result, {
            images,
            outputPath: imagePdfFilePath,
            drawCropMarks: marks.crop !== false,
            drawBleedLines: marks.bleed !== false,
            drawRegistrationMarks: marks.registration !== false,
            drawColorBar: marks.colorBar !== false,
            drawFoldLines: marks.fold !== false,
            jobMetaText,
            spreadImages: isSpread,
            bindingDirection: item.bindingDirection,
          });
          imagePdfPath = imagePdfFilePath;
        }
      }

      await this.prisma.impositionJob.update({
        where: { id: jobRecord.id },
        data: {
          status: 'done',
          jdfPath,
          pdfPath,
          imagePdfPath,
        },
      });

      return {
        ...jobRecord,
        status: 'done',
        jdfPath,
        pdfPath,
        imagePdfPath,
        warnings: result.warnings,
      };
    } catch (err: any) {
      await this.prisma.impositionJob.update({
        where: { id: jobRecord.id },
        data: { status: 'failed', error: err?.message || String(err) },
      });
      throw err;
    }
  }

  @Get('jobs/:jobId/jdf')
  async downloadJdf(@Param('jobId') jobId: string, @Res({ passthrough: true }) res: Response) {
    const job = await this.prisma.impositionJob.findUnique({ where: { id: jobId } });
    if (!job || !job.jdfPath) throw new NotFoundException('JDF not found');
    if (!fs.existsSync(job.jdfPath)) throw new NotFoundException('JDF file missing on disk');
    res.set({
      'Content-Type': 'application/vnd.cip4-jdf+xml',
      'Content-Disposition': `attachment; filename="imposition_${jobId}.jdf"`,
    });
    return new StreamableFile(fs.createReadStream(job.jdfPath));
  }

  @Get('jobs/:jobId/pdf')
  async downloadPdf(@Param('jobId') jobId: string, @Res({ passthrough: true }) res: Response) {
    const job = await this.prisma.impositionJob.findUnique({ where: { id: jobId } });
    if (!job || !job.pdfPath) throw new NotFoundException('PDF not found');
    if (!fs.existsSync(job.pdfPath)) throw new NotFoundException('PDF file missing on disk');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="imposition_${jobId}.pdf"`,
    });
    return new StreamableFile(fs.createReadStream(job.pdfPath));
  }

  @Get('jobs/:jobId/image-pdf')
  @ApiOperation({ summary: '이미지 배치 인쇄용 임포지션 PDF 다운로드' })
  async downloadImagePdf(@Param('jobId') jobId: string, @Res({ passthrough: true }) res: Response) {
    const job = await this.prisma.impositionJob.findUnique({ where: { id: jobId } });
    if (!job || !job.imagePdfPath) throw new NotFoundException('Image PDF not found');
    if (!fs.existsSync(job.imagePdfPath)) throw new NotFoundException('Image PDF file missing on disk');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="imposition_image_${jobId}.pdf"`,
    });
    return new StreamableFile(fs.createReadStream(job.imagePdfPath));
  }
}

function parseSize(size: string): { w: number; h: number } {
  if (!size) return { w: 0, h: 0 };
  // "210x297", "210*297", "210 x 297", "210mm x 297mm", "9×12인치", "7x5.5 inch"
  const m = size.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return { w: 0, h: 0 };
  let w = parseFloat(m[1]);
  let h = parseFloat(m[2]);
  // 단위 판별 우선순위:
  // 1) "인치"/"inch"/"in"/"\""/"″" 명시 → inch (×25.4)
  // 2) "cm"/"센치"/"센티" 명시 → cm (×10)
  // 3) 명시 없으면 두 값 모두 30 이하면 inch 로 추정 (앨범 표준이 인치)
  // 4) 그 외는 mm 로 처리
  if (/인치|inch|"|″|\bin\b/i.test(size)) {
    w *= 25.4;
    h *= 25.4;
  } else if (/cm|센치|센티/i.test(size)) {
    w *= 10;
    h *= 10;
  } else if (w <= 30 && h <= 30) {
    // 휴리스틱: 30mm 이하 앨범은 비현실적, 인치로 간주 (5x7, 6x8, 9x12 등)
    w *= 25.4;
    h *= 25.4;
  }
  return { w, h };
}

function mapBindingType(binding: string): 'compressed' | 'tack' | 'perfect' | 'flat' {
  if (!binding) return 'flat';
  const s = binding.toLowerCase();
  if (s.includes('압축') || s.includes('compressed')) return 'compressed';
  if (s.includes('타카') || s.includes('tack')) return 'tack';
  // 무선제본 = perfect bound = 화보앨범
  if (s.includes('무선') || s.includes('perfect') || s.includes('화보')) return 'perfect';
  return 'flat';
}
