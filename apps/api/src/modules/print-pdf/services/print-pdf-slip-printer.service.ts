import { Injectable, Logger } from '@nestjs/common';
import { SystemSettingsService } from '../../system-settings/system-settings.service';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface SlipData {
  orderNumber: string;
  studioName: string;
  fileName: string;
  paper: string;
  spec: string;
  pages: number;
  colorMode: string;
  side: string;
  binding: string;
  nup: string;
  outputPath: string;
  printMethod?: string;
  orderItemId?: string;
}

// 1회용 인쇄 토큰 (120초 유효, Puppeteer에서 슬립 페이지 인증용)
const printTokenStore = new Map<string, { orderItemId: string; expires: number }>();

@Injectable()
export class PrintPdfSlipPrinterService {
  private readonly logger = new Logger(PrintPdfSlipPrinterService.name);

  constructor(private readonly settings: SystemSettingsService) {}

  generatePrintToken(orderItemId: string): string {
    const token = crypto.randomUUID();
    printTokenStore.set(token, { orderItemId, expires: Date.now() + 120_000 });
    return token;
  }

  validatePrintToken(token: string, orderItemId: string): boolean {
    const entry = printTokenStore.get(token);
    if (!entry || entry.orderItemId !== orderItemId || entry.expires < Date.now()) {
      return false;
    }
    printTokenStore.delete(token);
    return true;
  }

  async printSlipIfEnabled(data: SlipData): Promise<void> {
    // Railway(Linux)에서는 Windows 프린터 접근 불가 → 로컬 에이전트가 처리
    if (process.platform !== 'win32') {
      this.logger.log(`[슬립인쇄] Linux 환경 감지 - 로컬 에이전트가 슬립 인쇄를 처리합니다. 주문: ${data.orderNumber}`);
      return;
    }
    try {
      const enabledRaw = await this.settings.getValue('print_pdf_auto_print_enabled', 'false');
      this.logger.log(`[슬립인쇄] enabled=${enabledRaw}, platform=${process.platform}, order=${data.orderNumber}`);
      const enabled = enabledRaw === 'true';
      if (!enabled) {
        this.logger.warn(`[슬립인쇄] 비활성화 상태 - 설정에서 "자동 인쇄 사용"을 켜고 저장해주세요`);
        return;
      }

      const isInkjet = (data.printMethod || '').toLowerCase().includes('inkjet');
      const specificKey = isInkjet ? 'print_pdf_auto_print_name_inkjet' : 'print_pdf_auto_print_name_indigo';
      const specificPrinter = (await this.settings.getValue(specificKey, '')).trim();
      const commonPrinter = (await this.settings.getValue('print_pdf_auto_print_name', '')).trim();
      const printerName = specificPrinter || commonPrinter;
      this.logger.log(`[슬립인쇄] 프린터=${printerName || '(기본 프린터)'}, 잉크젯=${isInkjet}`);

      // Puppeteer 방식: orderItemId가 있고 Windows인 경우
      if (data.orderItemId && process.platform === 'win32') {
        await this.printWithPuppeteer(data.orderItemId, printerName);
      } else {
        // Fallback: 기존 텍스트 방식
        const slipText = this.buildSlipText(data);
        const tempFile = path.join(os.tmpdir(), `pdf-slip-${Date.now()}.txt`);
        const bom = Buffer.from([0xef, 0xbb, 0xbf]);
        const content = Buffer.from(slipText, 'utf8');
        fs.writeFileSync(tempFile, Buffer.concat([bom, content]));
        if (process.platform === 'win32') {
          await this.printWindows(tempFile, printerName);
        } else {
          await this.printUnix(tempFile, printerName);
        }
      }

      this.logger.log(`슬립 인쇄 완료: ${data.orderNumber} → ${printerName || '기본 프린터'}`);
    } catch (err: any) {
      this.logger.error(`슬립 인쇄 실패: ${err.message}`);
    }
  }

