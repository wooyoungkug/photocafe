import { create } from 'zustand';
import { calculateNormalizedRatio, type SizeMatchStatus } from '@/lib/album-utils';
import { useCartStore } from '@/stores/cart-store';

// 비율 허용 오차
const RATIO_TOLERANCE = 0.01;

// 같은 비율로 취급하는 규격 쌍 정의 (비즈니스 규칙)
// 수학적 비율이 약간 다르더라도 인쇄 비즈니스에서 같은 비율로 취급하는 규격들
// [가로1, 세로1, 가로2, 세로2]
const RATIO_EQUIVALENCES: Array<[number, number, number, number]> = [
  [11, 15, 8, 11],       // 11x15 ↔ 8x11 (1.3636 ↔ 1.375)
  [14, 11, 11, 8.6],     // 14x11 ↔ 11x8.6 (1.2727 ↔ 1.2791)
];

// 두 비율이 같은 비율로 취급되는지 확인 (기본 tolerance + 등가 그룹)
function isRatioEquivalent(ratio1: number, ratio2: number): boolean {
  if (Math.abs(ratio1 - ratio2) < RATIO_TOLERANCE) return true;

  for (const [w1, h1, w2, h2] of RATIO_EQUIVALENCES) {
    const r1 = calculateNormalizedRatio(w1, h1);
    const r2 = calculateNormalizedRatio(w2, h2);
    // ratio1과 ratio2가 같은 등가 그룹에 속하는지 확인
    if ((Math.abs(ratio1 - r1) < RATIO_TOLERANCE || Math.abs(ratio1 - r2) < RATIO_TOLERANCE) &&
        (Math.abs(ratio2 - r1) < RATIO_TOLERANCE || Math.abs(ratio2 - r2) < RATIO_TOLERANCE)) {
      return true;
    }
  }

  return false;
}

// 표준 규격 타입 (DB 인디고 규격에서 변환)
export interface StandardSize {
  width: number;
  height: number;
  label: string;
  ratio: number;
}

// 주문 유형: 펼친면 vs 낱장
export type PageLayoutType = 'spread' | 'single';

// 제본 방향
export type BindingDirection =
  | 'LEFT_START_RIGHT_END'  // 좌시작→우끝 (일반 좌철)
  | 'LEFT_START_LEFT_END'   // 좌시작→좌끝
  | 'RIGHT_START_LEFT_END'  // 우시작→좌끝 (일반 우철)
  | 'RIGHT_START_RIGHT_END'; // 우시작→우끝

// 표지 타입
export type CoverType = 'FRONT_COVER' | 'BACK_COVER' | 'COMBINED_COVER' | 'INNER_PAGE';

// 표지 감지 패턴
const COVER_PATTERNS = {
  FRONT: /첫장|표지(?!뒷)|front|cover(?!.*back)|^첫$/i,
  BACK: /막장|뒷표지|back|rear|끝|^막$/i,
  COMBINED: /첫장막장|첫막장|표지뒷표지|첫장_막장|frontback/i,
};

// 표지 타입 감지 함수
export function detectCoverType(filename: string): CoverType {
  const name = filename.replace(/\.[^.]+$/, ''); // 확장자 제거

  // 숫자만 있는 경우 (예: 0122 -> 01, 22 -> 첫장, 막장 합본)
  if (/^\d{4,}$/.test(name) && name.length % 2 === 0) {
    const mid = name.length / 2;
    const left = parseInt(name.slice(0, mid), 10);
    const right = parseInt(name.slice(mid), 10);

    // 왼쪽이 1이고 오른쪽이 2보다 크면 (즉, 1페이지와 마지막페이지가 붙은 경우)
    if (left === 1 && right > 2) {
      return 'COMBINED_COVER';
    }
  }

  // 한글 처리 (자소 분리 방지) 및 공백 제거
  const normalizedName = name.normalize('NFC').trim();

  // 명시적 파일명 체크 (엄격하게) - 정규식보다 우선
  if (normalizedName === '첫장' || normalizedName === '표지' || normalizedName === 'front' || normalizedName === 'cover') return 'FRONT_COVER';
  if (normalizedName === '막장' || normalizedName === '뒷표지' || normalizedName === 'back' || normalizedName === 'rear') return 'BACK_COVER';

  if (COVER_PATTERNS.COMBINED.test(normalizedName)) return 'COMBINED_COVER';
  if (COVER_PATTERNS.FRONT.test(normalizedName)) return 'FRONT_COVER';
  if (COVER_PATTERNS.BACK.test(normalizedName)) return 'BACK_COVER';
  return 'INNER_PAGE';
}

// 표준 규격 목록은 DB 인디고출력 규격에서 동적으로 로드됨

// 폴더 검증 상태
export type FolderValidationStatus = 'PENDING' | 'EXACT_MATCH' | 'RATIO_MATCH' | 'RATIO_MISMATCH';

// 개별 파일 정보
export interface UploadedFile {
  id: string;
  file?: File;
  fileName: string;
  newFileName?: string; // 순번 파일명 (01_파일명)
  filePath: string; // 폴더 경로 포함
  fileSize: number;
  pageNumber: number;

  // 이미지 메타 (파일규격)
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthInch: number;  // 파일 가로 (인치)
  heightInch: number; // 파일 세로 (인치)
  ratio: number;

  // 표지 타입
  coverType: CoverType;

  // 분리된 파일 여부 (첫막장 분리 시)
  isSplit?: boolean;
  splitFrom?: string; // 원본 파일명
  splitSide?: 'left' | 'right'; // 분리된 위치

  // Canvas 데이터 (분리된 이미지)
  canvasDataUrl?: string;

