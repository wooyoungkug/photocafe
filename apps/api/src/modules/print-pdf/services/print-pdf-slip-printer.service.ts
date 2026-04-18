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

      const printerName = (await this.settings.getValue('print_pdf_auto_print_name', '')).trim();

      const slipText = this.buildSlipText(data);
      const tempFile = path.join(os.tmpdir(), `pdf-slip-${Date.now()}.txt`);
      fs.writeFileSync(tempFile, slipText, { encoding: 'utf8' });

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
      `인디고도수 : ${d.colorMode}`,
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
    // PowerShell의 Out-Printer 로 텍스트 송출
    const escapedPath = filePath.replace(/'/g, "''");
    const script = printerName
      ? `Get-Content -Path '${escapedPath}' | Out-Printer -Name '${printerName.replace(/'/g, "''")}'`
      : `Get-Content -Path '${escapedPath}' | Out-Printer`;

    return new Promise((resolve) => {
      const ps = spawn('powershell.exe', ['-NoProfile', '-Command', script], {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      let stderr = '';
      ps.stderr.on('data', (d) => (stderr += d.toString()));
      ps.on('close', (code) => {
        // 임시파일 정리
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
        if (code !== 0) {
          this.logger.warn(`PowerShell 인쇄 종료코드 ${code}: ${stderr.slice(0, 300)}`);
        }
        resolve();
      });
      ps.on('error', (err) => {
        this.logger.warn(`PowerShell 인쇄 에러: ${err.message}`);
        resolve();
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
