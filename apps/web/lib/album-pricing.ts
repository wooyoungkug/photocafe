/**
 * 화보/앨범/포토북 견적 계산 유틸리티
 */

import type { AlbumFolderData, PrintMethod, ColorMode, PageLayout } from '@/stores/album-order-store';

// ==================== 타입 정의 ====================

// 앨범 타입
export type AlbumType = 'premium-photo' | 'compressed' | 'photobook';

// 압축앨범 세부 타입
export type CompressedAlbumType = 'premium' | 'graduation';

// 속지 두께
export type InnerPageThickness = '0.1mm' | '0.3mm' | '0.6mm' | '1mm';

// 제본 방식
export type BindingType = 'wireless' | 'spring' | 'flat';

// 견적 항목
export interface QuotationItem {
  name: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

// 견적 결과
export interface AlbumQuotation {
  albumType: AlbumType;
  compressedType?: CompressedAlbumType;

  // 항목별 가격
  coverPrice: QuotationItem;
  printPrice: QuotationItem;
  bindingPrice?: QuotationItem; // 압축앨범만

  // 합계
  unitPrice: number;
  quantity: number;
  subtotal: number;
  tax: number;
  totalPrice: number;

  // 적용된 옵션
  options: {
    printMethod: PrintMethod;
    colorMode: ColorMode;
    pageLayout: PageLayout;
    specification: string;
    pages: number;
    innerThickness?: InnerPageThickness;
  };
}

// ==================== 기본 단가 (실제 운영시 DB에서 조회) ====================

// 표지 단가 (표지 타입별)
const COVER_PRICES: Record<string, number> = {
  'hard-standard': 5000,
  'hard-premium': 8000,
  'soft-standard': 3000,
  'soft-premium': 5000,
  'leather': 15000,
};

// 인디고 출력 단가 (규격별, 도수별, 면당)
const INDIGO_PRINT_PRICES: Record<string, Record<ColorMode, { single: number; double: number }>> = {
  '8x10': { '4c': { single: 300, double: 500 }, '6c': { single: 400, double: 650 } },
  '10x10': { '4c': { single: 350, double: 600 }, '6c': { single: 450, double: 750 } },
  '11x14': { '4c': { single: 450, double: 750 }, '6c': { single: 550, double: 900 } },
  '12x12': { '4c': { single: 400, double: 700 }, '6c': { single: 500, double: 850 } },
  '12x18': { '4c': { single: 500, double: 850 }, '6c': { single: 600, double: 1000 } },
  default: { '4c': { single: 400, double: 700 }, '6c': { single: 500, double: 850 } },
};

// 잉크젯 출력 단가 (규격별, 면당)
const INKJET_PRINT_PRICES: Record<string, { single: number; double: number }> = {
  '8x10': { single: 200, double: 350 },
  '10x10': { single: 250, double: 400 },
  '11x14': { single: 350, double: 550 },
  '12x12': { single: 300, double: 500 },
  '12x18': { single: 400, double: 650 },
  default: { single: 300, double: 500 },
};

// 제본 단가 (속지 두께별)
const BINDING_PRICES: Record<InnerPageThickness, number> = {
  '0.1mm': 1000,
  '0.3mm': 1500,
  '0.6mm': 2500,
  '1mm': 4000,
};

// 페이지당 제본 추가 단가 (속지 두께별)
const BINDING_PER_PAGE_PRICES: Record<InnerPageThickness, number> = {
  '0.1mm': 50,
  '0.3mm': 80,
  '0.6mm': 120,
  '1mm': 200,
};

// ==================== 계산 함수 ====================

/**
 * 규격 문자열에서 단가 키 추출
 */
function getSpecKey(specName: string): string {
  // "8x10", "12x12" 등의 형식에서 키 추출
  const match = specName.match(/(\d+)x(\d+)/i);
  if (match) {
    return `${match[1]}x${match[2]}`;
  }
  return 'default';
}

/**
 * 표지 가격 계산
 */
export function calculateCoverPrice(
  coverType: string = 'hard-standard',
  quantity: number = 1
): QuotationItem {
  const unitPrice = COVER_PRICES[coverType] || COVER_PRICES['hard-standard'];
  return {
    name: '표지',
    description: coverType,
    unitPrice,
    quantity,
    amount: unitPrice * quantity,
  };
}

/**
 * 출력 가격 계산 (인디고/잉크젯)
 */
export function calculatePrintPrice(
  printMethod: PrintMethod,
  colorMode: ColorMode,
  pageLayout: PageLayout,
  specName: string,
  pages: number,
  quantity: number = 1
): QuotationItem {
  const specKey = getSpecKey(specName);
  const isSingle = pageLayout === 'single';

  let pricePerPage: number;

  if (printMethod === 'indigo') {
    const prices = INDIGO_PRINT_PRICES[specKey] || INDIGO_PRINT_PRICES.default;
    pricePerPage = isSingle ? prices[colorMode].single : prices[colorMode].double;
  } else {
    const prices = INKJET_PRINT_PRICES[specKey] || INKJET_PRINT_PRICES.default;
    pricePerPage = isSingle ? prices.single : prices.double;
  }

  const totalPages = pages;
  const unitPrice = pricePerPage * totalPages;

  return {
    name: '출력',
    description: `${printMethod === 'indigo' ? '인디고' : '잉크젯'} ${colorMode === '4c' ? '4도' : '6도'} ${totalPages}p`,
    unitPrice,
    quantity,
    amount: unitPrice * quantity,
  };
}

/**
 * 제본 가격 계산 (압축앨범용)
 */
export function calculateBindingPrice(
  innerThickness: InnerPageThickness,
  pages: number,
  quantity: number = 1
): QuotationItem {
  const basePrice = BINDING_PRICES[innerThickness];
  const perPagePrice = BINDING_PER_PAGE_PRICES[innerThickness];
  const unitPrice = basePrice + (perPagePrice * pages);

  return {
    name: '제본',
    description: `속지 ${innerThickness}`,
    unitPrice,
    quantity,
    amount: unitPrice * quantity,
  };
}

/**
 * 압축앨범 견적 계산
 */
export function calculateCompressedAlbumQuotation(params: {
  compressedType: CompressedAlbumType;
  coverType: string;
  printMethod: PrintMethod;
  colorMode: ColorMode;
  pageLayout: PageLayout;
  specName: string;
  pages: number;
  innerThickness: InnerPageThickness;
  quantity: number;
}): AlbumQuotation {
  const {
    compressedType,
    coverType,
    printMethod,
    colorMode,
    pageLayout,
    specName,
    pages,
    innerThickness,
    quantity,
  } = params;

  // 고급압축앨범: 10p 미만은 10p 가격 적용
  // 졸업압축앨범: 2p 단위
  let effectivePages = pages;
  if (compressedType === 'premium' && pages < 10) {
    effectivePages = 10;
  } else if (compressedType === 'graduation') {
    effectivePages = Math.ceil(pages / 2) * 2; // 2p 단위로 올림
  }

  const coverPrice = calculateCoverPrice(coverType, quantity);
  const printPrice = calculatePrintPrice(
    printMethod,
    colorMode,
    pageLayout,
    specName,
    effectivePages,
    quantity
  );
  const bindingPrice = calculateBindingPrice(innerThickness, effectivePages, quantity);

  const unitPrice = coverPrice.unitPrice + printPrice.unitPrice + bindingPrice.unitPrice;
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * 0.1);
  const totalPrice = subtotal + tax;