  // 썸네일 (리사이즈된 작은 이미지)
  thumbnailUrl?: string;

  // 반폭 표지 확장 정보 (빈영역 추가)
  isExtended?: boolean; // 확장 여부
  extendPosition?: 'left' | 'right'; // 빈영역 위치 (left: 첫장, right: 막장)
  originalWidthPx?: number; // 원본 가로 픽셀
  originalWidthInch?: number; // 원본 가로 인치

  // 빈페이지 감지 (먹/백색)
  isBlankPage?: boolean;

  // 검증 결과
  status: SizeMatchStatus;
  message?: string;
}

// 발송지 유형
export type SenderType = 'company' | 'orderer';

// 배송지 유형
export type ReceiverType = 'orderer' | 'direct_customer';

// 배송 방법
export type FolderDeliveryMethod = 'parcel' | 'motorcycle' | 'freight' | 'pickup';

// 폴더별 배송 정보
export interface FolderShippingInfo {
  // 발송지
  senderType: SenderType;
  senderName: string;
  senderPhone: string;
  senderPostalCode: string;
  senderAddress: string;
  senderAddressDetail: string;

  // 배송지
  receiverType: ReceiverType;
  recipientName: string;
  recipientPhone: string;
  recipientPostalCode: string;
  recipientAddress: string;
  recipientAddressDetail: string;

  // 배송 방법 및 요금
  deliveryMethod: FolderDeliveryMethod;
  deliveryFee: number;
  deliveryFeeType: string; // 'free' | 'conditional' | 'standard'
}

// 추가 주문 정보
export interface AdditionalOrder {
  id: string;
  albumWidth: number;  // 앨범규격 가로
  albumHeight: number; // 앨범규격 세로
  albumLabel: string;
  quantity: number;
}

// 첫막장 분리 결과
export interface SplitCoverResult {
  originalFileName: string;
  frontCover: UploadedFile; // 첫장 (오른쪽반 + 빈페이지)
  backCover: UploadedFile;  // 막장 (빈페이지 + 왼쪽반)
}

// 폴더(주문 건) 정보
export interface UploadedFolder {
  id: string;
  folderName: string;
  orderTitle: string;
  folderPath: string;
  depth: number;

  // 파일 정보
  files: UploadedFile[];
  totalFileSize: number;
  pageCount: number; // 분리 후 최종 페이지 수

  // 주문 유형
  pageLayout: PageLayoutType; // 펼친면 / 낱장
  bindingDirection: BindingDirection | null; // 제본방향

  // 파일규격 (주문규격) - 첫 파일 기준
  fileSpecWidth: number;  // 파일 가로 (인치)
  fileSpecHeight: number; // 파일 세로 (인치)
  fileSpecLabel: string;  // "24×12인치"

  // 앨범규격 - 펼친면: 파일가로/2 × 세로, 낱장: 파일규격과 동일
  albumWidth: number;
  albumHeight: number;
  albumRatio: number;
  albumLabel: string; // "12×12인치"

  dpi: number;

  // 대표 규격 (하위 호환용 - albumWidth/Height와 동일)
  specWidth: number;
  specHeight: number;
  specRatio: number;
  specLabel: string;

  // 검증 결과
  validationStatus: FolderValidationStatus;
  isApproved: boolean;
  isSelected: boolean;

  // 검증 상세
  exactMatchCount: number;
  ratioMatchCount: number;
  ratioMismatchCount: number;
  mismatchFiles: UploadedFile[];

  // 첫막장 분리 결과
  splitCoverResults: SplitCoverResult[];
  hasCombinedCover: boolean; // 첫막장 합본 있는지

  // 주문 정보
  quantity: number;

  // 같은 비율의 가능 규격 (앨범규격 기준)
  availableSizes: StandardSize[];

  // 추가 주문
  additionalOrders: AdditionalOrder[];

  // 자동감지 여부
  isAutoDetected?: boolean;

  // 빈페이지 자동감지 결과
  firstPageBlank?: boolean;  // 첫장이 먹/백색 빈페이지
  lastPageBlank?: boolean;   // 막장이 먹/백색 빈페이지
  autoBindingDetected?: boolean; // 빈페이지 기반 제본방향 자동 결정됨

  // 배송 정보
  shippingInfo?: FolderShippingInfo;

  // 업로드 시각
  uploadedAt: number; // Date.now()
}

interface MultiFolderUploadState {
  // 업로드된 폴더들
  folders: UploadedFolder[];

  // 전체 상태
  isUploading: boolean;
  uploadProgress: number;

  // 기본 주문 유형 (null = 미선택)
  defaultPageLayout: PageLayoutType | null;
  defaultBindingDirection: BindingDirection | null;

  // 설정
  targetSpecWidth: number;
  targetSpecHeight: number;
  targetSpecRatio: number;

  // DB 인디고출력 규격 리스트
  indigoSpecs: StandardSize[];

  // 인디고 규격 설정
  setIndigoSpecs: (specs: StandardSize[]) => void;

  // 액션
  addFolder: (folder: UploadedFolder) => { added: boolean; reason?: string };
  updateFolder: (folderId: string, updates: Partial<UploadedFolder>) => void;
  removeFolder: (folderId: string) => void;
  clearFolders: () => void;

  setFolderTitle: (folderId: string, title: string) => void;
  setFolderQuantity: (folderId: string, quantity: number) => void;
  setFolderSelected: (folderId: string, selected: boolean) => void;
  approveFolder: (folderId: string) => void;

