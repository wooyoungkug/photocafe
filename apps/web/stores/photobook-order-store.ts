import { create } from 'zustand';
import { useCartStore } from './cart-store';
import {
  calculateNormalizedRatio,
  calculatePageCount,
  validateFolderFiles,
  type SizeMatchStatus,
  type FolderValidationResult,
} from '@/lib/album-utils';

// 편집 스타일
export type EditStyle = 'SINGLE' | 'SPREAD';

// 제본 방향
export type BindingDirection =
  | 'LEFT_START_RIGHT_END'
  | 'LEFT_START_LEFT_END'
  | 'RIGHT_START_LEFT_END'
  | 'RIGHT_START_RIGHT_END';

// 코팅 타입
export type CoatingType = 'NONE' | 'MATTE' | 'GLOSSY' | 'VELVET';

// 검증 상태
export type ValidationStatus = 'PENDING' | 'PASS' | 'APPROVED' | 'REJECTED';

// 업로드된 파일
export interface PhotobookFile {
  id: string;
  file?: File;
  fileName: string;
  originalName: string;
  filePath?: string;
  fileSize: number;
  pageNumber: number;

  // 이미지 메타
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthInch: number;
  heightInch: number;
  colorSpace?: string;

  // 검증
  sizeMatchStatus: SizeMatchStatus;
  ratio: number;
  validationMessage?: string;
}

// 스토어 상태
interface PhotobookOrderState {
  // STEP 1: 편집 옵션
  editStyle: EditStyle;
  bindingDirection: BindingDirection;

  // STEP 2: 마감재
  fabricId: string | null;
  fabricName: string | null;
  coatingType: CoatingType;
  coatingId: string | null;

  // STEP 3: 수량
  quantity: number;

  // STEP 4: 파일 정보
  orderTitle: string;
  files: PhotobookFile[];
  specWidth: number;
  specHeight: number;
  specRatio: number;
  dpi: number;
  pageCount: number;
  totalFileSize: number;
  validationStatus: ValidationStatus;
  validationResult: FolderValidationResult | null;

