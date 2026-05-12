import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { B2StorageService } from '@/modules/upload/services/b2-storage.service';
import type {
  AnalyzeCertResultDto,
  VerifyBusinessStatusResultDto,
} from '../dto';

/** CLOVA OCR 응답의 필드 1개 */
interface ClovaField {
  inferText?: string;
  inferConfidence?: number;
  confidence?: number;
  boundingPoly?: { vertices?: Array<{ x: number; y: number }> };
}

interface ClovaImage {
  inferResult?: string;
  message?: string;
  fields?: ClovaField[];
}

interface ClovaResponse {
  images?: ClovaImage[];
}

interface NtsStatusItem {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
  end_dt?: string;
  utcc_yn?: string;
  rbf_tax_type?: string;
}

interface NtsResponse {
  status_code?: string;
  request_cnt?: number;
  match_cnt?: number;
  data?: NtsStatusItem[];
}

@Injectable()
export class BusinessCertOcrService {
  private readonly logger = new Logger(BusinessCertOcrService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly b2Storage: B2StorageService,
  ) {}

  private getEnv(key: string): string {
    const v = this.config.get<string>(key);
    return v && String(v).trim() ? String(v).trim() : '';
  }

  // ==================== A. 사업자등록증 OCR ====================

  async analyzeCert(uploadKey: string): Promise<AnalyzeCertResultDto> {
    const secretKey = this.getEnv('NAVER_OCR_SECRET_KEY');
    const invokeUrl = this.getEnv('NAVER_OCR_INVOKE_URL');
    if (!secretKey || !invokeUrl) {
      throw new ServiceUnavailableException('OCR 서비스가 설정되지 않았습니다');
    }
    if (!this.b2Storage.isEnabled()) {
      throw new ServiceUnavailableException('파일 스토리지가 설정되지 않았습니다');
    }
    if (!uploadKey || !uploadKey.trim()) {
      throw new BadRequestException('업로드된 파일 키가 필요합니다');
    }

    // 1) presigned URL (5분)
    let presignedUrl: string;
    try {
      presignedUrl = await this.b2Storage.getPrivatePresignedUrl(uploadKey, 300);
    } catch (e: any) {
      this.logger.warn(`사업자등록증 presigned URL 생성 실패 (${uploadKey}): ${e?.message}`);
      throw new InternalServerErrorException('업로드된 사업자등록증을 찾을 수 없습니다');
    }

    const format = this.detectFormat(uploadKey);

    // 2) CLOVA OCR 호출
    let body: ClovaResponse;
    try {
      const res = await fetch(invokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OCR-SECRET': secretKey,
        },
        body: JSON.stringify({
          version: 'V2',
          requestId: randomUUID(),
          timestamp: Date.now(),
          lang: 'ko',
          images: [{ format, name: 'cert', url: presignedUrl }],
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        this.logger.warn(`CLOVA OCR HTTP ${res.status}: ${txt.slice(0, 500)}`);
        throw new InternalServerErrorException('사업자등록증 인식 중 오류가 발생했습니다');
      }
      body = (await res.json()) as ClovaResponse;
    } catch (e: any) {
      if (e instanceof InternalServerErrorException) throw e;
      this.logger.error(`CLOVA OCR 호출 실패: ${e?.message}`);
      throw new InternalServerErrorException('OCR 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요');
    }

    const image = body.images?.[0];
    if (!image || image.inferResult !== 'SUCCESS') {
      this.logger.warn(`CLOVA OCR inferResult=${image?.inferResult} message=${image?.message}`);
      throw new InternalServerErrorException('사업자등록증 이미지를 인식하지 못했습니다. 더 선명한 파일로 다시 시도해주세요');
    }

    const fields = image.fields ?? [];
    if (fields.length === 0) {
      throw new InternalServerErrorException('사업자등록증에서 텍스트를 찾지 못했습니다');
    }

    return this.parseFields(fields);
  }

  private detectFormat(key: string): 'jpg' | 'png' | 'pdf' | 'tiff' {
    const lower = key.toLowerCase();
    if (lower.endsWith('.png')) return 'png';
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'tiff';
    return 'jpg'; // jpg/jpeg 및 기타
  }

  /**
   * CLOVA OCR fields[] 를 순서대로 합쳐 라인 텍스트를 만든 뒤
   * 키워드 기반으로 사업자등록증 필드를 추출한다.
   */
  private parseFields(fields: ClovaField[]): AnalyzeCertResultDto {
    const confidences = fields
      .map((f) => f.inferConfidence ?? f.confidence)
      .filter((v): v is number => typeof v === 'number');
    const avgConfidence =
      confidences.length > 0
        ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100) / 100
        : 0;

    // OCR 토큰들을 줄 단위로 재구성: boundingPoly y좌표가 비슷하면 같은 줄로 본다.
    const tokens = fields
      .map((f) => ({
        text: (f.inferText ?? '').trim(),
        y: this.midY(f),
      }))
      .filter((t) => t.text.length > 0);

    const lines = this.buildLines(tokens);
    const fullText = tokens.map((t) => t.text).join(' ');

    const result: AnalyzeCertResultDto = { confidence: avgConfidence };

    // 사업자등록번호: 000-00-00000 (하이픈 유무 무관)
    const bnoMatch =
      fullText.match(/(\d{3})\s*[-‐－]?\s*(\d{2})\s*[-‐－]?\s*(\d{5})/);
    if (bnoMatch) {
      result.businessNumber = `${bnoMatch[1]}-${bnoMatch[2]}-${bnoMatch[3]}`;
    }

    // 라인 단위 키워드 추출
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 상호 / 법인명
      if (!result.companyName) {
        const m = line.match(/(?:상\s*호|법\s*인\s*명)\s*(?:\(단체명\))?\s*[:：]?\s*(.+)$/);
        if (m && m[1].trim()) result.companyName = this.cleanValue(m[1]);
      }

      // 대표자 / 성명
      if (!result.representative) {
        const m = line.match(/(?:대\s*표\s*자|성\s*명)\s*(?:\(.*?\))?\s*[:：]?\s*([가-힣]{2,10})/);
        if (m && m[1].trim()) result.representative = m[1].trim();
      }

      // 개업연월일
      if (!result.openDate) {
        const m = line.match(/개\s*업\s*(?:연|년)?\s*월?\s*일?\s*[:：]?\s*(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})/);
        if (m) {
          result.openDate = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
        }
      }