  // 주문 유형 변경
  setFolderPageLayout: (folderId: string, layout: PageLayoutType) => void;
  setFolderBindingDirection: (folderId: string, direction: BindingDirection) => void;
  setDefaultPageLayout: (layout: PageLayoutType | null) => void;
  setDefaultBindingDirection: (direction: BindingDirection | null) => void;

  // 추가 주문
  addAdditionalOrder: (folderId: string, spec: { width: number; height: number; label: string }) => void;
  removeAdditionalOrder: (folderId: string, orderId: string) => void;
  updateAdditionalOrderQuantity: (folderId: string, orderId: string, quantity: number) => void;
  updateAdditionalOrderSpec: (folderId: string, orderId: string, spec: { width: number; height: number; label: string }) => void;

  // 규격 변경 (앨범규격 기준)
  changeFolderSpec: (folderId: string, spec: { width: number; height: number; label: string }) => void;

  // 업로드 상태
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;

  // 설정
  setTargetSpec: (width: number, height: number) => void;

  // 파일 순서 변경 (드래그 앤 드롭)
  reorderFolderFiles: (folderId: string, fromIndex: number, toIndex: number) => void;

  // 배송 정보
  setFolderShipping: (folderId: string, shipping: FolderShippingInfo) => void;
  applyShippingToAll: (shipping: FolderShippingInfo) => void;

  // 유틸리티
  getSelectedFolders: () => UploadedFolder[];
  validateFolder: (folder: UploadedFolder) => UploadedFolder;

  reset: () => void;
}

const initialState = {
  folders: [] as UploadedFolder[],
  isUploading: false,
  uploadProgress: 0,
  defaultPageLayout: null as PageLayoutType | null,  // 미선택 상태로 시작
  defaultBindingDirection: null as BindingDirection | null,  // 미선택 상태로 시작
  targetSpecWidth: 12,
  targetSpecHeight: 12,
  targetSpecRatio: 1,
  indigoSpecs: [] as StandardSize[],
};

// 페이지 수 계산 (파일 수 + 편집스타일 + 제본방향 기반)
// - 낱장: 파일수 = 페이지수
// - 펼친면:
//   - 왼쪽시작→오른쪽끝: 파일수 * 2
//   - 왼쪽시작→왼쪽끝: 파일수 * 2 - 1
//   - 오른쪽시작→왼쪽끝: 파일수 * 2 - 2
//   - 오른쪽시작→오른쪽끝: 파일수 * 2 - 1
export function calculatePageCount(
  fileCount: number,
  pageLayout: PageLayoutType,
  bindingDirection: BindingDirection | null
): number {
  if (pageLayout === 'single') {
    // 낱장: 파일수 = 페이지수
    return fileCount;
  }

  // 펼친면: 제본방향에 따라 계산
  switch (bindingDirection) {
    case 'LEFT_START_RIGHT_END':
      // 왼쪽시작→오른쪽끝: 파일수 * 2
      return fileCount * 2;
    case 'LEFT_START_LEFT_END':
      // 왼쪽시작→왼쪽끝: 파일수 * 2 - 1
      return fileCount * 2 - 1;
    case 'RIGHT_START_LEFT_END':
      // 오른쪽시작→왼쪽끝: 파일수 * 2 - 2
      return fileCount * 2 - 2;
    case 'RIGHT_START_RIGHT_END':
      // 오른쪽시작→오른쪽끝: 파일수 * 2 - 1
      return fileCount * 2 - 1;
    default:
      // 기본값: 파일수 * 2
      return fileCount * 2;
  }
}

// 앨범규격 산출
export function calculateAlbumSize(
  fileWidth: number,
  fileHeight: number,
  pageLayout: PageLayoutType
): { albumWidth: number; albumHeight: number } {
  if (pageLayout === 'spread') {
    // 펼친면: 가로를 반으로
    return {
      albumWidth: Math.round((fileWidth / 2) * 10) / 10,
      albumHeight: fileHeight,
    };
  } else {
    // 낱장: 파일규격과 동일
    return {
      albumWidth: fileWidth,
      albumHeight: fileHeight,
    };
  }
}

// 편집스타일 자동감지: 파일 치수를 표준규격과 비교하여 single/spread 판별
export function autoDetectPageLayout(
  widthInch: number,
  heightInch: number,
  specs: StandardSize[]
): PageLayoutType {
  if (specs.length === 0) return 'spread'; // 규격 미로드 시 폴백

  // single/spread 두 모드로 앨범 크기 계산
  const singleAlbum = calculateAlbumSize(widthInch, heightInch, 'single');
  const spreadAlbum = calculateAlbumSize(widthInch, heightInch, 'spread');

  // 각 모드에서 가장 가까운 표준규격 찾기
  const singleMatch = findClosestStandardSize(specs, singleAlbum.albumWidth, singleAlbum.albumHeight);
  const spreadMatch = findClosestStandardSize(specs, spreadAlbum.albumWidth, spreadAlbum.albumHeight);

  if (!singleMatch && !spreadMatch) return 'spread';
  if (!singleMatch) return 'spread';
  if (!spreadMatch) return 'single';

  // 비율 차이 비교
  const singleRatio = calculateNormalizedRatio(singleAlbum.albumWidth, singleAlbum.albumHeight);
  const spreadRatio = calculateNormalizedRatio(spreadAlbum.albumWidth, spreadAlbum.albumHeight);
  const singleMatchRatio = calculateNormalizedRatio(singleMatch.width, singleMatch.height);
  const spreadMatchRatio = calculateNormalizedRatio(spreadMatch.width, spreadMatch.height);

  const singleDiff = Math.abs(singleRatio - singleMatchRatio);
  const spreadDiff = Math.abs(spreadRatio - spreadMatchRatio);

  // 차이가 작은 모드 선택 (동점 시 spread 우선)
  if (singleDiff < spreadDiff) return 'single';
  return 'spread';
}

