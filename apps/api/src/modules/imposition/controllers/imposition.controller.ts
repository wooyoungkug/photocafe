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
import { SystemSettingsService } from '../../system-settings/system-settings.service';
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
    private readonly settings: SystemSettingsService,
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
      // bleed: 다이얼로그(시스템 설정값)에서 전달된 preset.bleed 를 단일 출처로 사용.
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
      // 인디고 도수 (예: 4도, 6도) — colorIntentId 우선, 없으면 printMethod 폴백
      const colorMode = await this.resolveColorMode(item);
      const sideText = String(item.printSide || '').toLowerCase() === 'double' ? '양면' : '단면';
      const nupText = `${result.nup}up`;
      const jobMetaText = marks.jobMeta !== false
        ? this.buildRichJobMetaText({
            orderNumber: item.order.orderNumber,
            studio: item.order.client?.clientName ?? '',
            paper: item.paper,
            size: item.size,
            pages: item.pages,
            colorMode,
            sideText,
            nupText,
            bindingType: item.bindingType,
          })
        : null;

      // 소스 PDF 기반 정식 PDF — 명시적으로 dto.generateSourcePdf === true 일 때만.
      // 기본은 이미지 기반 PDF(_image) 만 생성하여 1개 출력 유지.
      const hasSource = !!(sourcePdfPath && fs.existsSync(sourcePdfPath));
      const wantSourcePdf = dto.generateSourcePdf === true && hasSource;
      if (wantSourcePdf) {
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
      }

      // 이미지 배치 인쇄용 PDF (OrderItem.files JPG 실제 배치)
      // 기본 생성: 소스 PDF 누락 시에도 JPG 원본으로 정식 PDF 출력 가능.
      let imagePdfPath: string | undefined;
      if (dto.generateImagePdf !== false) {
        // 원본 파일 인덱스(1-based)를 그대로 pageNumber에 매핑해야
        // ImpositionCalcService가 할당한 Placement.pages 번호와 일치.
        // validFiles 필터 후 idx+1 재매핑은 누락 파일 발생 시 번호가 틀어짐.
        // 또한 originalPath 가 빠져있더라도 fileUrl(/uploads/...) 로 폴백해야
        // 첫 파일 누락으로 album 페이지 1~2 가 통째로 사라지는 사고를 막을 수 있다.
        // (print-pdf 의 파일 해석 흐름과 동일.)
        const uploadBase = process.env.UPLOAD_BASE_PATH || path.join(process.cwd(), 'uploads');
        const resolveLocalPath = (f: any): string => {
          // 1) originalPath 가 디스크에 있으면 그대로 사용
          if (f.originalPath && fs.existsSync(f.originalPath)) return f.originalPath;
          // 2) fileUrl 이 /uploads/... 형식이면 UPLOAD_BASE_PATH 기준 매핑
          const url: string | undefined = f.fileUrl;
          if (url && (url.startsWith('/uploads/') || url.startsWith('uploads/'))) {
            const rel = url.replace(/^\/?uploads\/?/, '');
            const candidates = new Set<string>([path.join(uploadBase, rel)]);
            try {
              candidates.add(path.join(uploadBase, decodeURIComponent(rel)));
            } catch { /* malformed URI 는 무시 */ }
            for (const c of candidates) {
              if (fs.existsSync(c)) return c;
            }
          }
          return '';
        };
        const allFiles = (item.files ?? []).slice().sort(
          (a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        );
        const images = allFiles
          .map((f: any, idx: number) => ({
            pageNumber: idx + 1,
            filePath: resolveLocalPath(f),
            fileName: f.fileName,
          }))
          .filter((e: any) => !!e.filePath);
        // 누락된 파일이 있으면 경고에 명시 → 사일런트 드랍 방지
        const missingIdx: number[] = [];
        allFiles.forEach((f: any, idx: number) => {
          if (!resolveLocalPath(f)) missingIdx.push(idx + 1);
        });
        if (missingIdx.length > 0) {
          (result.warnings as any[]).push(
            `원본 파일 누락: 파일 #${missingIdx.join(', #')} 의 디스크 경로를 찾을 수 없어 해당 페이지가 출력에서 제외되었습니다.`,
          );
        }
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

      // 무인 자동저장 — print_pdf_output_path 가 설정돼 있으면 동일 폴더 구조로 사본 저장
      // 폴더: {outputPath}/{YYMMDD}/인디고/{도수}/{양면|단면}/
      // 파일명: print-pdf 와 동일한 규칙 사용. 사용자 다운로드 폴더 오염을 막고
      // 출력팀이 한 곳에서 모든 PDF 를 모아 볼 수 있게 한다.
      const autoSavePath = (await this.settings.getValue('print_pdf_output_path', '')).trim();
      let autoSavedPath: string | null = null;
      let autoSavedJdfPath: string | null = null;
      let autoSavedSourcePdfPath: string | null = null;
      if (autoSavePath && imagePdfPath && fs.existsSync(imagePdfPath)) {
        try {
          const dir = this.resolveImpositionAutoSaveDir(autoSavePath, {
            colorMode,
            sideText,
            printMethod: item.printMethod,
          });
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const fileName = this.buildImpositionFileName(item, {
            colorMode,
            sideText,
            nupText,
          });
          autoSavedPath = path.join(dir, fileName);
          fs.copyFileSync(imagePdfPath, autoSavedPath);
          // JDF 도 함께 보관 (출력기/검수용)
          if (fs.existsSync(jdfPath)) {
            autoSavedJdfPath = path.join(dir, fileName.replace(/\.pdf$/i, '.jdf'));
            fs.copyFileSync(jdfPath, autoSavedJdfPath);
          }
          if (wantSourcePdf && fs.existsSync(pdfPath)) {
            autoSavedSourcePdfPath = path.join(dir, fileName.replace(/\.pdf$/i, '_imposed.pdf'));
            fs.copyFileSync(pdfPath, autoSavedSourcePdfPath);
          }
        } catch (copyErr: any) {
          // 자동저장 실패는 작업 자체를 실패시키지 않음 — 다운로드 경로는 살아있음
          // 단, 응답에 alert 가능하도록 경고 추가
          (result.warnings as any[]).push(`자동 저장 실패: ${copyErr.message}`);
          autoSavedPath = null;
          autoSavedJdfPath = null;
          autoSavedSourcePdfPath = null;
        }
      }

      await this.prisma.impositionJob.update({
        where: { id: jobRecord.id },
        data: {
          status: 'done',
          jdfPath,
          pdfPath: wantSourcePdf ? pdfPath : null,
          imagePdfPath,
        },
      });

      return {
        ...jobRecord,
        status: 'done',
        jdfPath,
        pdfPath: wantSourcePdf ? pdfPath : null,
        imagePdfPath,
        warnings: result.warnings,
        autoSaved: !!autoSavedPath,
        autoSavedPath,
        autoSavedJdfPath,
        autoSavedSourcePdfPath,
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

  @Get('jobs/batch-zip')
  @ApiOperation({ summary: '여러 임포지션 작업의 jdf/pdf/imagePdf 를 ZIP 으로 일괄 다운로드' })
  async downloadBatchZip(@Query('ids') ids: string, @Res() res: Response) {
    if (!ids) throw new BadRequestException('ids 쿼리 파라미터 필수 (콤마 구분)');
    const jobIds = ids.split(',').map((s) => s.trim()).filter(Boolean);
    if (jobIds.length === 0) throw new BadRequestException('유효한 job id 가 없습니다');

    const jobs = await this.prisma.impositionJob.findMany({
      where: { id: { in: jobIds } },
    });
    if (jobs.length === 0) throw new NotFoundException('해당 작업을 찾을 수 없습니다');

    // 폴더명용 productionNumber 별도 조회
    const itemIds = jobs.map((j) => j.orderItemId).filter((v): v is string => !!v);
    const items = itemIds.length > 0
      ? await this.prisma.orderItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, productionNumber: true },
        })
      : [];
    const itemNumberById = new Map(items.map((it) => [it.id, it.productionNumber]));

    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 1 } });
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="imposition_batch_${ts}.zip"`,
    });
    archive.pipe(res);

    for (const job of jobs) {
      const prodNum = (job.orderItemId && itemNumberById.get(job.orderItemId)) || job.id.slice(0, 8);
      const safeName = prodNum.replace(/[\\/:*?"<>|]/g, '_');
      if (job.jdfPath && fs.existsSync(job.jdfPath)) {
        archive.file(job.jdfPath, { name: `${safeName}/imposition_${job.id}.jdf` });
      }
      if (job.pdfPath && fs.existsSync(job.pdfPath)) {
        archive.file(job.pdfPath, { name: `${safeName}/imposition_${job.id}.pdf` });
      }
      if (job.imagePdfPath && fs.existsSync(job.imagePdfPath)) {
        archive.file(job.imagePdfPath, { name: `${safeName}/imposition_image_${job.id}.pdf` });
      }
    }

    await archive.finalize();
  }

  // ==================== 자동저장 / 메타텍스트 헬퍼 ====================

  private async resolveColorMode(item: any): Promise<string> {
    if (item.colorIntentId) {
      const colorIntent = await this.prisma.colorIntent.findUnique({
        where: { id: item.colorIntentId },
      });
      if (colorIntent) {
        return (colorIntent as any).displayNameKo || colorIntent.name || '-';
      }
    }
    if (item.printMethod) {
      const m = String(item.printMethod).toLowerCase();
      if (m.includes('inkjet')) return '잉크젯';
      if (m.includes('indigo')) return '인디고';
    }
    return '-';
  }

  /**
   * 인디고 출력 머리말 메타텍스트.
   * print-pdf 의 IndexData 와 동일한 정보 구성:
   *   날짜시간 | 주문번호 | 스튜디오 | 용지 | 제본 | 양/단면 | P | 규격 | 도수 | Nup
   */
  private buildRichJobMetaText(ctx: {
    orderNumber: string;
    studio: string;
    paper?: string | null;
    size?: string | null;
    pages?: number | null;
    colorMode?: string | null;
    sideText: string;
    nupText: string;
    bindingType?: string | null;
  }): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const parts: string[] = [dt, ctx.orderNumber];
    if (ctx.studio) parts.push(ctx.studio);
    if (ctx.paper) parts.push(ctx.paper);
    if (ctx.bindingType) parts.push(ctx.bindingType);
    if (ctx.sideText) parts.push(ctx.sideText);
    if (ctx.pages) parts.push(`${ctx.pages}P`);
    if (ctx.size) parts.push(ctx.size);
    if (ctx.colorMode && ctx.colorMode !== '-') parts.push(ctx.colorMode);
    parts.push(ctx.nupText);
    return parts.join(' | ');
  }

  /**
   * 자동저장 폴더 결정 (print-pdf 와 동일 규칙):
   *   인디고: {base}/{YYMMDD}/인디고/{도수}/{양면|단면}/
   *   잉크젯: {base}/{YYMMDD}/잉크젯/
   */
  private resolveImpositionAutoSaveDir(
    base: string,
    ctx: { colorMode?: string; sideText: string; printMethod?: string | null },
  ): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;
    const sanitize = (s: string) => (s || '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || '_';
    const isInkjet = String(ctx.printMethod || '').toLowerCase().includes('inkjet');
    if (isInkjet) {
      return path.join(base, datePart, '잉크젯');
    }
    const colorSeg = ctx.colorMode && ctx.colorMode !== '-' ? sanitize(ctx.colorMode) : '4도';
    return path.join(base, datePart, '인디고', colorSeg, ctx.sideText || '단면');
  }

  /**
   * 자동저장 파일명: {주문번호}_{스튜디오}_{도수}_{양면|단면}_{제본}_{Nup}_imposed.pdf
   */
  private buildImpositionFileName(
    item: any,
    ctx: { colorMode?: string; sideText: string; nupText: string },
  ): string {
    const orderNumber = item?.order?.orderNumber || 'order';
    const studio = item?.order?.client?.clientName || '';
    const binding = item?.bindingType || '';
    const parts: string[] = [orderNumber];
    if (studio) parts.push(studio);
    if (ctx.colorMode && ctx.colorMode !== '-') parts.push(ctx.colorMode);
    parts.push(ctx.sideText);
    if (binding && binding !== '-') parts.push(binding);
    parts.push(ctx.nupText);
    parts.push('imposed');
    const raw = parts.join('_') + '.pdf';
    return raw.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, ' ').trim();
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
