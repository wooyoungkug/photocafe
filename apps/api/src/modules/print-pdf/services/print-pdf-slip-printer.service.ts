import { Injectable, Logger } from '@nestjs/common';
import { SystemSettingsService } from '../../system-settings/system-settings.service';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * PDF 변환 완료 시 작업지시서(슬립)를 프린터로 자동 출력.
 * - 활성화 키: print_pdf_auto_print_enabled (true/false)
 * - 프린터명 키: print_pdf_auto_print_name (비어있으면 Windows 기본 프린터)
 *
 * Windows 전제: PowerShell의 Out-Printer로 송출.
 * Linux/macOS: lp 명령을 호출 (프린터 드라이버 CUPS 사전 구성 필요).
 */
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
  printMethod?: string; // indigo | inkjet
}

@Injectable()
export class PrintPdfSlipPrinterService {
  private readonly logger = new Logger(PrintPdfSlipPrinterService.name);

  constructor(private readonly settings: SystemSettingsService) {}

  async printSlipIfEnabled(data: SlipData): Promise<void> {
    try {
      const enabled =
        (await this.settings.getValue('print_pdf_auto_print_enabled', 'false')) === 'true';
      if (!enabled) return;

      // 인디고/잉크젯별 프린터 분리: 개별 설정이 있으면 우선, 없으면 공통 프린터 사용
      const isInkjet = (data.printMethod || '').toLowerCase().includes('inkjet');
      const specificKey = isInkjet ? 'print_pdf_auto_print_name_inkjet' : 'print_pdf_auto_print_name_indigo';
      const specificPrinter = (await this.settings.getValue(specificKey, '')).trim();
      const commonPrinter = (await this.settings.getValue('print_pdf_auto_print_name', '')).trim();
      const printerName = specificPrinter || commonPrinter;

      const slipText = this.buildSlipText(data);
      const tempFile = path.join(os.tmpdir(), `pdf-slip-${Date.now()}.txt`);
      // UTF-8 BOM 포함 저장: PowerShell Get-Content -Encoding UTF8이 BOM 있는 파일을 가장 안정적으로 읽음
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.from(slipText, 'utf8');
      fs.writeFileSync(tempFile, Buffer.concat([bom, content]));

      if (process.platform === 'win32') {
        await this.printWindows(tempFile, printerName);
      } else {
        await this.printUnix(tempFile, printerName);
      }

      this.logger.log(`슬립 인쇄 완료: ${data.orderNumber} → ${printerName || '기본 프린터'}`);
    } catch (err: any) {
      this.logger.error(`슬립 인쇄 실패: ${err.message}`);
    }
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
    // UTF-8 BOM 파일을 PowerShell로 읽어 프린터로 송출
    // -Encoding UTF8 명시: Get-Content가 CP949(시스템 기본)로 읽어 한글이 깨지는 문제 방지
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