// 비율 체크 함수 (앨범규격 기준)
function checkRatioMatch(
  targetAlbumWidth: number,
  targetAlbumHeight: number,
  fileAlbumWidth: number,
  fileAlbumHeight: number
): SizeMatchStatus {
  const targetRatio = calculateNormalizedRatio(targetAlbumWidth, targetAlbumHeight);
  const fileRatio = calculateNormalizedRatio(fileAlbumWidth, fileAlbumHeight);

  // 정확히 일치
  if (Math.abs(targetAlbumWidth - fileAlbumWidth) < 0.1 && Math.abs(targetAlbumHeight - fileAlbumHeight) < 0.1) {
    return 'EXACT';
  }

  // 비율 일치 (허용 오차 내 + 등가 그룹)
  if (isRatioEquivalent(targetRatio, fileRatio)) {
    return 'RATIO_MATCH';
  }

  return 'RATIO_MISMATCH';
}

// 같은 비율의 앨범규격 찾기 (방향도 일치해야 함, 면적 크기순 정렬)
function findAvailableSizes(sizes: StandardSize[], ratio: number, isLandscape: boolean) {
  return sizes.filter(size => {
    const sizeRatio = calculateNormalizedRatio(size.width, size.height);
    const sizeIsLandscape = size.width >= size.height; // 가로형 여부
    // 비율이 일치하고(등가 그룹 포함), 방향도 일치해야 함
    return isRatioEquivalent(sizeRatio, ratio) && sizeIsLandscape === isLandscape;
  }).sort((a, b) => (a.width * a.height) - (b.width * b.height));
}

// 규격 라벨 생성
function getSpecLabel(sizes: StandardSize[], width: number, height: number): string {
  const found = sizes.find(s => Math.abs(s.width - width) < 0.15 && Math.abs(s.height - height) < 0.15);
  if (found) return found.label;
  return `${width}×${height}인치`;
}

// 페이지 정렬 함수 (첫장 → 내지 → 막장)
export function sortPagesByPosition(files: UploadedFile[]): UploadedFile[] {
  const frontCovers = files.filter(f => f.coverType === 'FRONT_COVER');
  const backCovers = files.filter(f => f.coverType === 'BACK_COVER');
  const innerPages = files.filter(f => f.coverType === 'INNER_PAGE');

  // 내지는 파일명 기준 자연 정렬
  innerPages.sort((a, b) => a.fileName.localeCompare(b.fileName, 'ko', { numeric: true }));

  // 첫장 → 내지 → 막장
  const sorted = [...frontCovers, ...innerPages, ...backCovers];

  // 페이지 번호 재할당
  return sorted.map((file, index) => ({
    ...file,
    pageNumber: index + 1,
  }));
}

// 순번 파일명 생성 (01_파일명 또는 001_파일명)
export function generateSequentialFileName(index: number, originalName: string, totalCount: number): string {
  // 100개 미만: 2자리 (01, 02...), 100개 이상: 3자리 (001, 002...) (1000개 이상: 4자리 자동 대응)
  const padLength = totalCount >= 100 ? String(totalCount).length : 2;
  const seq = String(index + 1).padStart(padLength, '0');
  return `${seq}_${originalName}`;
}

// 첫장/막장이 반폭인지 확인하고 한 페이지로 확장
// - 첫장: [빈영역 + 원본이미지] 로 확장
// - 막장: [원본이미지 + 빈영역] 로 확장
export function processHalfWidthCovers(
  files: UploadedFile[],
  representativeWidth: number,
  representativeHeight: number,
  pageLayout: PageLayoutType
): UploadedFile[] {
  if (pageLayout !== 'spread') return files;

  const halfWidth = representativeWidth / 2;

  return files.map(file => {
    // 이미 Canvas로 확장 처리된 파일은 건너뛰기
    if (file.isExtended) return file;

    const fileAlbum = calculateAlbumSize(file.widthInch, file.heightInch, pageLayout);
    // 반폭인지 확인 (대표규격의 절반 가로 && 같은 세로)
    const isHalfWidth = Math.abs(fileAlbum.albumWidth - halfWidth) < 0.2 &&
      Math.abs(fileAlbum.albumHeight - representativeHeight) < 0.2;

    if (isHalfWidth && (file.coverType === 'FRONT_COVER' || file.coverType === 'BACK_COVER')) {
      // 반폭 표지를 전폭으로 확장 표시
      const fullWidthPx = file.widthPx * 2; // 가로를 2배로 확장
      const fullWidthInch = file.widthInch * 2;

      return {
        ...file,
        // 확장된 크기로 업데이트
        widthPx: fullWidthPx,
        widthInch: fullWidthInch,
        ratio: calculateNormalizedRatio(fullWidthInch, file.heightInch),
        // 확장 정보 표시
        isExtended: true,
        extendPosition: file.coverType === 'FRONT_COVER' ? 'left' : 'right', // 빈영역 위치
        originalWidthPx: file.widthPx,
        originalWidthInch: file.widthInch,
        status: 'EXACT', // 확장 후 정확히 일치
        message: file.coverType === 'FRONT_COVER'
          ? '첫장 확장 (왼쪽 빈영역 추가)'
          : '막장 확장 (오른쪽 빈영역 추가)',
      };
    }

    return file;
  });
}

