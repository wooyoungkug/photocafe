// CIP4 JDF Product Intent 타입 정의

// ColorIntent - 색상 의도
export interface ColorIntent {
  id: string;
  code: string;
  name: string;
  numColorsFront: number;
  numColorsBack: number;
  colorType: string;
  colorantOrder: string[];
  coatingFront?: string;
  coatingBack?: string;
  colorStandard?: string;
  printingTechnology?: string;
  displayNameKo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateColorIntentInput {
  code: string;
  name: string;
  numColorsFront?: number;
  numColorsBack?: number;
  colorType?: string;
  colorantOrder?: string[];
  coatingFront?: string;
  coatingBack?: string;
  colorStandard?: string;
  printingTechnology?: string;
  displayNameKo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateColorIntentInput extends Partial<CreateColorIntentInput> {}

// BindingIntent - 제본 의도
export interface BindingIntent {
  id: string;
  code: string;
  name: string;
  jdfBindingType: string;
  jdfBindingSide: string;
  spineWidth?: number;
  displayNameKo?: string;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBindingIntentInput {
  code: string;
  name: string;
  jdfBindingType?: string;
  jdfBindingSide?: string;
  spineWidth?: number;
  displayNameKo?: string;
  basePrice?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateBindingIntentInput extends Partial<CreateBindingIntentInput> {}

// FoldingIntent - 접지 의도
export interface FoldingIntent {
  id: string;
  code: string;
  name: string;
  jdfFoldCatalog?: string;
  foldCount: number;
  displayNameKo?: string;
  basePrice: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFoldingIntentInput {
  code: string;
  name: string;
  jdfFoldCatalog?: string;
  foldCount?: number;
  displayNameKo?: string;
  basePrice?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFoldingIntentInput extends Partial<CreateFoldingIntentInput> {}

// ProofingIntent - 교정 의도
export interface ProofingIntent {
  id: string;
  code: string;
  name: string;
  jdfProofType?: string;
  isColorProof: boolean;
  isContractProof: boolean;
  displayNameKo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProofingIntentInput {
  code: string;
  name: string;
  jdfProofType?: string;
  isColorProof?: boolean;
  isContractProof?: boolean;
  displayNameKo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateProofingIntentInput extends Partial<CreateProofingIntentInput> {}

// FileSpec - 파일 규격
export interface FileSpec {
  id: string;
  code: string;
  name: string;
  mimeType: string;
  resolutionX: number;
  resolutionY: number;
  colorSpace: string;
  displayNameKo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFileSpecInput {
  code: string;
  name: string;
  mimeType?: string;
  resolutionX?: number;
  resolutionY?: number;
  colorSpace?: string;
  displayNameKo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFileSpecInput extends Partial<CreateFileSpecInput> {}

// QualityControl - 품질 기준
export interface QualityControl {
  id: string;
  code: string;
  name: string;
  deltaE?: number;
  colorTolerance?: string;
  trimTolerance?: number;
  displayNameKo?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQualityControlInput {
  code: string;
  name: string;
  deltaE?: number;
  colorTolerance?: string;
  trimTolerance?: number;
  displayNameKo?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateQualityControlInput extends Partial<CreateQualityControlInput> {}

// 전체 JDF Intent 응답 타입
export interface JdfIntentsResponse {
  colorIntents: ColorIntent[];
  bindingIntents: BindingIntent[];
  foldingIntents: FoldingIntent[];
  proofingIntents: ProofingIntent[];
  fileSpecs: FileSpec[];
  qualityControls: QualityControl[];
}

// JDF 제본 유형 상수
export const JDF_BINDING_TYPES = {
  SoftCover: '무선제본',
  HardCover: '양장제본',
  Saddle: '중철제본',
  Ring: '링제본',
  Wire: '와이어제본',
  Perfect: 'PUR제본',
} as const;

// JDF 색상 공간 상수
export const JDF_COLOR_SPACES = {
  CMYK: 'CMYK',
  sRGB: 'sRGB',
  AdobeRGB: 'AdobeRGB',
  DeviceCMYK: 'DeviceCMYK',
} as const;

// JDF 접지 카탈로그 상수
export const JDF_FOLD_CATALOGS = {
  'F2-1': '2단접지',
  'F4-1': '4단접지',
  'F6-1': '6단접지',
  Z: 'Z접지',
  Gate: '대문접지',
  Letter: '편지접지',
} as const;
