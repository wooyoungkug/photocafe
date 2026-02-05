'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 출력기종 타입
export type PrintMethod = 'indigo' | 'inkjet';

// 도수 타입 (4도=CMYK, 6도=CMYK+OV)
export type ColorMode = '4c' | '6c';

// 페이지 레이아웃 타입
export type PageLayout = 'single' | 'spread';

// 제본방향 타입
export type BindingDirection = 'ltr-rend' | 'ltr-lend' | 'rtl-lend' | 'rtl-rend';

// 인쇄면 타입
export type PrintSide = 'single' | 'double';

// 업로드된 파일 정보
export interface AlbumUploadedFile {
  id: string;
  file?: File;
  filename: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  widthPx: number;
  heightPx: number;
  widthInch: number;
  heightInch: number;
  dpi: number;
  fileSize: number;
  sortOrder: number;
  isFirst: boolean;           // 첫장 여부
  isLast: boolean;            // 막장 여부
  isCoverPage: boolean;       // 첫막장 파일 (분리 대상)
  hasRatioWarning: boolean;   // 비율 불일치 경고
  ratioScale?: number;        // 비율 확대 스케일
  warningMessage?: string;
  relativePath?: string;      // 상대 경로 (폴더 구조 유지)
  newName?: string;           // 변환된 파일명 (001_xxx)
}

// 폴더 데이터
export interface AlbumFolderData {
  id: string;
  folderName: string;
  folderPath: string;
  files: AlbumUploadedFile[];
  // 분석 결과
  representativeSpec?: {
    widthInch: number;
    heightInch: number;
    widthPx: number;
    heightPx: number;
  };
  totalSize: number;          // 총 용량 (bytes)
  fileCount: number;          // 파일 수
  pageCount: number;          // 페이지 수 (펼침면일 경우 다를 수 있음)
  quantity: number;           // 부수 (기본 1)
  hasRatioMismatch: boolean;  // 비율 불일치 파일 존재
}

// 앨범 주문 스텝
export type AlbumOrderStep =
  | 'print-method'      // Step 1: 출력기종/도수
  | 'page-layout'       // Step 2: 낱장/펼침면 + 제본방향
  | 'data-upload'       // Step 3: 데이터 업로드
  | 'folder-analysis'   // Step 4: 폴더별 분석
  | 'specification';    // Step 5: 규격 선택

// 앨범 주문 상태
interface AlbumOrderState {
  // 현재 스텝
  currentStep: AlbumOrderStep;

  // Step 1: 출력기종/도수
  printMethod: PrintMethod;
  colorMode: ColorMode;

  // Step 2: 제본/페이지 레이아웃
  bindingId: string;                    // 제본방법 ID (상품 페이지에서 전달)
  bindingName: string;                  // 제본방법명
  pageLayout: PageLayout;               // 낱장/펼침면
  bindingDirection: BindingDirection;   // 제본방향
  printSide: PrintSide;                 // 단면/양면 (제본에 따라 자동)

  // Step 3-4: 업로드 데이터
  folders: AlbumFolderData[];

  // Step 5: 규격
  selectedSpecificationId: string;
  selectedSpecificationName: string;

  // 상품 정보 (상품 페이지에서 전달)
  productId: string;
  productName: string;

  // 액션들
  setCurrentStep: (step: AlbumOrderStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Step 1 액션
  setPrintMethod: (method: PrintMethod) => void;
  setColorMode: (mode: ColorMode) => void;

  // Step 2 액션
  setBindingInfo: (id: string, name: string) => void;
  setPageLayout: (layout: PageLayout) => void;
  setBindingDirection: (direction: BindingDirection) => void;
  setPrintSide: (side: PrintSide) => void;

  // Step 3-4 액션
  setFolders: (folders: AlbumFolderData[]) => void;
  addFolder: (folder: AlbumFolderData) => void;
  updateFolder: (folderId: string, data: Partial<AlbumFolderData>) => void;
  removeFolder: (folderId: string) => void;
  updateFolderQuantity: (folderId: string, quantity: number) => void;

  // Step 5 액션
  setSpecification: (id: string, name: string) => void;

  // 상품 정보 액션
  setProductInfo: (productId: string, productName: string) => void;

  // 초기화
  reset: () => void;

  // 유틸리티
  canProceedToNext: () => boolean;
  getTotalFiles: () => number;
  getTotalSize: () => number;
}

// 스텝 순서
const STEP_ORDER: AlbumOrderStep[] = [
  'print-method',
  'page-layout',
  'data-upload',
  'folder-analysis',
  'specification',
];

// ID 생성
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 초기 상태
const initialState = {
  currentStep: 'print-method' as AlbumOrderStep,
  printMethod: 'indigo' as PrintMethod,
  colorMode: '4c' as ColorMode,
  bindingId: '',
  bindingName: '',
  pageLayout: 'single' as PageLayout,
  bindingDirection: 'ltr-rend' as BindingDirection,
  printSide: 'double' as PrintSide,
  folders: [] as AlbumFolderData[],
  selectedSpecificationId: '',
  selectedSpecificationName: '',
  productId: '',
  productName: '',
};

export const useAlbumOrderStore = create<AlbumOrderState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 스텝 관리
      setCurrentStep: (step) => set({ currentStep: step }),

      nextStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },

      prevStep: () => {
        const currentIndex = STEP_ORDER.indexOf(get().currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },

      // Step 1: 출력기종/도수
      setPrintMethod: (method) => set({ printMethod: method }),
      setColorMode: (mode) => set({ colorMode: mode }),

      // Step 2: 제본/페이지 레이아웃
      setBindingInfo: (id, name) => set({ bindingId: id, bindingName: name }),
      setPageLayout: (layout) => set({ pageLayout: layout }),
      setBindingDirection: (direction) => set({ bindingDirection: direction }),
      setPrintSide: (side) => set({ printSide: side }),

      // Step 3-4: 폴더 관리
      setFolders: (folders) => set({ folders }),

      addFolder: (folder) => set((state) => ({
        folders: [...state.folders, { ...folder, id: folder.id || generateId() }],
      })),

      updateFolder: (folderId, data) => set((state) => ({
        folders: state.folders.map((folder) =>
          folder.id === folderId ? { ...folder, ...data } : folder
        ),
      })),

      removeFolder: (folderId) => set((state) => ({
        folders: state.folders.filter((folder) => folder.id !== folderId),
      })),

      updateFolderQuantity: (folderId, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === folderId ? { ...folder, quantity } : folder
          ),
        }));
      },

      // Step 5: 규격
      setSpecification: (id, name) => set({
        selectedSpecificationId: id,
        selectedSpecificationName: name,
      }),

      // 상품 정보
      setProductInfo: (productId, productName) => set({ productId, productName }),

      // 초기화
      reset: () => set(initialState),

      // 유틸리티
      canProceedToNext: () => {
        const state = get();
        switch (state.currentStep) {
          case 'print-method':
            return !!state.printMethod && !!state.colorMode;
          case 'page-layout':
            return !!state.pageLayout && !!state.bindingDirection;
          case 'data-upload':
            return state.folders.length > 0 && state.folders.some(f => f.files.length > 0);
          case 'folder-analysis':
            return state.folders.every(f => f.fileCount > 0);
          case 'specification':
            return !!state.selectedSpecificationId;
          default:
            return false;
        }
      },

      getTotalFiles: () => {
        return get().folders.reduce((sum, folder) => sum + folder.fileCount, 0);
      },

      getTotalSize: () => {
        return get().folders.reduce((sum, folder) => sum + folder.totalSize, 0);
      },
    }),
    {
      name: 'album-order-storage',
      // File 객체는 직렬화할 수 없으므로 제외
      partialize: (state) => ({
        ...state,
        folders: state.folders.map(folder => ({
          ...folder,
          files: folder.files.map(file => ({
            ...file,
            file: undefined, // File 객체 제외
          })),
        })),
      }),
    }
  )
);

// 제본방향 라벨
export const BINDING_DIRECTION_LABELS: Record<BindingDirection, string> = {
  'ltr-rend': '좌 시작 → 우 끝',
  'ltr-lend': '좌 시작 → 좌 끝',
  'rtl-lend': '우 시작 → 좌 끝',
  'rtl-rend': '우 시작 → 우 끝',
};

// 페이지 레이아웃 라벨
export const PAGE_LAYOUT_LABELS: Record<PageLayout, string> = {
  'single': '낱장',
  'spread': '펼침면',
};

// 출력기종 라벨
export const PRINT_METHOD_LABELS: Record<PrintMethod, string> = {
  'indigo': '인디고',
  'inkjet': '잉크젯',
};

// 도수 라벨
export const COLOR_MODE_LABELS: Record<ColorMode, string> = {
  '4c': '4도 (CMYK)',
  '6c': '6도 (CMYK+OV)',
};