      // 업태
      if (!result.businessType) {
        const m = line.match(/업\s*태\s*[:：]?\s*([^\s종].*?)(?=\s*종\s*목|$)/);
        if (m && m[1].trim()) result.businessType = this.cleanValue(m[1]);
      }

      // 종목
      if (!result.businessCategory) {
        const m = line.match(/종\s*목\s*[:：]?\s*(.+)$/);
        if (m && m[1].trim()) result.businessCategory = this.cleanValue(m[1]);
      }

      // 사업장 소재지 / 소재지 (다음 줄까지 이어질 수 있음)
      if (!result.address) {
        const m = line.match(/(?:사업장\s*소재지|사업장\s*주소|소\s*재\s*지)\s*[:：]?\s*(.+)$/);
        if (m && m[1].trim()) {
          let addr = this.cleanValue(m[1]);
          // 다음 줄이 주소 연속(키워드 없음 + 한글 포함)이면 이어붙임
          const next = lines[i + 1];
          if (next && !this.looksLikeKeywordLine(next) && /[가-힣]/.test(next) && addr.length < 60) {
            addr = `${addr} ${this.cleanValue(next)}`.trim();
          }
          result.address = addr;
        }
      }
    }

    // 우편번호: 5자리(신주소) 또는 6자리(구주소) — 주소 라인 근처에서 우선 추출
    if (!result.postalCode) {
      const pcMatch = fullText.match(/\((\d{5})\)/) || fullText.match(/\b(\d{5})\b(?=.{0,40}(?:[시도]|구|동|로|길))/);
      if (pcMatch) result.postalCode = pcMatch[1];
    }

    return result;
  }

  private midY(f: ClovaField): number {
    const v = f.boundingPoly?.vertices;
    if (!v || v.length === 0) return 0;
    const ys = v.map((p) => p.y ?? 0);
    return (Math.min(...ys) + Math.max(...ys)) / 2;
  }

  /** y좌표가 비슷한 토큰을 한 줄로 묶는다. (좌표 없으면 입력 순서대로 단일 라인) */
  private buildLines(tokens: Array<{ text: string; y: number }>): string[] {
    const hasCoords = tokens.some((t) => t.y > 0);
    if (!hasCoords) {
      return [tokens.map((t) => t.text).join(' ')];
    }
    const sorted = [...tokens].sort((a, b) => a.y - b.y);
    const lines: string[][] = [];
    const threshold = 12; // px
    let currentY = -Infinity;
    for (const t of sorted) {
      if (Math.abs(t.y - currentY) > threshold || lines.length === 0) {
        lines.push([t.text]);
        currentY = t.y;
      } else {
        lines[lines.length - 1].push(t.text);
      }
    }
    return lines.map((arr) => arr.join(' '));
  }

  private looksLikeKeywordLine(line: string): boolean {
    return /상\s*호|법\s*인\s*명|대\s*표\s*자|성\s*명|업\s*태|종\s*목|개\s*업|등\s*록\s*번\s*호|소\s*재\s*지|사업장/.test(line);
  }

  /** 값 앞뒤 잡음(콜론, 괄호 라벨, 과도한 공백) 정리 */
  private cleanValue(raw: string): string {
    return raw
      .replace(/^[\s:：()（）\-]+/, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/[\s.]+$/, '')
      .trim();
  }

  // ==================== B. 국세청 사업자 상태조회 ====================

  async verifyStatus(businessNumberRaw: string): Promise<VerifyBusinessStatusResultDto> {
    const apiKey = this.getEnv('NTS_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException('국세청 연동이 설정되지 않았습니다');
    }

    const bNo = (businessNumberRaw || '').replace(/[^0-9]/g, '');
    if (bNo.length !== 10) {
      throw new BadRequestException('사업자등록번호는 10자리 숫자여야 합니다');
    }

    const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(apiKey)}`;

    let body: NtsResponse;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ b_no: [bNo] }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        this.logger.warn(`국세청 사업자 상태조회 HTTP ${res.status}: ${txt.slice(0, 500)}`);
        if (res.status === 401 || res.status === 403) {
          throw new ServiceUnavailableException('국세청 API 인증키가 올바르지 않습니다. 관리자에게 문의하세요');
        }
        throw new InternalServerErrorException('국세청 사업자 상태조회 중 오류가 발생했습니다');
      }
      body = (await res.json()) as NtsResponse;
    } catch (e: any) {
      if (e instanceof ServiceUnavailableException || e instanceof InternalServerErrorException) throw e;
      this.logger.error(`국세청 사업자 상태조회 호출 실패: ${e?.message}`);
      throw new InternalServerErrorException('국세청 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요');
    }

    if (body.status_code !== 'OK') {
      this.logger.warn(`국세청 응답 status_code=${body.status_code}`);
      throw new InternalServerErrorException('국세청 사업자 상태조회에 실패했습니다');
    }

    const item = body.data?.[0];
    if (!item || !item.b_stt_cd) {
      return { status: 'unknown', statusText: '조회불가' };
    }

    const result: VerifyBusinessStatusResultDto = (() => {
      switch (item.b_stt_cd) {
        case '01':
          return { status: 'active' as const, statusText: item.b_stt || '계속사업자' };
        case '02':
          return { status: 'suspended' as const, statusText: item.b_stt || '휴업자' };
        case '03':
          return { status: 'closed' as const, statusText: item.b_stt || '폐업자' };
        default:
          return { status: 'unknown' as const, statusText: item.b_stt || '조회불가' };
      }
    })();

    if (item.tax_type && item.tax_type.trim()) {
      result.taxType = item.tax_type.trim();
    }
    if (item.end_dt && /^\d{8}$/.test(item.end_dt)) {
      result.endDate = `${item.end_dt.slice(0, 4)}-${item.end_dt.slice(4, 6)}-${item.end_dt.slice(6, 8)}`;
    } else if (item.end_dt && item.end_dt.trim()) {
      result.endDate = item.end_dt.trim();
    }

    return result;
  }
}
