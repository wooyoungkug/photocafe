import { IsString, IsOptional, IsEmail, IsIn, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 마이페이지: 사업자 회원 전환 신청 */
export class BusinessUpgradeRequestDto {
  @ApiProperty({ example: '123-45-67890', description: '사업자등록번호' })
  @IsString()
  @IsNotEmpty({ message: '사업자등록번호를 입력해주세요' })
  businessNumber: string;

  @ApiProperty({ example: '홍길동', description: '대표자명' })
  @IsString()
  @IsNotEmpty({ message: '대표자명을 입력해주세요' })
  representative: string;

  @ApiPropertyOptional({ example: '서비스업', description: '업태' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: '인쇄', description: '종목' })
  @IsOptional()
  @IsString()
  businessCategory?: string;

  @ApiPropertyOptional({ example: 'tax@example.com', description: '세금계산서 수신 이메일' })
  @IsOptional()
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다' })
  taxInvoiceEmail?: string;

  @ApiPropertyOptional({ example: '06000', description: '우편번호' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: '서울시 강남구 ...', description: '주소' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '101동 202호', description: '상세주소' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiProperty({ example: 'clients/abc/business-cert/123-file.pdf', description: '업로드된 사업자등록증 키 (POST /upload/business-cert 응답값)' })
  @IsString()
  @IsNotEmpty({ message: '사업자등록증 파일을 업로드해주세요' })
  certUploadKey: string;

  @ApiPropertyOptional({ example: '김철수', description: '실무담당자 이름' })
  @IsOptional()
  @IsString()
  practicalManagerName?: string;

  @ApiPropertyOptional({ example: '010-1234-5678', description: '실무담당자 연락처' })
  @IsOptional()
  @IsString()
  practicalManagerPhone?: string;

  @ApiPropertyOptional({ example: '이영희', description: '결재담당자 이름' })
  @IsOptional()
  @IsString()
  approvalManagerName?: string;

  @ApiPropertyOptional({ example: '010-9876-5432', description: '결재담당자 연락처' })
  @IsOptional()
  @IsString()
  approvalManagerPhone?: string;
}

/** 사업자등록증 OCR 자동 인식 요청 */
export class AnalyzeCertDto {
  @ApiProperty({
    example: 'clients/abc/business-cert/1715000000000-사업자등록증.pdf',
    description: 'B2 private 버킷에 이미 업로드된 사업자등록증 파일 키 (POST /upload/business-cert 응답의 uploadKey)',
  })
  @IsString()
  @IsNotEmpty({ message: '사업자등록증 파일을 먼저 업로드해주세요' })
  uploadKey: string;
}

/** 국세청 사업자 상태조회 요청 */
export class VerifyBusinessStatusDto {
  @ApiProperty({
    example: '123-45-67890',
    description: '사업자등록번호 (000-00-00000 또는 0000000000)',
  })
  @IsString()
  @IsNotEmpty({ message: '사업자등록번호를 입력해주세요' })
  businessNumber: string;
}

/** OCR 자동 인식 결과 */
export class AnalyzeCertResultDto {
  @ApiPropertyOptional({ example: '123-45-67890', description: '사업자등록번호 (000-00-00000)' })
  businessNumber?: string;

  @ApiPropertyOptional({ example: '홍길동', description: '대표자명' })
  representative?: string;

  @ApiPropertyOptional({ example: '서비스업', description: '업태' })
  businessType?: string;

  @ApiPropertyOptional({ example: '인쇄', description: '종목' })
  businessCategory?: string;

  @ApiPropertyOptional({ example: '06000', description: '우편번호' })
  postalCode?: string;

  @ApiPropertyOptional({ example: '서울특별시 강남구 ...', description: '사업장 소재지' })
  address?: string;

  @ApiPropertyOptional({ example: '주식회사 포토카페', description: '상호' })
  companyName?: string;

  @ApiPropertyOptional({ example: '2020-01-01', description: '개업연월일' })
  openDate?: string;

  @ApiProperty({ example: 0.92, description: '인식 신뢰도 (0~1)' })
  confidence: number;
}

/** 국세청 사업자 상태조회 결과 */
export class VerifyBusinessStatusResultDto {
  @ApiProperty({
    example: 'active',
    description: 'active=계속사업자 | suspended=휴업자 | closed=폐업자 | unknown=조회불가',
    enum: ['active', 'suspended', 'closed', 'unknown'],
  })
  status: 'active' | 'suspended' | 'closed' | 'unknown';

  @ApiProperty({ example: '계속사업자', description: '상태 한글 설명' })
  statusText: string;

  @ApiPropertyOptional({ example: '부가가치세 일반과세자', description: '과세유형' })
  taxType?: string;

  @ApiPropertyOptional({ example: '2024-03-31', description: '폐업일 (폐업자인 경우)' })
  endDate?: string;
}

/** 관리자: 사업자 회원 전환 신청 승인/반려 */
export class ProcessBusinessUpgradeDto {
  @ApiProperty({ example: 'approve', description: '처리 동작 (approve | reject)' })
  @IsString()
  @IsIn(['approve', 'reject'], { message: '유효하지 않은 동작입니다' })
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ example: '사업자등록증이 흐릿합니다', description: '반려 사유 (reject 시 필수)' })
  @IsOptional()
  @IsString()
  rejectReason?: string;
}
