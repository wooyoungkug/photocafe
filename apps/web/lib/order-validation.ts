import type { CartItem, AlbumOrderCartInfo } from '@/stores/cart-store';

/**
 * 주문 항목 필수 필드 검증 - L1~L4 공통 로직
 *
 * 반환되는 에러 메시지는 유저에게 직접 노출됨 (한글, 간결).
 */

export interface ValidationIssue {
  field: string;           // 필드 식별자 (기계용)
  label: string;           // 사용자 표시 레이블
  message: string;         // 상세 메시지
  severity: 'error' | 'warning';
}

export interface ItemValidationResult {
  itemId: string;
  itemLabel: string;       // 장바구니/주문에서 이 아이템을 식별할 사용자용 라벨
  issues: ValidationIssue[];
  isValid: boolean;        // error 하나라도 있으면 false
}

const REQUIRED_FIELDS_ALBUM: Array<{
  key: keyof AlbumOrderCartInfo;
  label: string;
  message?: string;
}> = [
  { key: 'specificationId', label: '규격', message: '규격이 매칭되지 않았습니다. 업로드 파일을 확인해주세요.' },
  { key: 'specificationName', label: '규격명' },
  { key: 'bindingName', label: '제본방식', message: '제본방식이 선택되지 않았습니다.' },
  { key: 'paperName', label: '용지', message: '용지가 선택되지 않았습니다.' },
  { key: 'bindingDirection', label: '제본방향', message: '제본방향이 설정되지 않았습니다.' },
  { key: 'pageLayout', label: '편집스타일' },
  { key: 'printMethod', label: '출력기종' },
];

/**
 * 앨범 주문 항목 검증
 */
export function validateAlbumCartItem(item: CartItem): ItemValidationResult {
  const label = item.name || item.albumOrderInfo?.folderName || item.id;
  const issues: ValidationIssue[] = [];
  const info = item.albumOrderInfo;

  if (!info) {
    issues.push({
      field: 'albumOrderInfo',
      label: '앨범 정보',
      message: '앨범 주문 정보가 누락되었습니다.',
      severity: 'error',
    });
    return { itemId: item.id, itemLabel: label, issues, isValid: false };
  }

  for (const f of REQUIRED_FIELDS_ALBUM) {
    const value = info[f.key];
    if (value === undefined || value === null || value === '') {
      issues.push({
        field: String(f.key),
        label: f.label,
        message: f.message || `${f.label}이(가) 설정되지 않았습니다.`,
        severity: 'error',
      });
    }
  }

  // 인디고일 경우 colorMode 필수
  if (info.printMethod === 'indigo' && !info.colorMode) {
    issues.push({
      field: 'colorMode',
      label: '도수',
      message: '인디고 도수(4도/6도)가 선택되지 않았습니다.',
      severity: 'error',
    });
  }

  // 표지 원단 선택 시 fabricId 필수
  if (info.coverSourceType === 'fabric' && !info.fabricId) {
    issues.push({
      field: 'fabricId',
      label: '원단',
      message: '표지 원단이 선택되지 않았습니다.',
      severity: 'error',
    });
  }

  // 수량 확인
  if (!item.quantity || item.quantity < 1) {
    issues.push({
      field: 'quantity',
      label: '수량',
      message: '수량이 올바르지 않습니다.',
      severity: 'error',
    });
  }

  // 파일 업로드 확인 (앨범 주문은 파일 필수)
  if (!item.serverFiles || item.serverFiles.length === 0) {
    issues.push({
      field: 'serverFiles',
      label: '업로드 파일',
      message: '업로드된 파일이 없습니다. 다시 업로드해주세요.',
      severity: 'error',
    });
  }

  return {
    itemId: item.id,
    itemLabel: label,
    issues,
    isValid: issues.filter(i => i.severity === 'error').length === 0,
  };
}

/**
 * 일반 상품(non-album) 검증
 */
