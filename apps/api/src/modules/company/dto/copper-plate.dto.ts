import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// 박 컬러 타입
export enum FoilColor {
  GOLD = 'gold',           // 금박
  SILVER = 'silver',       // 은박
  HOLOGRAM = 'hologram',   // 홀로그램
  BLACK = 'black',         // 먹박
  ROSEGOLD = 'rosegold',   // 로즈골드
  CUSTOM = 'custom',       // 기타
}

// 박 위치 타입
export enum FoilPosition {
  CENTER = 'center',              // 정중앙
  TOP_CENTER = 'top_center',      // 중상
  RIGHT_CENTER = 'right_center',  // 우중
  RIGHT_BOTTOM = 'right_bottom',  // 우하
  BOTTOM_CENTER = 'bottom_center', // 중하
  LEFT_BOTTOM = 'left_bottom',    // 좌하
  LEFT_CENTER = 'left_center',    // 좌중
  TOP_LEFT = 'top_left',          // 좌상
  TOP_RIGHT = 'top_right',        // 우상
}

// 동판 타입
export enum PlateType {
  COPPER = 'copper',   // 동판
  SOFT = 'soft',       // 연판
}

// 동판 상태
export enum CopperPlateStatus {
  STORED = 'stored',       // 보관중
  IN_USE = 'in_use',       // 사용중
  RETURNED = 'returned',   // 반환
  DISPOSED = 'disposed',   // 폐기
}

// 이력 타입
export enum CopperPlateActionType {
  REGISTERED = 'registered',           // 등록
  USED = 'used',                       // 사용
  LOCATION_CHANGED = 'location_changed', // 위치변경
  RETURNED = 'returned',               // 반환
  DISPOSED = 'disposed',               // 폐기
  NOTE_ADDED = 'note_added',           // 메모추가
  STATUS_CHANGED = 'status_changed',   // 상태변경
}

export const FOIL_COLOR_LABELS: Record<FoilColor, string> = {
  [FoilColor.GOLD]: '금박',
  [FoilColor.SILVER]: '은박',
  [FoilColor.HOLOGRAM]: '홀로그램',
  [FoilColor.BLACK]: '먹박',
  [FoilColor.ROSEGOLD]: '로즈골드',
  [FoilColor.CUSTOM]: '기타',
};

export const FOIL_POSITION_LABELS: Record<FoilPosition, string> = {
  [FoilPosition.CENTER]: '정중앙',
  [FoilPosition.TOP_CENTER]: '중상',
  [FoilPosition.RIGHT_CENTER]: '우중',
  [FoilPosition.RIGHT_BOTTOM]: '우하',
  [FoilPosition.BOTTOM_CENTER]: '중하',
  [FoilPosition.LEFT_BOTTOM]: '좌하',
  [FoilPosition.LEFT_CENTER]: '좌중',
  [FoilPosition.TOP_LEFT]: '좌상',
  [FoilPosition.TOP_RIGHT]: '우상',
};

export const PLATE_TYPE_LABELS: Record<PlateType, string> = {
  [PlateType.COPPER]: '동판',
  [PlateType.SOFT]: '연판',
};

export const COPPER_PLATE_STATUS_LABELS: Record<CopperPlateStatus, string> = {
  [CopperPlateStatus.STORED]: '보관중',
  [CopperPlateStatus.IN_USE]: '사용중',
  [CopperPlateStatus.RETURNED]: '반환',
  [CopperPlateStatus.DISPOSED]: '폐기',
};

