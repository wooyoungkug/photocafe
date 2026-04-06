import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateQuotationItemDto {
  @ApiProperty({ description: '품목명' })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({ description: '규격' })
  @IsOptional()
  @IsString()
  specification?: string;

  @ApiProperty({ description: '수량' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: '단가' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: '앨범 종류' })
  @IsOptional()
  @IsString()
  albumType?: string;

  @ApiPropertyOptional({ description: '압축앨범 세부 종류' })
  @IsOptional()
  @IsString()
  compressedType?: string;

  @ApiPropertyOptional({ description: '표지 종류' })
  @IsOptional()
  @IsString()
  coverType?: string;

  @ApiPropertyOptional({ description: '표지 재질' })
  @IsOptional()
  @IsString()
  coverMaterial?: string;

  @ApiPropertyOptional({ description: '표지 가격' })
  @IsOptional()
  @IsNumber()
  coverPrice?: number;

  @ApiPropertyOptional({ description: '출력 방식' })
  @IsOptional()
  @IsString()
  printMethod?: string;

  @ApiPropertyOptional({ description: '페이지 수' })
  @IsOptional()
  @IsInt()
  pages?: number;

  @ApiPropertyOptional({ description: '출력 가격' })
  @IsOptional()
  @IsNumber()
  printPrice?: number;

  @ApiPropertyOptional({ description: '속지 두께' })
  @IsOptional()
  @IsString()
  innerPageThickness?: string;

  @ApiPropertyOptional({ description: '제본 방식' })
  @IsOptional()
  @IsString()
  bindingType?: string;

  @ApiPropertyOptional({ description: '제본 가격' })
  @IsOptional()
  @IsNumber()
  bindingPrice?: number;

  @ApiPropertyOptional({ description: '용지 종류' })
  @IsOptional()
  @IsString()
  paperType?: string;

  @ApiPropertyOptional({ description: '도수' })
  @IsOptional()
  @IsString()
  colorType?: string;

  @ApiPropertyOptional({ description: '후가공' })
  @IsOptional()
  @IsString()
  finishing?: string;

  @ApiPropertyOptional({ description: '항목 메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '정렬 순서' })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '2차 카테고리 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '규격 ID' })
  @IsOptional()
  @IsString()
  specificationId?: string;

  @ApiPropertyOptional({ description: '양면/단면: double | single' })
  @IsOptional()
  @IsString()
  printSide?: string;
}

export class SendQuotationDto {
  @ApiProperty({ description: '발송 방법', enum: ['kakao', 'sms', 'email'] })
  @IsString()
  method: string;

  @ApiPropertyOptional({ description: '수신 전화번호' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiPropertyOptional({ description: '수신 이메일' })
  @IsOptional()
  @IsString()
  recipientEmail?: string;

  @ApiPropertyOptional({ description: '추가 메시지' })
  @IsOptional()
  @IsString()
  message?: string;
}

export class PriceLookupDto {
  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '그룹 ID (비회원 그룹단가 조회용)' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: '카테고리 ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: '규격 ID' })
  @IsOptional()
  @IsString()
  specificationId?: string;
}

export class CreateQuotationDto {
  @ApiProperty({ description: '견적 제목' })
  @IsString()
  title: string;

  @ApiProperty({ description: '견적 대분류', enum: ['offset_print', 'digital_print', 'album', 'digital_output', 'single_product'] })
  @IsString()
  quotationType: string;

  @ApiPropertyOptional({ description: '세부분류' })
  @IsOptional()
  @IsString()
  subType?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '비회원 고객명' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: '비회원 연락처' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ description: '비회원 이메일' })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({ description: '담당 직원 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '견적 유효기한' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '견적 항목', type: [CreateQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}

export class UpdateQuotationDto {
  @ApiPropertyOptional({ description: '견적 제목' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '견적 대분류' })
  @IsOptional()
  @IsString()
  quotationType?: string;

  @ApiPropertyOptional({ description: '세부분류' })
  @IsOptional()
  @IsString()
  subType?: string;

  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '비회원 고객명' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ description: '비회원 연락처' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ description: '비회원 이메일' })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({ description: '담당 직원 ID' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '상태' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '견적 유효기한' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({ description: '견적 항목', type: [CreateQuotationItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotationItemDto)
  items?: CreateQuotationItemDto[];
}

export class QuotationQueryDto {
  @ApiPropertyOptional({ description: '페이지' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @ApiPropertyOptional({ description: '페이지 크기' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;

  @ApiPropertyOptional({ description: '검색어' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: '상태 필터' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '견적 분류 필터' })
  @IsOptional()
  @IsString()
  quotationType?: string;

  @ApiPropertyOptional({ description: '거래처 ID 필터' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '담당 직원 ID 필터' })
  @IsOptional()
  @IsString()
  staffId?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
