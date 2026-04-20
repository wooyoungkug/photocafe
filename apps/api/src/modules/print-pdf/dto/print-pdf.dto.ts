import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ==================== 인덱스 옵션 ====================
export class IndexOptionsDto {
  @ApiProperty({ description: '출력날짜+시간 표시', default: true })
  @IsBoolean()
  showDateTime: boolean = true;

  @ApiProperty({ description: '주문번호 표시', default: true })
  @IsBoolean()
  showOrderNumber: boolean = true;

  @ApiProperty({ description: '스튜디오명 표시', default: true })
  @IsBoolean()
  showStudioName: boolean = true;

  @ApiProperty({ description: '규격 표시', default: true })
  @IsBoolean()
  showSpec: boolean = true;

  @ApiProperty({ description: '용지명 표시', default: true })
  @IsBoolean()
  showPaper: boolean = true;

  @ApiProperty({ description: '페이지정보 표시 (현재/총)', default: true })
  @IsBoolean()
  showPageInfo: boolean = true;

  @ApiProperty({ description: '인디고도수 표시 (4도/6도)', default: true })
  @IsBoolean()
  showColorMode: boolean = true;

  @ApiProperty({ description: '제본방법 표시', default: true })
  @IsBoolean()
  showBinding: boolean = true;

  @ApiProperty({ description: '양면/단면 표시', default: true })
  @IsBoolean()
  showSide: boolean = true;

  @ApiProperty({ description: 'Nup 표시', default: true })
  @IsBoolean()
  showNup: boolean = true;
}

// ==================== PDF 생성 요청 ====================
export class GeneratePrintPdfDto {
  @ApiProperty({ description: '변환할 주문항목 ID 목록', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderItemIds: string[];

  @ApiPropertyOptional({ description: '커스텀 저장 경로' })
  @IsOptional()
  @IsString()
  outputPath?: string;

  @ApiProperty({ description: '인덱스 표기 옵션', type: IndexOptionsDto })
  @ValidateNested()
  @Type(() => IndexOptionsDto)
  indexOptions: IndexOptionsDto;

  @ApiProperty({ description: '재단여백 포함 여부', default: true })
  @IsBoolean()
  includeBleed: boolean = true;

  @ApiProperty({ description: '재단선(Crop Mark) 표시 여부', default: true })
  @IsBoolean()
  includeCropMarks: boolean = true;

  @ApiProperty({ description: '칼라 컨트롤 바(돔보바) 표시 여부', default: false })
  @IsBoolean()
  @IsOptional()
  includeColorBar: boolean = false;

  @ApiPropertyOptional({ description: 'Nup 수동 지정 (예: "2up", "4up")' })
  @IsOptional()
  @IsString()
  nupOverride?: string;

  @ApiPropertyOptional({ description: '인덱스 항목 출력 순서 (key 배열)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  indexOrderKeys?: string[];

  @ApiPropertyOptional({ description: '인덱스 위치 (top: 상단 바깥, bottom: 하단 바깥)', default: 'bottom' })
  @IsOptional()
  @IsString()
  indexPosition?: 'top' | 'bottom';

  @ApiPropertyOptional({ description: '캔버스(용지) 너비 (mm) - 설정 시 출력물을 용지 중앙에 배치' })
  @IsOptional()
  canvasWidthMm?: number;

  @ApiPropertyOptional({ description: '캔버스(용지) 높이 (mm)' })
  @IsOptional()
  canvasHeightMm?: number;

  @ApiPropertyOptional({ description: '이미지(출력) 너비 (mm) - 설정 시 이미지를 지정 크기로 배치' })
  @IsOptional()
  imageWidthMm?: number;

  @ApiPropertyOptional({ description: '이미지(출력) 높이 (mm)' })
  @IsOptional()
  imageHeightMm?: number;
}

// ==================== 대기열 조회 쿼리 ====================
export class PrintQueueQueryDto {
  @ApiPropertyOptional({ description: '날짜 시작 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: '날짜 끝 (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: '스튜디오명 검색' })
  @IsOptional()
  @IsString()
  studioName?: string;

  @ApiPropertyOptional({ description: '규격 필터' })
  @IsOptional()
  @IsString()
  spec?: string;

  @ApiPropertyOptional({ description: '용지 필터' })
  @IsOptional()
  @IsString()
  paper?: string;

  @ApiPropertyOptional({ description: '긴급만', default: false })
  @IsOptional()
  @IsBoolean()
  urgentOnly?: boolean;

  @ApiPropertyOptional({ description: '페이지 번호', default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기', default: 50 })
  @IsOptional()
  limit?: number;
}

// ==================== Job 상태 ====================
export const PDF_JOB_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type PdfJobStatus = (typeof PDF_JOB_STATUS)[keyof typeof PDF_JOB_STATUS];

export interface PdfJobProgress {
  jobId: string;
  status: PdfJobStatus;
  totalItems: number;
  completedItems: number;
  /** 전체 페이지 수 (세밀 진행률) */
  totalPages?: number;
  /** 처리된 페이지 수 */
  processedPages?: number;
  currentItem?: string;
  results: Array<{
    orderItemId: string;
    orderNumber: string;
    studioName: string;
    status: 'completed' | 'failed' | 'pending' | 'in_progress';
    pdfPath?: string;
    error?: string;
    /** 다운로드 시 사용할 파일명 */
    fileName?: string;
    /** 하위폴더 분리용 구분(양면/단면) */
    side?: string;
    /** 하위폴더 분리용 인디고 도수 (예: 4도, 6도) */
    colorMode?: string;
  }>;
  createdAt: Date;
}