// 동판 생성 DTO
export class CreateCopperPlateDto {
  @ApiProperty({ description: '회원 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '동판명' })
  @IsString()
  plateName: string;

  @ApiPropertyOptional({ description: '동판 코드' })
  @IsString()
  @IsOptional()
  plateCode?: string;

  @ApiPropertyOptional({ description: '동판 타입 (copper/soft)', enum: PlateType, default: PlateType.COPPER })
  @IsEnum(PlateType)
  @IsOptional()
  plateType?: PlateType;

  @ApiProperty({ description: '박 컬러', enum: FoilColor })
  @IsEnum(FoilColor)
  foilColor: FoilColor;

  @ApiPropertyOptional({ description: '커스텀 박 컬러명' })
  @IsString()
  @IsOptional()
  foilColorName?: string;

  @ApiPropertyOptional({ description: '박 위치', enum: FoilPosition })
  @IsEnum(FoilPosition)
  @IsOptional()
  foilPosition?: FoilPosition;

  @ApiPropertyOptional({ description: '가로 (mm)' })
  @IsNumber()
  @IsOptional()
  widthMm?: number;

  @ApiPropertyOptional({ description: '세로 (mm)' })
  @IsNumber()
  @IsOptional()
  heightMm?: number;

  @ApiPropertyOptional({ description: '보관 위치' })
  @IsString()
  @IsOptional()
  storageLocation?: string;

  @ApiPropertyOptional({ description: '동판 이미지 URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'AI 파일 URL' })
  @IsString()
  @IsOptional()
  aiFileUrl?: string;

  @ApiPropertyOptional({ description: '원본 디자인 파일 URL' })
  @IsString()
  @IsOptional()
  designFileUrl?: string;

  @ApiPropertyOptional({ description: '적용 앨범명' })
  @IsString()
  @IsOptional()
  appliedAlbumName?: string;

  @ApiPropertyOptional({ description: '적용된 앨범 사진 URL' })
  @IsString()
  @IsOptional()
  albumPhotoUrl?: string;

  @ApiPropertyOptional({ description: '비고' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: '등록 담당자 ID' })
  @IsString()
  @IsOptional()
  registeredById?: string;

  @ApiPropertyOptional({ description: '등록 담당자명' })
  @IsString()
  @IsOptional()
  registeredBy?: string;

  @ApiPropertyOptional({ description: '동판 등록일' })
  @IsDateString()
  @IsOptional()
  registeredAt?: string;
}

// 동판 수정 DTO
export class UpdateCopperPlateDto {
  @ApiPropertyOptional({ description: '동판명' })
  @IsString()
  @IsOptional()
  plateName?: string;

  @ApiPropertyOptional({ description: '동판 코드' })
  @IsString()
  @IsOptional()
  plateCode?: string;

  @ApiPropertyOptional({ description: '동판 타입 (copper/soft)', enum: PlateType })
  @IsEnum(PlateType)
  @IsOptional()
  plateType?: PlateType;

  @ApiPropertyOptional({ description: '박 컬러', enum: FoilColor })
  @IsEnum(FoilColor)
  @IsOptional()
  foilColor?: FoilColor;

  @ApiPropertyOptional({ description: '커스텀 박 컬러명' })
  @IsString()
  @IsOptional()
  foilColorName?: string;

  @ApiPropertyOptional({ description: '박 위치', enum: FoilPosition })
  @IsEnum(FoilPosition)
  @IsOptional()
  foilPosition?: FoilPosition;

  @ApiPropertyOptional({ description: '가로 (mm)' })
  @IsNumber()
  @IsOptional()
  widthMm?: number;

  @ApiPropertyOptional({ description: '세로 (mm)' })
  @IsNumber()
  @IsOptional()
  heightMm?: number;

  @ApiPropertyOptional({ description: '보관 위치' })
  @IsString()
  @IsOptional()
  storageLocation?: string;

  @ApiPropertyOptional({ description: '동판 이미지 URL' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'AI 파일 URL' })
  @IsString()
  @IsOptional()
  aiFileUrl?: string;

  @ApiPropertyOptional({ description: '원본 디자인 파일 URL' })
  @IsString()
  @IsOptional()
  designFileUrl?: string;

  @ApiPropertyOptional({ description: '적용 앨범명' })
  @IsString()
  @IsOptional()
  appliedAlbumName?: string;

  @ApiPropertyOptional({ description: '적용된 앨범 사진 URL' })
  @IsString()
  @IsOptional()
  albumPhotoUrl?: string;

  @ApiPropertyOptional({ description: '비고' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: '상태', enum: CopperPlateStatus })
  @IsEnum(CopperPlateStatus)
  @IsOptional()
  status?: CopperPlateStatus;

  @ApiPropertyOptional({ description: '동판 등록일' })
  @IsDateString()
  @IsOptional()
  registeredAt?: string;

  @ApiPropertyOptional({ description: '최초 사용일' })
  @IsDateString()
  @IsOptional()
  firstUsedAt?: string;

  @ApiPropertyOptional({ description: '반환일' })
  @IsDateString()
  @IsOptional()
  returnedAt?: string;
}

// 동판 사용 기록 DTO
export class RecordCopperPlateUsageDto {
  @ApiPropertyOptional({ description: '관련 주문 ID' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ description: '관련 주문번호' })
  @IsString()
  @IsOptional()
  orderNumber?: string;

  @ApiPropertyOptional({ description: '상세 내용' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '작업자 ID' })
  @IsString()
  @IsOptional()
  actionById?: string;

  @ApiPropertyOptional({ description: '작업자명' })
  @IsString()
  @IsOptional()
  actionBy?: string;
}

// 동판 위치 변경 DTO
export class ChangeCopperPlateLocationDto {
  @ApiProperty({ description: '새 보관 위치' })
  @IsString()
  newLocation: string;

  @ApiPropertyOptional({ description: '작업자 ID' })
  @IsString()
  @IsOptional()
  actionById?: string;

  @ApiPropertyOptional({ description: '작업자명' })
  @IsString()
  @IsOptional()
  actionBy?: string;
}

// 동판 상태 변경 DTO
export class ChangeCopperPlateStatusDto {
  @ApiProperty({ description: '새 상태', enum: CopperPlateStatus })
  @IsEnum(CopperPlateStatus)
  newStatus: CopperPlateStatus;

  @ApiPropertyOptional({ description: '상세 내용' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '작업자 ID' })
  @IsString()
  @IsOptional()
  actionById?: string;

  @ApiPropertyOptional({ description: '작업자명' })
  @IsString()
  @IsOptional()
  actionBy?: string;
}
