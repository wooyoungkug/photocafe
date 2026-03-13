import { IsString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateLogenTrackingDto {
  @ApiProperty({ description: '주문 ID' })
  @IsString()
  orderId: string;
}

export class BulkGenerateLogenTrackingDto {
  @ApiProperty({ description: '주문 ID 목록', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  orderIds: string[];
}

/** 로젠택배 API 화물등록 데이터 (내부 사용) */
export interface LogenOrderData {
  custCd: string;
  takeDt: string;
  slipNo: string;
  fixTakeNo: string;
  sndCustNm: string;
  sndCustAddr: string;
  sndTelNo: string;
  sndCellNo?: string;
  rcvCustNm: string;
  rcvCustAddr: string;
  rcvTelNo: string;
  rcvCellNo?: string;
  fareTy: string;
  qty: number;
  dlvFare: number;
  goodsNm?: string;
  sndMsg?: string;
}

/** 로젠 API 공통 응답 */
export interface LogenApiResponse {
  sttsCd: 'SUCCESS' | 'PARTIAL SUCCESS' | 'FAIL';
  sttsMsg: string;
}

/** 송장번호 발급 응답 */
export interface LogenSlipNoResponse extends LogenApiResponse {
  data: { startSlipNo: string; closeSlipNo: string };
  data1: Array<{ slipNo: string; resultCd: string }>;
}

/** 화물등록 응답 */
export interface LogenRegisterResponse extends LogenApiResponse {
  data: Array<{ fixTakeNo: string; resultCd: string; resultMsg: string | null }>;
}

/** 배송조회 - 현황 */
export interface LogenTrackingData {
  slipNo?: string;
  rcvNm?: string;
  statusNm?: string;
  statusCd?: string;
  takeDt?: string;
  dlvDt?: string;
}

/** 배송조회 - 이력 1건 */
export interface LogenTrackingDetail {
  processDt?: string;   // "2026/03/10 14:30:00"
  regDt?: string;       // 필드명 대안
  statusNm?: string;
  statusCd?: string;
  location?: string;
  branchNm?: string;    // 필드명 대안
}

/** 배송조회 응답 */
export interface LogenTrackingResponse extends LogenApiResponse {
  data?: LogenTrackingData | LogenTrackingData[];
  data1?: LogenTrackingDetail[];
}