// 가장 가까운 표준 앨범규격 찾기
// 1. 정확히 일치하는 규격이 있으면 그것을 반환
// 2. 없으면 비율이 맞는 것 중 크기가 가장 가까운 규격 반환
function findClosestStandardSize(sizes: StandardSize[], albumWidth: number, albumHeight: number): StandardSize | null {
  if (sizes.length === 0) return null;

  // 1. 정확히 일치하는 규격 찾기 (허용 오차 0.15)
  const exactMatch = sizes.find(
    size => Math.abs(size.width - albumWidth) < 0.15 && Math.abs(size.height - albumHeight) < 0.15
  );
  if (exactMatch) return exactMatch;

  // 2. 비율이 일치하는 규격 중 크기가 가장 가까운 것 찾기 (등가 그룹 포함)
  const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);
  const ratioMatchSizes = sizes.filter(size => {
    const sizeRatio = calculateNormalizedRatio(size.width, size.height);
    return isRatioEquivalent(sizeRatio, albumRatio);
  });

  if (ratioMatchSizes.length > 0) {
    // 크기 차이가 가장 작은 것 선택
    let closestSize = ratioMatchSizes[0];
    let minSizeDiff = Math.abs(ratioMatchSizes[0].width - albumWidth) + Math.abs(ratioMatchSizes[0].height - albumHeight);

    for (const size of ratioMatchSizes) {
      const sizeDiff = Math.abs(size.width - albumWidth) + Math.abs(size.height - albumHeight);
      if (sizeDiff < minSizeDiff) {
        minSizeDiff = sizeDiff;
        closestSize = size;
      }
    }
    return closestSize;
  }

  // 3. 비율이 맞는 것이 없으면 비율이 가장 가까운 것 반환
  let closestSize = sizes[0];
  let minDiff = Infinity;

  for (const size of sizes) {
    const sizeRatio = calculateNormalizedRatio(size.width, size.height);
    const diff = Math.abs(sizeRatio - albumRatio);
    if (diff < minDiff) {
      minDiff = diff;
      closestSize = size;
    }
  }

  return closestSize;
}

