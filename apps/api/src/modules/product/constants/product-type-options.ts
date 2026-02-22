/**
 * 상품 유형별 옵션 매트릭스
 *
 * 각 상품 유형에 어떤 옵션이 필요/불필요한지 정의합니다.
 * Frontend에서 조건부 표시, Backend에서 기본값 설정에 사용됩니다.
 */
import { ProductType } from './process-templates';

// 규격 필터링 탭 타입
export type SpecFilterType =
  | 'indigoAlbum'
  | 'inkjet'
  | 'frame'
  | 'booklet'
  | null;

// 상품 유형별 옵션 설정 타입
export interface ProductTypeOptions {
  // 기본값 자동 설정
  printType: 'single' | 'double' | null; // null = 해당없음
  bindingDirection: 'left' | 'right' | 'customer' | null;
  specFilterType: SpecFilterType; // 규격 필터링 탭
  defaultBinding: string | null; // 기본 제본 (null = 선택 가능)

  // 표시할 옵션 섹션
  showSpecification: boolean;
  showBinding: boolean;
  showPaper: boolean;
  showCover: boolean;
  showFoil: boolean;
  showFabric: boolean;
  showFinishing: boolean;
  showOutputPrice: boolean;
  showCopperPlate: boolean;
  showBindingDirection: boolean;

  // 용지 출력방식 필터
  paperPrintMethod: 'indigo' | 'inkjet' | null;
}

// 상품 유형별 기본 옵션 매트릭스
export const PRODUCT_TYPE_OPTIONS: Record<ProductType, ProductTypeOptions> = {
  // 압축앨범: 인디고 단면, 압축제본 고정
  compressed_album: {
    printType: 'single',
    bindingDirection: 'left',
    specFilterType: 'indigoAlbum',
    defaultBinding: '압축제본',
    showSpecification: true,
    showBinding: true,
    showPaper: true,
    showCover: false,
    showFoil: false,
    showFabric: false,
    showFinishing: true,
    showOutputPrice: true,
    showCopperPlate: false,
    showBindingDirection: true,
    paperPrintMethod: 'indigo',
  },

  // 화보앨범(스타화보): 인디고 양면, 양장제본 고정, 모든 옵션 표시
  pictorial_album: {
    printType: 'double',
    bindingDirection: 'left',
    specFilterType: 'indigoAlbum',
    defaultBinding: '양장제본',
    showSpecification: true,
    showBinding: true,
    showPaper: true,
    showCover: true,
    showFoil: true,
    showFabric: true,
    showFinishing: true,
    showOutputPrice: true,
    showCopperPlate: false,
    showBindingDirection: true,
    paperPrintMethod: 'indigo',
  },

  // 원판압축: 압축앨범과 동일
  original_compressed: {
    printType: 'single',
    bindingDirection: 'left',
    specFilterType: 'indigoAlbum',
    defaultBinding: '압축제본',
    showSpecification: true,
    showBinding: true,
    showPaper: true,
    showCover: false,
    showFoil: false,
    showFabric: false,
    showFinishing: true,
    showOutputPrice: true,
    showCopperPlate: false,
    showBindingDirection: true,
    paperPrintMethod: 'indigo',
  },

  // 포토북: 인디고 양면, 제본 선택 가능, 커버/박/원단 선택적
  photobook: {
    printType: 'double',
    bindingDirection: 'left',
    specFilterType: 'indigoAlbum',
    defaultBinding: null, // 양장/무선 선택 가능
    showSpecification: true,
    showBinding: true,
    showPaper: true,
    showCover: true,
    showFoil: true,
    showFabric: true,
    showFinishing: true,
    showOutputPrice: true,
    showCopperPlate: false,
    showBindingDirection: true,
    paperPrintMethod: 'indigo',
  },

  // 아크릴액자: 잉크젯 단면, 제본/커버/박/원단/후가공 숨김
  acrylic_frame: {
    printType: 'single',
    bindingDirection: null,
    specFilterType: 'frame',
    defaultBinding: null,
    showSpecification: true,
    showBinding: false,
    showPaper: true,
    showCover: false,
    showFoil: false,
    showFabric: false,
    showFinishing: false,
    showOutputPrice: true,
    showCopperPlate: false,
    showBindingDirection: false,
    paperPrintMethod: 'inkjet',
  },

  // 더블마트액자: 아크릴액자와 유사
  double_mat_frame: {
    printType: 'single',
    bindingDirection: null,
    specFilterType: 'frame',
    defaultBinding: null,
    showSpecification: true,
    showBinding: false,
    showPaper: true,
    showCover: false,
    showFoil: false,
    showFabric: false,
    showFinishing: false,
    showOutputPrice: true,
    showCopperPlate: false,
    showBindingDirection: false,
    paperPrintMethod: 'inkjet',
  },

  // 동판: 대부분 숨김, 동판 연결만 표시
  copper_plate: {
    printType: null,
    bindingDirection: null,
    specFilterType: null,
    defaultBinding: null,
    showSpecification: false,
    showBinding: false,
    showPaper: false,
    showCover: false,
    showFoil: false,
    showFabric: false,
    showFinishing: false,
    showOutputPrice: false,
    showCopperPlate: true,
    showBindingDirection: false,
    paperPrintMethod: null,
  },
};
