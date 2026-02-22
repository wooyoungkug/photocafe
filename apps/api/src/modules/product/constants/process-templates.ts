/**
 * 상품별 공정 프로세스 템플릿 상수 정의
 *
 * 각 상품 유형(productType)에 대한 공정 흐름을 하드코딩으로 정의합니다.
 * DB ProcessTemplate 테이블의 시딩 원본이자, 런타임에서도 참조되는 상수입니다.
 */

// 상품 유형 코드
export const PRODUCT_TYPES = {
  COMPRESSED_ALBUM: 'compressed_album',
  PICTORIAL_ALBUM: 'pictorial_album',
  ORIGINAL_COMPRESSED: 'original_compressed',
  PHOTOBOOK: 'photobook',
  ACRYLIC_FRAME: 'acrylic_frame',
  DOUBLE_MAT_FRAME: 'double_mat_frame',
  COPPER_PLATE: 'copper_plate',
  SINGLE_PRINT: 'single_print',
} as const;

export type ProductType = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

// 상품 유형 라벨
export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  compressed_album: '압축앨범',
  pictorial_album: '화보앨범 (스타화보)',
  original_compressed: '원판압축',
  photobook: '포토북',
  acrylic_frame: '아크릴액자',
  double_mat_frame: '더블마트액자',
  copper_plate: '동판',
  single_print: '단품출력',
};

// 공정 단계 코드
export const PROCESS_STEP_CODES = {
  ORDER_RECEIPT: 'order_receipt',
  FILE_CORRECTION: 'file_correction',
  DESIGN_REVIEW: 'design_review',
  INDIGO_PRINT: 'indigo_print',
  INKJET_PRINT: 'inkjet_print',
  COATING: 'coating',
  CUTTING: 'cutting',
  COMPRESSED_BINDING: 'compressed_binding',
  HARDCOVER_BINDING: 'hardcover_binding',
  SOFTCOVER_BINDING: 'softcover_binding',
  COVER_MAKING: 'cover_making',
  ACRYLIC_PROCESSING: 'acrylic_processing',
  WOOD_FRAME_ASSEMBLY: 'wood_frame_assembly',
  ASSEMBLY: 'assembly',
  LASER_ENGRAVING: 'laser_engraving',
  PACKAGING: 'packaging',
  QC: 'qc',
  SHIPPING: 'shipping',
} as const;

export type ProcessStepCode =
  (typeof PROCESS_STEP_CODES)[keyof typeof PROCESS_STEP_CODES];

// 공정 단계 라벨
export const PROCESS_STEP_LABELS: Record<ProcessStepCode, string> = {
  order_receipt: '수주',
  file_correction: '파일보정',
  design_review: '도안확인',
  indigo_print: '인디고출력',
  inkjet_print: '잉크젯출력',
  coating: '코팅',
  cutting: '재단',
  compressed_binding: '압축제본',
  hardcover_binding: '양장제본',
  softcover_binding: '무선제본',
  cover_making: '커버제작',
  acrylic_processing: '아크릴가공',
  wood_frame_assembly: '원목프레임조립',
  assembly: '조립',
  laser_engraving: '레이저각인',
  packaging: '포장',
  qc: 'QC',
  shipping: '출하',
};

// stepCode → 기존 PROCESS_STATUS 매핑 (호환성)
export const STEP_TO_PROCESS_STATUS: Record<ProcessStepCode, string> = {
  order_receipt: 'receipt_pending',
  file_correction: 'receipt_pending',
  design_review: 'receipt_pending',
  indigo_print: 'post_processing',
  inkjet_print: 'post_processing',
  coating: 'post_processing',
  cutting: 'post_processing',
  compressed_binding: 'binding',
  hardcover_binding: 'binding',
  softcover_binding: 'binding',
  cover_making: 'binding',
  acrylic_processing: 'post_processing',
  wood_frame_assembly: 'post_processing',
  assembly: 'post_processing',
  laser_engraving: 'post_processing',
  packaging: 'inspection',
  qc: 'inspection',
  shipping: 'completed',
};

// 공정 템플릿 단계 타입
export interface ProcessTemplateStep {
  stepOrder: number;
  stepCode: ProcessStepCode;
  stepName: string;
  stepNameEn?: string;
  department?: string;
  estimatedHours?: number;
  isCheckpoint?: boolean;
  description?: string;
}

// 상품별 공정 프로세스 매핑
export const PRODUCT_PROCESS_TEMPLATES: Record<
  ProductType,
  ProcessTemplateStep[]