  private async printWithPuppeteer(orderItemId: string, printerName: string): Promise<void> {
    const puppeteer = await import('puppeteer-core');

    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      path.join('C:\\Users', os.userInfo().username, 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    const executablePath = chromePaths.find(p => fs.existsSync(p));
    if (!executablePath) {
      throw new Error('Chrome/Edge를 찾을 수 없습니다. Chrome 설치 여부를 확인해주세요.');
    }

    const token = this.generatePrintToken(orderItemId);
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3002').replace(/\/$/, '');
    const slipUrl = `${frontendUrl}/print-slip/${orderItemId}?printToken=${token}`;
    this.logger.log(`[Puppeteer] 슬립 렌더링: ${slipUrl}`);

    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123 }); // A4 px
      await page.goto(slipUrl, { waitUntil: 'networkidle0', timeout: 30_000 });
      // 썸네일 이미지 로딩 대기
      await new Promise(r => setTimeout(r, 2500));

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
      });

      const pdfFile = path.join(os.tmpdir(), `slip-${Date.now()}.pdf`);
      fs.writeFileSync(pdfFile, pdfBuffer);
      this.logger.log(`[Puppeteer] PDF 생성 완료: ${pdfFile}`);

      await this.printPdfWindows(pdfFile, printerName);
    } finally {
      await browser.close();
    }
  }

  private printPdfWindows(pdfFile: string, printerName: string): Promise<void> {
    const escaped = pdfFile.replace(/\\/g, '\\\\').replace(/'/g, "''");

    // SumatraPDF 우선 사용 (무음 인쇄 지원)
    const sumatraPaths = [
      'C:\\Program Files\\SumatraPDF\\SumatraPDF.exe',
      'C:\\Program Files (x86)\\SumatraPDF\\SumatraPDF.exe',
    ];
    const sumatraPath = sumatraPaths.find(p => fs.existsSync(p));

    let script: string;
    if (sumatraPath) {
      const printerArg = printerName ? `-print-to "${printerName}"` : '-print-to-default';
      script = `& "${sumatraPath}" -silent ${printerArg} "${pdfFile}"`;
    } else {
      // 기본 PDF 뷰어로 인쇄
      script = printerName
        ? `Start-Process -FilePath "${pdfFile}" -ArgumentList "/t","${printerName}" -Wait`
        : `Start-Process -FilePath "${pdfFile}" -Verb Print -Wait`;
    }

    return new Promise((resolve, reject) => {
      const ps = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stderr = '';
      ps.stderr.on('data', (d) => (stderr += d.toString()));
      ps.on('close', (code) => {
        try { fs.unlinkSync(pdfFile); } catch { /* ignore */ }
        if (code !== 0) {
          this.logger.warn(`PDF 인쇄 종료코드 ${code}: ${stderr.slice(0, 200)}`);
        }
        resolve();
      });
      ps.on('error', (err) => reject(err));
    });
  }

  private buildSlipText(d: SlipData): string {
    const ts = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    const line = '='.repeat(42);
    return [
      line,
      `  PDF 변환 작업 지시서`,
      line,
      `주문번호   : ${d.orderNumber}`,
      `스튜디오   : ${d.studioName}`,
      `파일명     : ${d.fileName}`,
      `규격       : ${d.spec}`,
      `용지       : ${d.paper}`,
      `페이지 수  : ${d.pages}p`,
      `출력방식   : ${d.printMethod === 'inkjet' ? '잉크젯' : '인디고'} ${d.colorMode}`,
      `양/단면    : ${d.side}`,
      `제본       : ${d.binding}`,
      `Nup        : ${d.nup}`,
      `저장경로   : ${d.outputPath}`,
      `생성시각   : ${ts}`,
      line,
      '',
    ].join('\n');
  }

  private printWindows(filePath: string, printerName: string): Promise<void> {
    const escapedPath = filePath.replace(/'/g, "''");
    const escapedPrinter = printerName.replace(/'/g, "''");
    const script = printerName
      ? `Get-Content -Path '${escapedPath}' -Encoding UTF8 | Out-Printer -Name '${escapedPrinter}'`
      : `Get-Content -Path '${escapedPath}' -Encoding UTF8 | Out-Printer`;

    return new Promise((resolve, reject) => {
      const ps = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stderr = '';
      ps.stderr.on('data', (d) => (stderr += d.toString()));
      ps.on('close', (code) => {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        if (code !== 0) {
          const msg = `PowerShell 인쇄 실패 (종료코드 ${code}): ${stderr.slice(0, 300)}`;
          this.logger.error(msg);
          reject(new Error(msg));
        } else {
          resolve();
        }
      });
      ps.on('error', (err) => {
        this.logger.error(`PowerShell 실행 불가: ${err.message}`);
        reject(err);
      });
    });
  }

  private printUnix(filePath: string, printerName: string): Promise<void> {
    return new Promise((resolve) => {
      const args = printerName ? ['-d', printerName, filePath] : [filePath];
      const lp = spawn('lp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      lp.on('close', () => {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        resolve();
      });
      lp.on('error', (err) => {
        this.logger.warn(`lp 인쇄 에러: ${err.message}`);
        resolve();
      });
    });
  }
}
