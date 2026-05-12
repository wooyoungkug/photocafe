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
  contactPerson?: string;

  @ApiPropertyOptional({ example: '010-1234-5678', description: '실무담당자 연락처' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '이영희', description: '결재담당자 이름' })
  @IsOptional()
  @IsString()
  paymentContactName?: string;

  @ApiPropertyOptional({ example: '010-9876-5432', description: '결재담당자 연락처' })
  @IsOptional()
  @IsString()
  paymentContactPhone?: string;
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
