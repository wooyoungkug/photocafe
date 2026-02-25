import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { COURIER_CODES, DELIVERY_METHOD_LABELS } from '../dto/delivery-pricing.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bwipjs = require('bwip-js');

// 한글 폰트 경로
const FONT_DIR = path.resolve(__dirname, '../../../../fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'NanumGothic.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'NanumGothicBold.ttf');

/** 라벨 포맷 타입 */
export type LabelFormat = 'a5' | 'thermal_100x150';

/** 포맷별 페이지 치수 (pt) */
const LABEL_DIMENSIONS: Record<LabelFormat, { width: number; height: number; margin: number }> = {
  a5: { width: 420, height: 595, margin: 15 },
  thermal_100x150: { width: 283, height: 425, margin: 8 },
};

@Injectable()
export class ShippingLabelService {
  private readonly logger = new Logger(ShippingLabelService.name);
  private fontsAvailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.fontsAvailable =
      fs.existsSync(FONT_REGULAR) && fs.existsSync(FONT_BOLD);
    if (!this.fontsAvailable) {
      this.logger.warn(
        `한글 폰트 파일을 찾을 수 없습니다. 경로: ${FONT_DIR} — 택배전표에 한글이 깨질 수 있습니다.`,
      );
    }
  }

  /**
   * 운송장 라벨 PDF 생성
   * - A5 사이즈로 택배사명, 바코드, 발송인/수령인 정보, 상품정보 포함
   * - 생성된 PDF 경로를 DB에 기록
   */
  async generateLabel(
    orderId: string,
    format: LabelFormat = 'a5',
  ): Promise<{ pdfPath: string; pdfUrl: string }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shipping: true,
        items: {
          select: { productName: true, quantity: true, folderName: true },
        },
        client: { select: { clientName: true, mobile: true } },
      },
    });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (!order.shipping) throw new NotFoundException('배송정보가 없습니다.');

    // 발송인 정보: OrderShipping에 저장된 값 우선, 없으면 회사 시스템설정 폴백
    let senderName = (order.shipping as any).senderName;
    let senderPhone = (order.shipping as any).senderPhone;
    let senderAddr = (order.shipping as any).senderAddress;
    const senderAddrDetail = (order.shipping as any).senderAddressDetail;

    if (!senderName) {
      const companyInfo = await this.prisma.systemSetting
        .findFirst({ where: { key: 'company' } })
        .catch(() => null);

      let company: any = null;
      if (companyInfo?.value) {
        try {
          company = JSON.parse(companyInfo.value);
        } catch {
          // ignore
        }
      }
      senderName = company?.companyName || '포토미';
      senderPhone = senderPhone || company?.phone || '';
      senderAddr = senderAddr || company?.address || '';
    }

    if (senderAddrDetail) {
      senderAddr = `${senderAddr || ''} ${senderAddrDetail}`.trim();
    }

    const uploadBase =
      this.config.get<string>('UPLOAD_BASE_PATH') || './uploads';
    const labelDir = path.join(uploadBase, 'labels');
    if (!fs.existsSync(labelDir)) fs.mkdirSync(labelDir, { recursive: true });

    const fileName = `label-${order.orderNumber}-${format}-${Date.now()}.pdf`;
    const filePath = path.join(labelDir, fileName);

    const renderParams = { filePath, order, senderName, senderPhone, senderAddr };
    if (format === 'thermal_100x150') {
      await this.renderThermalLabelPdf(renderParams);
    } else {
      await this.renderLabelPdf(renderParams);
    }

    const pdfUrl = `/uploads/labels/${fileName}`;

    // DB 업데이트: 라벨 PDF 경로 및 출력 시각
    await this.prisma.orderShipping.update({
      where: { orderId },
      data: { labelPdfPath: filePath, labelPrintedAt: new Date() },
    });

    this.logger.log(
      `Shipping label generated: ${order.orderNumber} -> ${filePath}`,
    );

    return { pdfPath: filePath, pdfUrl };
  }

  /** PDFKit 폰트 등록 헬퍼 */
  private registerFonts(doc: any) {
    if (this.fontsAvailable) {
      doc.registerFont('Korean', FONT_REGULAR);
      doc.registerFont('Korean-Bold', FONT_BOLD);
    }
  }

  /** 일반 폰트 적용 */
  private fontRegular(doc: any) {
    return this.fontsAvailable
      ? doc.font('Korean')
      : doc.font('Helvetica');
  }

  /** 볼드 폰트 적용 */
  private fontBold(doc: any) {
    return this.fontsAvailable
      ? doc.font('Korean-Bold')
      : doc.font('Helvetica-Bold');
  }

  /**
   * 운송장 라벨 PDF 렌더링
   * - A5 사이즈 (420x595pt)
   * - 나눔고딕 한글 폰트 사용
   * - 택배사명 헤더, 운송장 바코드, 발송인/수령인 정보, 상품/주문번호
   */
  private async renderLabelPdf({
    filePath,
    order,
    senderName,
    senderPhone,
    senderAddr,
  }: {
    filePath: string;
    order: any;
    senderName: string;
    senderPhone: string;
    senderAddr: string;
  }) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A5', margin: 15 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // 한글 폰트 등록
        this.registerFonts(doc);

        const shipping = order.shipping;
        const courierName =
          COURIER_CODES[shipping.courierCode] ||
          shipping.courierCode ||
          '택배';
        const deliveryMethod =
          (DELIVERY_METHOD_LABELS as Record<string, string>)[shipping.deliveryMethod] || '';
        const productName = order.items
          .map((i: any) => i.folderName || i.productName)
          .join(', ');

        // 헤더: 택배사명
        this.fontBold(doc).fontSize(18);
        doc.text(courierName, { align: 'center' });
        if (deliveryMethod && deliveryMethod !== '택배') {
          this.fontRegular(doc).fontSize(10);
          doc.text(`(${deliveryMethod})`, { align: 'center' });
        }
        doc.moveDown(0.3);

        // 바코드 (trackingNumber가 있으면 바코드 생성)
        if (shipping.trackingNumber) {
          try {
            const barcodeBuffer = await bwipjs.toBuffer({
              bcid: 'code128',
              text: shipping.trackingNumber.replace(/-/g, ''),
              scale: 2,
              height: 12,
              includetext: true,
              textxalign: 'center',
            });
            doc.image(barcodeBuffer, {
              fit: [380, 60],
              align: 'center' as any,
            });
          } catch (barcodeErr) {
            this.logger.warn(
              `Barcode generation failed: ${barcodeErr}. Falling back to text.`,
            );
            this.fontRegular(doc).fontSize(10);
            doc.text(`송장번호: ${shipping.trackingNumber}`, {
              align: 'center',
            });
          }
          doc.moveDown(0.3);
        }

        // 구분선
        doc
          .moveTo(15, doc.y)
          .lineTo(doc.page.width - 15, doc.y)
          .stroke();
        doc.moveDown(0.5);

        // 발송인 / 수령인 2단 레이아웃
        const colW = (doc.page.width - 30) / 2;
        const startY = doc.y;

        // 발송인 (좌측)
        this.fontRegular(doc).fontSize(8);
        doc.text('보내는 분', 15, startY, { width: colW });
        this.fontBold(doc).fontSize(11);
        doc.text(senderName, 15, doc.y, { width: colW });
        this.fontRegular(doc).fontSize(9);
        doc.text(senderAddr || '-', 15, doc.y, { width: colW });
        doc.text(senderPhone, 15, doc.y, { width: colW });

        const addrEndY = doc.y;

        // 수령인 (우측)
        const rightX = 15 + colW + 10;
        this.fontRegular(doc).fontSize(8);
        doc.text('받는 분', rightX, startY, { width: colW });
        this.fontBold(doc).fontSize(14);
        doc.text(shipping.recipientName, rightX, startY + 14, {
          width: colW,
        });
        this.fontRegular(doc).fontSize(9);
        doc.text(
          `[${shipping.postalCode}] ${shipping.address} ${shipping.addressDetail || ''}`,
          rightX,
          doc.y,
          { width: colW },
        );
        doc.text(shipping.phone, rightX, doc.y, { width: colW });

        doc.y = Math.max(addrEndY, doc.y) + 5;

        // 구분선
        doc
          .moveTo(15, doc.y)
          .lineTo(doc.page.width - 15, doc.y)
          .stroke();
        doc.moveDown(0.5);

        // 상품 정보
        this.fontRegular(doc).fontSize(9);
        doc.text(`상품: ${productName}`);
        doc.text(`주문번호: ${order.orderNumber}  바코드: ${order.barcode}`);

        // 취급주의 표시
        doc.moveDown(0.3);
        this.fontBold(doc).fontSize(11);
        doc.text('*** 취급주의 - 파손주의 ***', { align: 'center' });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 감열 라벨 PDF 렌더링 (100x150mm = 283x425pt)
   * - PS100 등 감열 라벨 프린터 전용
   * - 단일 컬럼 레이아웃 (100mm 폭)
   */
  private async renderThermalLabelPdf({
    filePath,
    order,
    senderName,
    senderPhone,
    senderAddr,
  }: {
    filePath: string;
    order: any;
    senderName: string;
    senderPhone: string;
    senderAddr: string;
  }) {
    const dims = LABEL_DIMENSIONS.thermal_100x150;
    return new Promise<void>(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [dims.width, dims.height],
          margin: dims.margin,
        });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        this.registerFonts(doc);

        const shipping = order.shipping;
        const m = dims.margin;
        const contentW = dims.width - m * 2;
        const courierName =
          COURIER_CODES[shipping.courierCode] ||
          shipping.courierCode ||
          '택배';
        const productName = order.items
          .map((i: any) => i.folderName || i.productName)
          .join(', ')
          .slice(0, 50);

        // 택배사명 헤더
        this.fontBold(doc).fontSize(14);
        doc.text(courierName, m, m, { width: contentW, align: 'center' });
        doc.moveDown(0.2);

        // 바코드
        if (shipping.trackingNumber) {
          try {
            const barcodeBuffer = await bwipjs.toBuffer({
              bcid: 'code128',
              text: shipping.trackingNumber.replace(/-/g, ''),
              scale: 1.5,
              height: 10,
              includetext: true,
              textxalign: 'center',
            });
            doc.image(barcodeBuffer, m, doc.y, {
              fit: [contentW, 40],
              align: 'center' as any,
            });
            doc.y += 42;
          } catch {
            this.fontRegular(doc).fontSize(9);
            doc.text(`송장: ${shipping.trackingNumber}`, { align: 'center' });
          }
        }

        // 구분선
        doc.moveTo(m, doc.y).lineTo(dims.width - m, doc.y).stroke();
        doc.moveDown(0.3);

        // 받는 분 (강조)
        this.fontRegular(doc).fontSize(8);
        doc.text('받는 분', m, doc.y, { width: contentW });
        this.fontBold(doc).fontSize(12);
        doc.text(shipping.recipientName || '-', m, doc.y, { width: contentW });
        this.fontRegular(doc).fontSize(8);
        doc.text(
          `[${shipping.postalCode || ''}] ${shipping.address || ''} ${shipping.addressDetail || ''}`.trim(),
          m, doc.y, { width: contentW },
        );
        doc.text(shipping.phone || '', m, doc.y, { width: contentW });

        // 구분선
        doc.moveDown(0.2);
        doc.moveTo(m, doc.y).lineTo(dims.width - m, doc.y).stroke();
        doc.moveDown(0.2);

        // 보내는 분 (소형)
        this.fontRegular(doc).fontSize(7);
        doc.text(`보내는 분: ${senderName}  ${senderPhone}`, m, doc.y, { width: contentW });
        doc.text(senderAddr || '-', m, doc.y, { width: contentW });

        // 구분선
        doc.moveDown(0.2);
        doc.moveTo(m, doc.y).lineTo(dims.width - m, doc.y).stroke();
        doc.moveDown(0.2);

        // 상품 / 주문번호
        this.fontRegular(doc).fontSize(7);
        doc.text(`상품: ${productName}`, m, doc.y, { width: contentW });
        doc.text(`주문: ${order.orderNumber}`, m, doc.y, { width: contentW });

        // 취급주의
        doc.moveDown(0.3);
        this.fontBold(doc).fontSize(9);
        doc.text('*** 취급주의 - 파손주의 ***', m, doc.y, {
          width: contentW,
          align: 'center',
        });

        doc.end();
        stream.on('finish', resolve);
        stream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 다건 운송장 PDF 일괄 생성
   * - 각 주문별 개별 PDF를 생성하고 URL 목록 반환
   */
  async generateBatchLabels(
    orderIds: string[],
    format: LabelFormat = 'a5',
  ): Promise<{ pdfUrls: string[] }> {
    const results: string[] = [];
    for (const orderId of orderIds) {
      try {
        const result = await this.generateLabel(orderId, format);
        results.push(result.pdfUrl);
      } catch (err) {
        this.logger.warn(
          `Failed to generate label for order ${orderId}: ${err}`,
        );
      }
    }
    return { pdfUrls: results };
  }

  /**
   * 기존 운송장 PDF 파일 경로 조회
   * - 이미 생성된 PDF가 있으면 파일 경로 반환
   * - 없으면 NotFoundException
   */
  async getLabelFile(orderId: string): Promise<string> {
    const shipping = await this.prisma.orderShipping.findUnique({
      where: { orderId },
    });
    if (!shipping?.labelPdfPath)
      throw new NotFoundException(
        '운송장 PDF가 없습니다. 먼저 생성해주세요.',
      );
    if (!fs.existsSync(shipping.labelPdfPath))
      throw new NotFoundException('운송장 파일을 찾을 수 없습니다.');
    return shipping.labelPdfPath;
  }
}