export const useMultiFolderUploadStore = create<MultiFolderUploadState>((set, get) => ({
  ...initialState,

  setIndigoSpecs: (specs) => set({ indigoSpecs: specs }),

  addFolder: (folder) => {
    const { folders } = get();

    // 중복 감지 1: 같은 폴더명이 업로드 목록에 이미 존재하는지 확인
    const duplicate = folders.find(existing => existing.folderName === folder.folderName);

    if (duplicate) {
      return { added: false, reason: `"${folder.folderName}" 폴더가 이미 목록에 있습니다.` };
    }

    // 중복 감지 1-1: 같은 폴더명이 장바구니에 이미 존재하는지 확인
    const cartItems = useCartStore.getState().items;
    const cartDuplicate = cartItems.find(
      ci => ci.productType === 'album-order' && ci.albumOrderInfo?.folderName === folder.folderName
    );
    if (cartDuplicate) {
      return { added: false, reason: `"${folder.folderName}" 폴더가 이미 장바구니에 있습니다.` };
    }

    // 중복 감지 2: 파일명 + 파일크기 기준으로 개별 파일 중복 체크
    const existingFileKeys = new Set<string>();
    for (const f of folders) {
      for (const file of f.files) {
        existingFileKeys.add(`${file.fileName}:${file.fileSize}`);
      }
    }
    const duplicateFiles = folder.files.filter(file =>
      existingFileKeys.has(`${file.fileName}:${file.fileSize}`)
    );

    if (duplicateFiles.length === folder.files.length) {
      return { added: false, reason: `"${folder.folderName}" 폴더의 모든 파일이 이미 업로드되어 있습니다.` };
    }

    const validated = get().validateFolder({ ...folder, uploadedAt: Date.now() });
    set(state => ({
      folders: [validated, ...state.folders],
    }));

    if (duplicateFiles.length > 0) {
      return { added: true, reason: `${duplicateFiles.length}개 파일이 다른 폴더에 이미 존재합니다.` };
    }

    return { added: true };
  },

  updateFolder: (folderId, updates) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId ? { ...f, ...updates } : f
      ),
    }));
  },

  removeFolder: (folderId) => {
    set(state => ({
      folders: state.folders.filter(f => f.id !== folderId),
    }));
  },

  clearFolders: () => set({ folders: [] }),

  setFolderTitle: (folderId, title) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId ? { ...f, orderTitle: title } : f
      ),
    }));
  },

  setFolderQuantity: (folderId, quantity) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId ? { ...f, quantity: Math.max(1, quantity) } : f
      ),
    }));
  },

  setFolderSelected: (folderId, selected) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId ? { ...f, isSelected: selected } : f
      ),
    }));
  },

  approveFolder: (folderId) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId && f.validationStatus === 'RATIO_MATCH'
          ? { ...f, isApproved: true, isSelected: false }
          : f
      ),
    }));
  },

  setFolderPageLayout: (folderId, layout) => {
    const specs = get().indigoSpecs;
    set(state => ({
      folders: state.folders.map(f => {
        if (f.id !== folderId) return f;
        // 주문 유형 변경 시 앨범규격 재계산
        const { albumWidth: rawAlbumWidth, albumHeight: rawAlbumHeight } = calculateAlbumSize(
          f.fileSpecWidth,
          f.fileSpecHeight,
          layout
        );
        const albumRatio = calculateNormalizedRatio(rawAlbumWidth, rawAlbumHeight);
        const closestSize = findClosestStandardSize(specs, rawAlbumWidth, rawAlbumHeight);
        const isLandscape = rawAlbumWidth >= rawAlbumHeight; // 가로형 여부
        const availableSizes = findAvailableSizes(specs, albumRatio, isLandscape);

        // 앨범 크기를 가장 가까운 표준 규격으로 스냅
        const albumWidth = closestSize && Math.abs(rawAlbumWidth - closestSize.width) < 0.5 && Math.abs(rawAlbumHeight - closestSize.height) < 0.5
          ? closestSize.width : rawAlbumWidth;
        const albumHeight = closestSize && Math.abs(rawAlbumWidth - closestSize.width) < 0.5 && Math.abs(rawAlbumHeight - closestSize.height) < 0.5
          ? closestSize.height : rawAlbumHeight;

        // 페이지 수 재계산
        const fileCount = f.files.length;
        const pageCount = calculatePageCount(fileCount, layout, f.bindingDirection);

        return {
          ...f,
          pageLayout: layout,
          pageCount,
          albumWidth,
          albumHeight,
          albumRatio,
          albumLabel: closestSize ? closestSize.label : getSpecLabel(specs, albumWidth, albumHeight),
          specWidth: closestSize?.width ?? albumWidth,
          specHeight: closestSize?.height ?? albumHeight,
          specRatio: closestSize ? calculateNormalizedRatio(closestSize.width, closestSize.height) : albumRatio,
          specLabel: closestSize?.label ?? getSpecLabel(specs, albumWidth, albumHeight),
          availableSizes,
        };
      }),
    }));
  },

  setFolderBindingDirection: (folderId, direction) => {
    set(state => ({
      folders: state.folders.map(f => {
        if (f.id !== folderId) return f;

        // 페이지 수 재계산
        const fileCount = f.files.length;
        const pageCount = calculatePageCount(fileCount, f.pageLayout, direction);

        return {
          ...f,
          bindingDirection: direction,
          pageCount,
        };
      }),
    }));
  },

  setDefaultPageLayout: (layout) => set({ defaultPageLayout: layout }),

  setDefaultBindingDirection: (direction) => set({ defaultBindingDirection: direction }),

  addAdditionalOrder: (folderId, spec) => {
    set(state => ({
      folders: state.folders.map(f => {
        if (f.id !== folderId) return f;
        const newOrder: AdditionalOrder = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          albumWidth: spec.width,
          albumHeight: spec.height,
          albumLabel: spec.label,
          quantity: 1,
        };
        return {
          ...f,
          additionalOrders: [...f.additionalOrders, newOrder],
        };
      }),
    }));
  },

  removeAdditionalOrder: (folderId, orderId) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId
          ? { ...f, additionalOrders: f.additionalOrders.filter(o => o.id !== orderId) }
          : f
      ),
    }));
  },

  updateAdditionalOrderQuantity: (folderId, orderId, quantity) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId
          ? {
            ...f,
            additionalOrders: f.additionalOrders.map(o =>
              o.id === orderId ? { ...o, quantity: Math.max(1, quantity) } : o
            ),
          }
          : f
      ),
    }));
  },

  updateAdditionalOrderSpec: (folderId, orderId, spec) => {
    set(state => ({
      folders: state.folders.map(f =>
        f.id === folderId
          ? {
            ...f,
            additionalOrders: f.additionalOrders.map(o =>
              o.id === orderId
                ? { ...o, albumWidth: spec.width, albumHeight: spec.height, albumLabel: spec.label }
                : o
            ),
          }
          : f
      ),
    }));
  },

  changeFolderSpec: (folderId, spec) => {
    set(state => ({
      folders: state.folders.map(f => {
        if (f.id !== folderId) return f;
        return {
          ...f,
          albumWidth: spec.width,
          albumHeight: spec.height,
          albumLabel: spec.label,
          albumRatio: calculateNormalizedRatio(spec.width, spec.height),
          specWidth: spec.width,
          specHeight: spec.height,
          specLabel: spec.label,
          specRatio: calculateNormalizedRatio(spec.width, spec.height),
        };
      }),
    }));
  },

  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setTargetSpec: (width, height) => set({
    targetSpecWidth: width,
    targetSpecHeight: height,
    targetSpecRatio: calculateNormalizedRatio(width, height),
  }),

  getSelectedFolders: () => {
    return get().folders.filter(f =>
      f.isSelected &&
      (f.validationStatus === 'EXACT_MATCH' ||
        (f.validationStatus === 'RATIO_MATCH' && f.isApproved))
    );
  },

  validateFolder: (folder) => {
    const specs = get().indigoSpecs;

    // 1. 파일별 앨범규격 계산
    const filesWithAlbum = folder.files.map(file => {
      const fileAlbum = calculateAlbumSize(file.widthInch, file.heightInch, folder.pageLayout);
      const ratio = calculateNormalizedRatio(fileAlbum.albumWidth, fileAlbum.albumHeight);
      return {
        ...file,
        albumWidth: fileAlbum.albumWidth,
        albumHeight: fileAlbum.albumHeight,
        ratio,
      };
    });

    // 2. 가장 많은 비율을 가진 규격 찾기 (대표규격)
    const ratioCount: Record<string, { count: number; width: number; height: number; ratio: number }> = {};
    for (const file of filesWithAlbum) {
      // 비율을 소수점 3자리로 반올림하여 키로 사용
      const ratioKey = file.ratio.toFixed(3);
      if (!ratioCount[ratioKey]) {
        ratioCount[ratioKey] = { count: 0, width: file.albumWidth, height: file.albumHeight, ratio: file.ratio };
      }
      ratioCount[ratioKey].count++;
    }

    // 가장 많은 비율 찾기
    let representativeRatio = filesWithAlbum[0]?.ratio || 0;
    let representativeWidth = filesWithAlbum[0]?.albumWidth || 0;
    let representativeHeight = filesWithAlbum[0]?.albumHeight || 0;
    let maxCount = 0;

    for (const key in ratioCount) {
      if (ratioCount[key].count > maxCount) {
        maxCount = ratioCount[key].count;
        representativeRatio = ratioCount[key].ratio;
        representativeWidth = ratioCount[key].width;
        representativeHeight = ratioCount[key].height;
      }
    }

    // 대표규격에 맞는 표준 규격 찾기 (DB 인디고 규격 기반)
    const closestSize = findClosestStandardSize(specs, representativeWidth, representativeHeight);

    // 앨범 크기를 가장 가까운 표준 규격으로 스냅 (소수점 오차 보정)
    const albumWidth = closestSize && Math.abs(representativeWidth - closestSize.width) < 0.5 && Math.abs(representativeHeight - closestSize.height) < 0.5
      ? closestSize.width : representativeWidth;
    const albumHeight = closestSize && Math.abs(representativeWidth - closestSize.width) < 0.5 && Math.abs(representativeHeight - closestSize.height) < 0.5
      ? closestSize.height : representativeHeight;
    const albumRatio = calculateNormalizedRatio(albumWidth, albumHeight);

    // 3. 파일별 대표규격 대비 검증
    let exactCount = 0;
    let ratioMatchCount = 0;
    let mismatchCount = 0;
    const mismatchFiles: UploadedFile[] = [];

    const validatedFiles = filesWithAlbum.map(file => {
      // 대표규격과 비교
      const ratioDiff = Math.abs(file.ratio - representativeRatio);
      const sizeDiff = Math.abs(file.albumWidth - representativeWidth) + Math.abs(file.albumHeight - representativeHeight);

      let status: SizeMatchStatus;
      if (sizeDiff < 0.2) {
        // 크기가 거의 같음 (정확히 일치)
        status = 'EXACT';
        exactCount++;
      } else if (isRatioEquivalent(file.ratio, representativeRatio)) {
        // 비율은 같지만 크기가 다름 (비율 일치 - 노랑, 등가 그룹 포함)
        status = 'RATIO_MATCH';
        ratioMatchCount++;
      } else {
        // 비율이 다름 (불일치 - 빨강)
        status = 'RATIO_MISMATCH';
        mismatchCount++;
        mismatchFiles.push({ ...file, status });
      }

      return { ...file, status };
    });

    // 4. 첫장/막장이 반폭인 경우 빈페이지 추가
    const filesWithBlankPages = processHalfWidthCovers(
      validatedFiles,
      representativeWidth,
      representativeHeight,
      folder.pageLayout
    );

    // 페이지 정렬 (첫장 → 내지 → 막장)
    const sortedFiles = sortPagesByPosition(filesWithBlankPages);

    // 5. 순번 파일명 부여 (01_파일명 또는 001_파일명)
    const totalPages = sortedFiles.length;
    const renamedFiles = sortedFiles.map((file, index) => ({
      ...file,
      newFileName: generateSequentialFileName(index, file.fileName, totalPages),
    }));

    // 전체 폴더 상태 결정
    let validationStatus: FolderValidationStatus = 'PENDING';
    if (mismatchCount > 0) {
      validationStatus = 'RATIO_MISMATCH';
    } else if (ratioMatchCount > 0) {
      validationStatus = 'RATIO_MATCH';
    } else if (exactCount > 0) {
      validationStatus = 'EXACT_MATCH';
    }

    // 같은 비율의 가능 앨범규격 찾기 (DB 인디고 규격 기반, 방향도 일치해야 함)
    const isLandscape = albumWidth >= albumHeight; // 가로형 여부
    const availableSizes = findAvailableSizes(specs, albumRatio, isLandscape);

    // 페이지 수 계산 (파일수 + 편집스타일 + 제본방향 기반)
    const fileCount = renamedFiles.length;
    const pageCount = calculatePageCount(fileCount, folder.pageLayout, folder.bindingDirection);

    return {
      ...folder,
      files: renamedFiles,
      pageCount,
      validationStatus,
      exactMatchCount: exactCount,
      ratioMatchCount: ratioMatchCount,
      ratioMismatchCount: mismatchCount,
      mismatchFiles,
      availableSizes,
      // 대표규격 기준으로 표준 규격 설정 (스냅된 앨범 크기 사용)
      albumWidth,
      albumHeight,
      albumRatio,
      albumLabel: closestSize ? closestSize.label : getSpecLabel(specs, albumWidth, albumHeight),
      specWidth: closestSize?.width ?? albumWidth,
      specHeight: closestSize?.height ?? albumHeight,
      specRatio: closestSize ? calculateNormalizedRatio(closestSize.width, closestSize.height) : albumRatio,
      specLabel: closestSize?.label ?? getSpecLabel(specs, albumWidth, albumHeight),
      // 정확히 일치하는 경우만 자동 선택 가능
      isSelected: false,
      isApproved: validationStatus === 'EXACT_MATCH',
    };
  },

  // 파일 순서 변경 (드래그 앤 드롭)
  reorderFolderFiles: (folderId: string, fromIndex: number, toIndex: number) => {
    set(state => ({
      folders: state.folders.map(f => {
        if (f.id !== folderId) return f;
        const files = [...f.files];
        const [moved] = files.splice(fromIndex, 1);
        files.splice(toIndex, 0, moved);

        // 페이지 번호 및 순번 파일명 재할당
        const totalCount = files.length;
        const reindexed = files.map((file, idx) => ({
          ...file,
          pageNumber: idx + 1,
          newFileName: generateSequentialFileName(idx, file.fileName, totalCount),
        }));

        // 빈페이지 위치 변경에 따라 제본방향 재계산
        const firstPageBlank = reindexed[0]?.isBlankPage === true;
        const lastPageBlank = reindexed[reindexed.length - 1]?.isBlankPage === true;
        let bindingDirection = f.bindingDirection;
        let autoBindingDetected = false;

        if (firstPageBlank || lastPageBlank) {
          // 빈페이지가 첫/끝에 있으면 자동감지
          if (firstPageBlank && lastPageBlank) {
            bindingDirection = 'RIGHT_START_LEFT_END';
          } else if (firstPageBlank) {
            bindingDirection = 'RIGHT_START_RIGHT_END';
          } else {
            bindingDirection = 'LEFT_START_LEFT_END';
          }
          autoBindingDetected = true;
        } else {
          // 빈페이지가 첫/끝에 없으면 기본 좌시작→우끝
          bindingDirection = 'LEFT_START_RIGHT_END';
        }

        const pageCount = calculatePageCount(reindexed.length, f.pageLayout, bindingDirection);

        return {
          ...f,
          files: reindexed,
          firstPageBlank,
          lastPageBlank,
          autoBindingDetected,
          bindingDirection,
          pageCount,
        };
      }),
    }));
  },

  // 배송 정보
  setFolderShipping: (folderId: string, shipping: FolderShippingInfo) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === folderId ? { ...f, shippingInfo: shipping } : f
      ),
    }));
  },

  applyShippingToAll: (shipping: FolderShippingInfo) => {
    set((state) => ({
      folders: state.folders.map((f) => ({ ...f, shippingInfo: shipping })),
    }));
  },

  reset: () => set(initialState),
}));