export function validateGenericCartItem(item: CartItem): ItemValidationResult {
  const label = item.name || item.id;
  const issues: ValidationIssue[] = [];

  if (!item.quantity || item.quantity < 1) {
    issues.push({
      field: 'quantity',
      label: '수량',
      message: '수량이 올바르지 않습니다.',
      severity: 'error',
    });
  }

  return {
    itemId: item.id,
    itemLabel: label,
    issues,
    isValid: issues.length === 0,
  };
}

/**
 * 단일 아이템 검증 (타입 자동 분기)
 */
export function validateCartItem(item: CartItem): ItemValidationResult {
  if (item.productType === 'album-order') {
    return validateAlbumCartItem(item);
  }
  return validateGenericCartItem(item);
}

/**
 * 여러 아이템 일괄 검증
 */
export function validateCartItems(items: CartItem[]): {
  results: ItemValidationResult[];
  allValid: boolean;
  errorSummary: string[];      // 에러 한줄 요약 (토스트/알림용)
} {
  const results = items.map(validateCartItem);
  const allValid = results.every(r => r.isValid);
  const errorSummary = results
    .filter(r => !r.isValid)
    .flatMap(r => r.issues
      .filter(i => i.severity === 'error')
      .map(i => `[${r.itemLabel}] ${i.message}`)
    );

  return { results, allValid, errorSummary };
}

// ==================== 폴더 단위 검증 (업로드 단계) ====================

export interface FolderValidationIssue {
  field: string;
  label: string;
  message: string;
}

export interface FolderValidationResult {
  folderId: string;
  folderName: string;
  issues: FolderValidationIssue[];
  isValid: boolean;
}

interface FolderLike {
  id: string;
  folderName: string;
  specificationId?: string;
  bindingDirection?: string | null;
  pageLayout?: string | null;
  printMethod?: string | null;
  colorMode?: string | null;
  selectedPaperName?: string | null;
  coverSourceType?: string | null;
  selectedFabricId?: string | null;
  quantity?: number;
  files?: Array<any>;
  validationStatus?: string;
}

/**
 * 업로드 폴더 단위 검증 (장바구니 담기 전)
 */
export function validateFolder(folder: FolderLike): FolderValidationResult {
  const issues: FolderValidationIssue[] = [];

  if (!folder.specificationId) {
    issues.push({
      field: 'specificationId',
      label: '규격',
      message: '업로드된 파일의 규격이 시스템에 등록되어 있지 않습니다. 관리자에게 규격 등록을 요청해주세요.',
    });
  }

  if (!folder.bindingDirection) {
    issues.push({
      field: 'bindingDirection',
      label: '제본방향',
      message: '제본방향이 설정되지 않았습니다.',
    });
  }

  if (!folder.pageLayout) {
    issues.push({
      field: 'pageLayout',
      label: '편집스타일',
      message: '편집스타일(낱장/펼침면)이 설정되지 않았습니다.',
    });
  }

  if (!folder.printMethod) {
    issues.push({
      field: 'printMethod',
      label: '출력기종',
      message: '출력기종이 선택되지 않았습니다.',
    });
  }

  if (folder.printMethod === 'indigo' && !folder.colorMode) {
    issues.push({
      field: 'colorMode',
      label: '도수',
      message: '인디고 도수(4도/6도)가 선택되지 않았습니다.',
    });
  }

  if (!folder.selectedPaperName) {
    issues.push({
      field: 'selectedPaperName',
      label: '용지',
      message: '용지가 선택되지 않았습니다.',
    });
  }

  if (folder.coverSourceType === 'fabric' && !folder.selectedFabricId) {
    issues.push({
      field: 'selectedFabricId',
      label: '원단',
      message: '표지 원단이 선택되지 않았습니다.',
    });
  }

  if (!folder.quantity || folder.quantity < 1) {
    issues.push({
      field: 'quantity',
      label: '수량',
      message: '수량이 1 이상이어야 합니다.',
    });
  }

  if (!folder.files || folder.files.length === 0) {
    issues.push({
      field: 'files',
      label: '파일',
      message: '업로드된 파일이 없습니다.',
    });
  }

  return {
    folderId: folder.id,
    folderName: folder.folderName,
    issues,
    isValid: issues.length === 0,
  };
}
