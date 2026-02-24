import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { COURIER_CODES } from '../dto/delivery-pricing.dto';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bwipjs = require('bwip-js');

@Injectable()
export class ShippingLabelService {
  private readonly logger = new Logger(ShippingLabelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 운송장 라벨 PDF 생성
   * - A5 사이즈로 택배사명, 바코드, 발송인/수령인 정보, 상품정보 포함
   * - 생성된 PDF 경로를 DB에 기록
   */
  async generateLabel(
    orderId: string,
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

    // 발송인 정보 (회사 시스템설정에서)
    const companyInfo = await this.prisma.systemSetting
      .findFirst({ where: { key: 'company' } })
      .catch(() => null);

    let company: any = null;
    if (companyInfo?.value) {
      try {
        company = JSON.parse(companyInfo.value);
      } catch {
        // JSON 파싱 실패 시 무시
      }
    }

    const uploadBase =
      this.config.get<string>('UPLOAD_BASE_PATH') || './uploads';
    const labelDir = path.join(uploadBase, 'labels');
    if (!fs.existsSync(labelDir)) fs.mkdirSync(labelDir, { recursive: true });

    const fileName = `label-${order.orderNumber}-${Date.now()}.pdf`;
    const filePath = path.join(labelDir, fileName);

    await this.renderLabelPdf({
      filePath,
      order,
      company,
    });

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

  /**
   * 운송장 라벨 PDF 렌더링
   * - A5 사이즈 (420x595pt)
   * - 택배사명 헤더, 운송장 바코드, 발송인/수령인 정보, 상품/주문번호
   */
  private async renderLabelPdf({
    filePath,
    order,
    company,
  }: {
    filePath: string;
    order: any;
    company: any;
  }) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A5', margin: 15 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        const shipping = order.shipping;
        const courierName =
          COURIER_CODES[shipping.courierCode] ||
          shipping.courierCode ||
          'Parcel';
        const productName = order.items
          .map((i: any) => i.folderName || i.productName)
          .join(', ');
        const senderName = company?.companyName || 'Photomi';
        const senderPhone = company?.phone || '';
        const senderAddr = company?.address || '';

        // 헤더: 택배사명
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text(courierName, { align: 'center' });
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
            doc
              .fontSize(10)
              .font('Helvetica')
              .text(`Tracking: ${shipping.trackingNumber}`, {
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
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('FROM', 15, startY, { width: colW });
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(senderName, 15, doc.y, { width: colW });
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(senderAddr || '-', 15, doc.y, { width: colW });
        doc.text(senderPhone, 15, doc.y, { width: colW });

        const addrEndY = doc.y;

        // 수령인 (우측)
        const rightX = 15 + colW + 10;
        doc
          .fontSize(8)
          .font('Helvetica')
          .text('TO', rightX, startY, { width: colW });
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .text(shipping.recipientName, rightX, startY + 14, { width: colW });
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(
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
        doc.fontSize(9).font('Helvetica').text(`Product: ${productName}`);
        doc.text(
          `Order: ${order.orderNumber}  Barcode: ${order.barcode}`,
        );

        // 취급주의 표시
        doc.moveDown(0.3);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .text('FRAGILE - HANDLE WITH CARE', { align: 'center' });

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
  ): Promise<{ pdfUrls: string[] }> {
    const results: string[] = [];
    for (const orderId of orderIds) {
      try {
        const result = await this.generateLabel(orderId);
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