> = {
  // 압축앨범: 수주→파일보정→인디고출력→코팅→재단→압축제본→QC→출하
  compressed_album: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'indigo_print',
      stepName: '인디고출력',
      stepNameEn: 'Indigo Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'coating',
      stepName: '코팅',
      stepNameEn: 'Coating',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 6,
      stepCode: 'compressed_binding',
      stepName: '압축제본',
      stepNameEn: 'Compressed Binding',
      department: 'PROD',
    },
    {
      stepOrder: 7,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 8,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 화보앨범(스타화보): 수주→파일보정→인디고출력→코팅→재단→양장제본→커버제작→QC→출하
  pictorial_album: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'indigo_print',
      stepName: '인디고출력',
      stepNameEn: 'Indigo Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'coating',
      stepName: '코팅',
      stepNameEn: 'Coating',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 6,
      stepCode: 'hardcover_binding',
      stepName: '양장제본',
      stepNameEn: 'Hardcover Binding',
      department: 'PROD',
    },
    {
      stepOrder: 7,
      stepCode: 'cover_making',
      stepName: '커버제작',
      stepNameEn: 'Cover Making',
      department: 'PROD',
    },
    {
      stepOrder: 8,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 9,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 원판압축: 압축앨범과 동일 공정
  original_compressed: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'indigo_print',
      stepName: '인디고출력',
      stepNameEn: 'Indigo Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'coating',
      stepName: '코팅',
      stepNameEn: 'Coating',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 6,
      stepCode: 'compressed_binding',
      stepName: '압축제본',
      stepNameEn: 'Compressed Binding',
      department: 'PROD',
    },
    {
      stepOrder: 7,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 8,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 포토북: 수주→파일보정→인디고출력→코팅→재단→양장제본→QC→출하
  photobook: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'indigo_print',
      stepName: '인디고출력',
      stepNameEn: 'Indigo Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'coating',
      stepName: '코팅',
      stepNameEn: 'Coating',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 6,
      stepCode: 'hardcover_binding',
      stepName: '양장제본',
      stepNameEn: 'Hardcover Binding',
      department: 'PROD',
    },
    {
      stepOrder: 7,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 8,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 아크릴액자: 수주→파일보정→잉크젯출력→재단→아크릴가공→조립→포장→QC→출하
  acrylic_frame: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'inkjet_print',
      stepName: '잉크젯출력',
      stepNameEn: 'Inkjet Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'acrylic_processing',
      stepName: '아크릴가공',
      stepNameEn: 'Acrylic Processing',
      department: 'PROD',
    },
    {
      stepOrder: 6,
      stepCode: 'assembly',
      stepName: '조립',
      stepNameEn: 'Assembly',
      department: 'PROD',
    },
    {
      stepOrder: 7,
      stepCode: 'packaging',
      stepName: '포장',
      stepNameEn: 'Packaging',
      department: 'PROD',
    },
    {
      stepOrder: 8,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 9,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 더블마트액자: 수주→파일보정→잉크젯출력→재단→원목프레임조립→포장→QC→출하
  double_mat_frame: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'inkjet_print',
      stepName: '잉크젯출력',
      stepNameEn: 'Inkjet Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'wood_frame_assembly',
      stepName: '원목프레임조립',
      stepNameEn: 'Wood Frame Assembly',
      department: 'PROD',
    },
    {
      stepOrder: 6,
      stepCode: 'packaging',
      stepName: '포장',
      stepNameEn: 'Packaging',
      department: 'PROD',
    },
    {
      stepOrder: 7,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 8,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 단품출력: 수주→파일보정→잉크젯출력→재단→QC→출하
  single_print: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'file_correction',
      stepName: '파일보정',
      stepNameEn: 'File Correction',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'inkjet_print',
      stepName: '잉크젯출력',
      stepNameEn: 'Inkjet Print',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'cutting',
      stepName: '재단',
      stepNameEn: 'Cutting',
      department: 'PROD',
    },
    {
      stepOrder: 5,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 6,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],

  // 동판: 수주→도안확인→레이저각인→QC→출하
  copper_plate: [
    {
      stepOrder: 1,
      stepCode: 'order_receipt',
      stepName: '수주',
      stepNameEn: 'Order Receipt',
      department: 'CS',
    },
    {
      stepOrder: 2,
      stepCode: 'design_review',
      stepName: '도안확인',
      stepNameEn: 'Design Review',
      department: 'DESIGN',
    },
    {
      stepOrder: 3,
      stepCode: 'laser_engraving',
      stepName: '레이저각인',
      stepNameEn: 'Laser Engraving',
      department: 'PROD',
    },
    {
      stepOrder: 4,
      stepCode: 'qc',
      stepName: 'QC',
      stepNameEn: 'Quality Check',
      department: 'PROD',
      isCheckpoint: true,
    },
    {
      stepOrder: 5,
      stepCode: 'shipping',
      stepName: '출하',
      stepNameEn: 'Shipping',
      department: 'CS',
    },
  ],
};