// 유틸리티 함수들 export
export { checkRatioMatch, findAvailableSizes, getSpecLabel, findClosestStandardSize, RATIO_TOLERANCE, isRatioEquivalent };

// ==================== 견적 계산 ====================

// 인디고 출력 단가 (규격별, 면당) - 기본 4도
const INDIGO_PRINT_PRICES: Record<string, { single: number; spread: number }> = {
  '6x6': { single: 250, spread: 450 },
  '8x8': { single: 300, spread: 500 },
  '10x10': { single: 350, spread: 600 },
  '11x11': { single: 400, spread: 700 },
  '12x12': { single: 400, spread: 700 },
  '14x14': { single: 500, spread: 850 },
  '16x16': { single: 600, spread: 1000 },
  '12x8': { single: 350, spread: 600 },
  '15x10': { single: 450, spread: 750 },
  '14x11': { single: 450, spread: 750 },
  default: { single: 400, spread: 700 },
};

// 표지 단가
const COVER_PRICE = 5000;

// 규격 키 추출
function getSpecKey(width: number, height: number): string {
  return `${Math.round(width)}x${Math.round(height)}`;
}

/**
 * 폴더(주문건) 견적 계산
 */
export function calculateUploadedFolderPrice(folder: UploadedFolder): {
  pricePerPage: number;
  pageCount: number;
  printPrice: number;
  coverPrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  tax: number;
  totalPrice: number;
} {
  const specKey = getSpecKey(folder.albumWidth, folder.albumHeight);
  const prices = INDIGO_PRINT_PRICES[specKey] || INDIGO_PRINT_PRICES.default;
  const pricePerPage = folder.pageLayout === 'spread' ? prices.spread : prices.single;

  const printPrice = pricePerPage * folder.pageCount;
  const coverPrice = COVER_PRICE;
  const unitPrice = printPrice + coverPrice;
  const quantity = folder.quantity;
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * 0.1);
  const totalPrice = subtotal + tax;

  return {
    pricePerPage,
    pageCount: folder.pageCount,
    printPrice,
    coverPrice,
    unitPrice,
    quantity,
    subtotal,
    tax,
    totalPrice,
  };
}