  return {
    albumType: 'compressed',
    compressedType,
    coverPrice,
    printPrice,
    bindingPrice,
    unitPrice,
    quantity,
    subtotal,
    tax,
    totalPrice,
    options: {
      printMethod,
      colorMode,
      pageLayout,
      specification: specName,
      pages: effectivePages,
      innerThickness,
    },
  };
}

/**
 * 고급화보/포토북 견적 계산
 */
export function calculatePremiumAlbumQuotation(params: {
  albumType: 'premium-photo' | 'photobook';
  coverType: string;
  colorMode: ColorMode;
  pageLayout: PageLayout;
  specName: string;
  pages: number;
  quantity: number;
}): AlbumQuotation {
  const {
    albumType,
    coverType,
    colorMode,
    pageLayout,
    specName,
    pages,
    quantity,
  } = params;

  // 고급화보/포토북은 인디고만 가능
  const printMethod: PrintMethod = 'indigo';

  const coverPrice = calculateCoverPrice(coverType, quantity);
  const printPrice = calculatePrintPrice(
    printMethod,
    colorMode,
    pageLayout,
    specName,
    pages,
    quantity
  );

  const unitPrice = coverPrice.unitPrice + printPrice.unitPrice;
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * 0.1);
  const totalPrice = subtotal + tax;

  return {
    albumType,
    coverPrice,
    printPrice,
    unitPrice,
    quantity,
    subtotal,
    tax,
    totalPrice,
    options: {
      printMethod,
      colorMode,
      pageLayout,
      specification: specName,
      pages,
    },
  };
}

/**
 * 폴더 데이터에서 견적 계산
 */
export function calculateFolderQuotation(
  folder: AlbumFolderData,
  options: {
    albumType: AlbumType;
    compressedType?: CompressedAlbumType;
    coverType: string;
    printMethod: PrintMethod;
    colorMode: ColorMode;
    pageLayout: PageLayout;
    specName: string;
    innerThickness?: InnerPageThickness;
  }
): AlbumQuotation {
  const pages = folder.pageCount;
  const quantity = folder.quantity;

  if (options.albumType === 'compressed') {
    return calculateCompressedAlbumQuotation({
      compressedType: options.compressedType || 'premium',
      coverType: options.coverType,
      printMethod: options.printMethod,
      colorMode: options.colorMode,
      pageLayout: options.pageLayout,
      specName: options.specName,
      pages,
      innerThickness: options.innerThickness || '0.3mm',
      quantity,
    });
  }

  return calculatePremiumAlbumQuotation({
    albumType: options.albumType,
    coverType: options.coverType,
    colorMode: options.colorMode,
    pageLayout: options.pageLayout,
    specName: options.specName,
    pages,
    quantity,
  });
}

/**
 * 여러 폴더의 총 견적 계산
 */
export function calculateTotalQuotation(
  folders: AlbumFolderData[],
  options: {
    albumType: AlbumType;
    compressedType?: CompressedAlbumType;
    coverType: string;
    printMethod: PrintMethod;
    colorMode: ColorMode;
    pageLayout: PageLayout;
    specName: string;
    innerThickness?: InnerPageThickness;
  }
): {
  quotations: AlbumQuotation[];
  totalQuantity: number;
  subtotal: number;
  tax: number;
  totalPrice: number;
} {
  const quotations = folders.map(folder =>
    calculateFolderQuotation(folder, options)
  );

  const totalQuantity = quotations.reduce((sum, q) => sum + q.quantity, 0);
  const subtotal = quotations.reduce((sum, q) => sum + q.subtotal, 0);
  const tax = Math.round(subtotal * 0.1);
  const totalPrice = subtotal + tax;

  return {
    quotations,
    totalQuantity,
    subtotal,
    tax,
    totalPrice,
  };
}

/**
 * 가격 포맷팅
 */
export function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR');
}