  // 액션
  setEditStyle: (style: EditStyle) => void;
  setBindingDirection: (direction: BindingDirection) => void;
  setFabric: (id: string | null, name: string | null) => void;
  setCoating: (type: CoatingType, id: string | null) => void;
  setQuantity: (qty: number) => void;
  setOrderTitle: (title: string) => void;
  addFiles: (files: PhotobookFile[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  setSpec: (width: number, height: number) => void;
  validateFiles: () => void;
  approveValidation: () => void;
  addToCart: (productId: string, productName: string) => void;
  reset: () => void;
}

const initialState = {
  // STEP 1
  editStyle: 'SINGLE' as EditStyle,
  bindingDirection: 'LEFT_START_RIGHT_END' as BindingDirection,

  // STEP 2
  fabricId: null,
  fabricName: null,
  coatingType: 'NONE' as CoatingType,
  coatingId: null,

  // STEP 3
  quantity: 1,

  // STEP 4
  orderTitle: '',
  files: [] as PhotobookFile[],
  specWidth: 0,
  specHeight: 0,
  specRatio: 0,
  dpi: 300,
  pageCount: 0,
  totalFileSize: 0,
  validationStatus: 'PENDING' as ValidationStatus,
  validationResult: null as FolderValidationResult | null,
};

export const usePhotobookOrderStore = create<PhotobookOrderState>((set, get) => ({
  ...initialState,

  setEditStyle: (style) => {
    set({ editStyle: style });
    // 페이지 수 재계산
    const { files } = get();
    set({ pageCount: calculatePageCount(files.length, style) });
  },

  setBindingDirection: (direction) => set({ bindingDirection: direction }),

  setFabric: (id, name) => set({ fabricId: id, fabricName: name }),

  setCoating: (type, id) => set({ coatingType: type, coatingId: id }),

  setQuantity: (qty) => set({ quantity: Math.max(1, qty) }),

  setOrderTitle: (title) => set({ orderTitle: title }),

  addFiles: (newFiles) => {
    const { files, editStyle } = get();
    const updatedFiles = [...files, ...newFiles];

    // 첫 번째 파일 기준으로 규격 설정
    if (updatedFiles.length > 0 && get().specWidth === 0) {
      const firstFile = updatedFiles[0];
      set({
        specWidth: Math.round(firstFile.widthInch * 10) / 10,
        specHeight: Math.round(firstFile.heightInch * 10) / 10,
        specRatio: calculateNormalizedRatio(firstFile.widthInch, firstFile.heightInch),
        dpi: firstFile.dpi,
      });
    }

    // 총 용량 계산
    const totalSize = updatedFiles.reduce((sum, f) => sum + f.fileSize, 0);

    set({
      files: updatedFiles,
      pageCount: calculatePageCount(updatedFiles.length, editStyle),
      totalFileSize: totalSize,
    });

    // 자동 검증
    get().validateFiles();
  },

  removeFile: (id) => {
    const { files, editStyle } = get();
    const updatedFiles = files.filter((f) => f.id !== id);
    const totalSize = updatedFiles.reduce((sum, f) => sum + f.fileSize, 0);

    set({
      files: updatedFiles,
      pageCount: calculatePageCount(updatedFiles.length, editStyle),
      totalFileSize: totalSize,
    });

    get().validateFiles();
  },

  clearFiles: () => {
    set({
      files: [],
      pageCount: 0,
      totalFileSize: 0,
      specWidth: 0,
      specHeight: 0,
      specRatio: 0,
      validationStatus: 'PENDING',
      validationResult: null,
    });
  },

  setSpec: (width, height) => {
    set({
      specWidth: width,
      specHeight: height,
      specRatio: calculateNormalizedRatio(width, height),
    });
    get().validateFiles();
  },

  validateFiles: () => {
    const { files, specWidth, specHeight } = get();

    if (files.length === 0 || specWidth === 0) {
      set({ validationStatus: 'PENDING', validationResult: null });
      return;
    }

    const result = validateFolderFiles(
      files.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        widthInch: f.widthInch,
        heightInch: f.heightInch,
        dpi: f.dpi,
      })),
      specWidth,
      specHeight
    );

    // 파일별 상태 업데이트
    const updatedFiles = files.map((file) => {
      const fileResult = result.files.find((r) => r.fileId === file.id);
      return {
        ...file,
        sizeMatchStatus: fileResult?.status || 'PENDING',
        validationMessage: fileResult?.message,
      };
    });

    set({
      files: updatedFiles,
      validationResult: result,
      validationStatus: result.overallStatus === 'PASS' ? 'PASS' :
                       result.overallStatus === 'REJECTED' ? 'REJECTED' : 'PENDING',
    });
  },

  approveValidation: () => {
    const { validationStatus } = get();
    if (validationStatus === 'PENDING') {
      set({ validationStatus: 'APPROVED' });
    }
  },

  addToCart: (productId, productName) => {
    const state = get();
    const { addItem } = useCartStore.getState();

    const options = [
      { name: '편집방식', value: state.editStyle === 'SINGLE' ? '낱장' : '펼침면', price: 0 },
      { name: '제본방향', value: getBindingDirectionLabel(state.bindingDirection), price: 0 },
      { name: '규격', value: `${state.specWidth}x${state.specHeight}inch`, price: 0 },
      { name: '페이지', value: `${state.pageCount}p`, price: 0 },
      { name: '원단', value: state.fabricName || '-', price: 0 },
      { name: '코팅', value: getCoatingLabel(state.coatingType), price: 0 },
    ];

    addItem({
      productId,
      productType: 'album-order',
      name: `${productName} - ${state.orderTitle || '화보'}`,
      basePrice: 0, // 가격은 백엔드에서 계산
      quantity: state.quantity,
      options,
      totalPrice: 0,
      albumOrderInfo: {
        folderId: '',
        folderName: state.orderTitle,
        fileCount: state.files.length,
        pageCount: state.pageCount,
        printMethod: 'indigo',
        colorMode: '4c',
        pageLayout: state.editStyle === 'SINGLE' ? 'single' : 'spread',
        bindingDirection: state.bindingDirection,
        specificationId: '',
        specificationName: `${state.specWidth}x${state.specHeight}`,
      },
    });
  },

  reset: () => set(initialState),
}));

// 헬퍼 함수
function getBindingDirectionLabel(direction: BindingDirection): string {
  const labels: Record<BindingDirection, string> = {
    LEFT_START_RIGHT_END: '좌시우끝',
    LEFT_START_LEFT_END: '좌시좌끝',
    RIGHT_START_LEFT_END: '우시좌끝',
    RIGHT_START_RIGHT_END: '우시우끝',
  };
  return labels[direction];
}

function getCoatingLabel(type: CoatingType): string {
  const labels: Record<CoatingType, string> = {
    NONE: '무코팅',
    MATTE: '무광',
    GLOSSY: '유광',
    VELVET: '벨벳',
  };
  return labels[type];
}