/**
 * 추가 주문 건 견적 계산
 */
export function calculateAdditionalOrderPrice(
  order: AdditionalOrder,
  folder: UploadedFolder
): {
  pricePerPage: number;
  pageCount: number;
  printPrice: number;
  coverPrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  tax: number;
  totalPrice: number;
} {
  const specKey = getSpecKey(order.albumWidth, order.albumHeight);
  const prices = INDIGO_PRINT_PRICES[specKey] || INDIGO_PRINT_PRICES.default;
  const pricePerPage = folder.pageLayout === 'spread' ? prices.spread : prices.single;

  const printPrice = pricePerPage * folder.pageCount;
  const coverPrice = COVER_PRICE;
  const unitPrice = printPrice + coverPrice;
  const quantity = order.quantity;
  const subtotal = unitPrice * quantity;
  const tax = Math.round(subtotal * 0.1);
  const totalPrice = subtotal + tax;

  return { pricePerPage, pageCount: folder.pageCount, printPrice, coverPrice, unitPrice, quantity, subtotal, tax, totalPrice };
}

/**
 * 여러 폴더 총 견적 계산
 */
export function calculateTotalUploadedPrice(folders: UploadedFolder[]): {
  folderPrices: Array<{ folderId: string; price: ReturnType<typeof calculateUploadedFolderPrice> }>;
  totalQuantity: number;
  subtotal: number;
  tax: number;
  totalPrice: number;
} {
  const folderPrices = folders.map(folder => ({
    folderId: folder.id,
    price: calculateUploadedFolderPrice(folder),
  }));

  const totalQuantity = folderPrices.reduce((sum, fp) => sum + fp.price.quantity, 0);
  const subtotal = folderPrices.reduce((sum, fp) => sum + fp.price.subtotal, 0);
  const tax = Math.round(subtotal * 0.1);
  const totalPrice = subtotal + tax;

  return {
    folderPrices,
    totalQuantity,
    subtotal,
    tax,
    totalPrice,
  };
}
