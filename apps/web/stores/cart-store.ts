'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemOption {
  name: string;
  value: string;
  price: number;
}

// 동판 정보 (박 색상/위치 변경 감지용)
export interface CopperPlateCartInfo {
  copperPlateId: string;           // 동판 ID
  plateName: string;               // 동판명
  originalFoilColor: string;       // 원래 박색상 코드
  originalFoilColorName: string;   // 원래 박색상 이름
  originalFoilPosition: string;    // 원래 박위치 코드
  originalFoilPositionName: string;// 원래 박위치 이름
  selectedFoilColor: string;       // 선택한 박색상 코드
  selectedFoilColorName: string;   // 선택한 박색상 이름
  selectedFoilPosition: string;    // 선택한 박위치 코드
  selectedFoilPositionName: string;// 선택한 박위치 이름
}

// 폴더별 배송 정보 (cart 전달용)
export interface CartShippingInfo {
  senderType: string;
  senderName: string;
  senderPhone: string;
  senderPostalCode: string;
  senderAddress: string;
  senderAddressDetail: string;
  receiverType: string;
  recipientName: string;
  recipientPhone: string;
  recipientPhone2?: string;
  recipientPostalCode: string;
  recipientAddress: string;
  recipientAddressDetail: string;
  deliveryMethod: string;
  deliveryFee: number;
  deliveryFeeType: string;
  deliveryMemo?: string;
}

// 앨범/화보 주문 정보
export interface AlbumOrderCartInfo {
  folderId: string;                // 폴더 ID
  folderName: string;              // 폴더명
  fileCount: number;               // 파일 수
  pageCount: number;               // 페이지 수
  printMethod: 'indigo' | 'inkjet'; // 출력기종
  colorMode: '4c' | '6c';          // 도수
  pageLayout: 'single' | 'spread'; // 페이지 레이아웃 (편집스타일)
  bindingDirection: string;        // 제본방향
  specificationId: string;         // 규격 ID
  specificationName: string;       // 규격명
  bindingName?: string;            // 제본방법명
  paperName?: string;              // 용지명
  paperId?: string;                // 용지 ID
  paperPrice?: number;             // 용지 추가단가 (가격 재계산용)
  coverMaterial?: string;          // 커버 재질
  foilName?: string;               // 박 동판명
  foilColor?: string;              // 박 색상
  foilPosition?: string;           // 박 위치
  totalSize?: number;              // 총 용량 (bytes)
  shippingInfo?: CartShippingInfo; // 배송 정보
  // 원단 (앨범 표지)
  coverSourceType?: 'fabric' | 'design';
  fabricId?: string;               // 원단 ID
  fabricName?: string;             // 원단명
  fabricThumbnail?: string;        // 원단 썸네일
  fabricColorCode?: string;        // 원단 색상 코드
  fabricColorName?: string;        // 원단 색상명
  fabricCategory?: string;         // 원단 카테고리
  fabricBasePrice?: number;        // 원단 단가 (주문 시점)
}

export interface CartItem {
  id: string;
  productId: string;
  productType: 'product' | 'half_product' | 'album-order';
  name: string;
  thumbnailUrl?: string;
  thumbnailUrls?: string[];             // 전체 파일 썸네일 목록
  basePrice: number;
  quantity: number;
  options: CartItemOption[];
  totalPrice: number;
  addedAt: string; // 장바구니 저장 날짜 (ISO string)
  files?: Array<{
    name: string;
    url: string;
  }>;
  copperPlateInfo?: CopperPlateCartInfo; // 동판 정보 (변경 감지용)
  albumOrderInfo?: AlbumOrderCartInfo;   // 앨범/화보 주문 정보
  shippingInfo?: CartShippingInfo;       // 장바구니 배송지 정보
  isDuplicateOverride?: boolean;         // 중복 경고 무시 여부
  // 원본 파일 업로드 상태
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  uploadProgress?: number;               // 0-100
  uploadedFileCount?: number;
  totalFileCount?: number;
  serverFiles?: Array<{
    tempFileId: string;
    fileUrl: string;
    thumbnailUrl: string;
    sortOrder: number;
    fileName: string;
    widthPx: number;
    heightPx: number;
    widthInch: number;
    heightInch: number;
    dpi: number;
    fileSize: number;
  }>;
  tempFolderId?: string;                 // 임시 폴더 ID
}

interface CartState {
  items: CartItem[];

  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  addItems: (items: Omit<CartItem, 'id' | 'addedAt'>[]) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateOptions: (id: string, options: CartItemOption[]) => void;
  updateItemShipping: (id: string, shippingInfo: CartShippingInfo) => void;
  updateAllItemsShipping: (shippingInfo: CartShippingInfo) => void;
  updateAlbumInfo: (id: string, updates: Partial<AlbumOrderCartInfo>) => void;
  updateItemPrice: (id: string, basePrice: number) => void;
  updateUploadStatus: (id: string, updates: Partial<Pick<CartItem, 'uploadStatus' | 'uploadProgress' | 'uploadedFileCount' | 'totalFileCount' | 'serverFiles' | 'tempFolderId'>>) => void;
  reorderItems: (items: CartItem[]) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function calculateItemTotal(basePrice: number, quantity: number, options: CartItemOption[]): number {
  const optionsTotal = options.reduce((sum, opt) => sum + opt.price, 0);
  return (basePrice + optionsTotal) * quantity;
}

// IndexedDB 기반 스토리지 어댑터 (localStorage 5MB 한도 → IndexedDB 수백MB)
function createCartStorage() {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null as any,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  const DB_NAME = 'printing114';
  const STORE_NAME = 'cart';
  let db: IDBDatabase | null = null;

  const openDB = (): Promise<IDBDatabase> => {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME))
          req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => { db = req.result; resolve(db!); };
      req.onerror = () => reject(req.error);
    });
  };

  let migrated = false;

  return {
    getItem: async (name: string) => {
      try {
        const idb = await openDB();
        const result = await new Promise<any>((res) => {
          const tx = idb.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(name);
          req.onsuccess = () => res(req.result ?? null);
          req.onerror = () => res(null);
        });
        if (result) return result;

        // localStorage → IndexedDB 1회 마이그레이션
        if (!migrated) {
          migrated = true;
          try {
            const str = localStorage.getItem(name);
            if (str) {
              const data = JSON.parse(str);
              await new Promise<void>((res) => {
                const tx = idb.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(data, name);
                tx.oncomplete = () => res();
                tx.onerror = () => res();
              });
              localStorage.removeItem(name);
              return data;
            }
          } catch { /* migration failed, continue */ }
        }
        return null;
      } catch {
        // IndexedDB 불가 시 localStorage 폴백
        try {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        } catch { return null; }
      }
    },
    setItem: async (name: string, value: any) => {
      try {
        const idb = await openDB();
        await new Promise<void>((res) => {
          const tx = idb.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(value, name);
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        });
      } catch {
        try { localStorage.setItem(name, JSON.stringify(value)); } catch { /* quota exceeded */ }
      }
    },
    removeItem: async (name: string) => {
      try {
        const idb = await openDB();
        await new Promise<void>((res) => {
          const tx = idb.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(name);
          tx.oncomplete = () => res();
          tx.onerror = () => res();
        });
      } catch { /* ignore */ }
      try { localStorage.removeItem(name); } catch { /* ignore */ }
    },
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const { items } = get();

        // album-order는 각 폴더가 고유한 주문이므로 절대 병합하지 않음
        // 같은 상품 + 같은 옵션 조합이면 수량만 증가 (일반 상품만)
        const optionsKey = (opts: CartItemOption[]) =>
          opts.map(o => `${o.name}:${o.value}`).sort().join('|');

        const existing = item.productType !== 'album-order'
          ? items.find(
              (i) =>
                i.productId === item.productId &&
                i.productType === item.productType &&
                optionsKey(i.options) === optionsKey(item.options)
            )
          : undefined;

        if (existing) {
          const newQty = existing.quantity + item.quantity;
          set((state) => ({
            items: state.items.map((i) =>
              i.id === existing.id
                ? {
                    ...i,
                    quantity: newQty,
                    totalPrice: calculateItemTotal(i.basePrice, newQty, i.options),
                  }
                : i
            ),
          }));
          return;
        }

        const newItem: CartItem = {
          ...item,
          id: generateId(),
          totalPrice: item.productType === 'album-order' && item.totalPrice > 0
            ? item.totalPrice
            : calculateItemTotal(item.basePrice, item.quantity, item.options),
          addedAt: new Date().toISOString(),
        };
        set((state) => ({
          items: [...state.items, newItem],
        }));
      },

      addItems: (newItems) => {
        const items = newItems.map(item => ({
          ...item,
          id: generateId(),
          totalPrice: item.productType === 'album-order' && item.totalPrice > 0
            ? item.totalPrice
            : calculateItemTotal(item.basePrice, item.quantity, item.options),
          addedAt: new Date().toISOString(),
        }));
        set((state) => ({
          items: [...state.items, ...items],
        }));
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity < 1) return;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity,
                  totalPrice: calculateItemTotal(item.basePrice, quantity, item.options),
                }
              : item
          ),
        }));
      },

      updateOptions: (id, options) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  options,
                  totalPrice: calculateItemTotal(item.basePrice, item.quantity, options),
                }
              : item
          ),
        }));
      },

      updateItemShipping: (id, shippingInfo) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, shippingInfo }
              : item
          ),
        }));
      },

      updateAllItemsShipping: (shippingInfo) => {
        set((state) => ({
          items: state.items.map((item) => ({ ...item, shippingInfo })),
        }));
      },

      updateAlbumInfo: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && item.albumOrderInfo
              ? { ...item, albumOrderInfo: { ...item.albumOrderInfo, ...updates } }
              : item
          ),
        }));
      },

      updateItemPrice: (id, basePrice) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, basePrice, totalPrice: calculateItemTotal(basePrice, item.quantity, item.options) }
              : item
          ),
        }));
      },

      updateUploadStatus: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      reorderItems: (items) => {
        set({ items });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.totalPrice, 0);
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      // thumbnailUrls 등 대용량/휘발성 데이터만 제외, serverFiles는 유지 (새로고침 후 유실 방지)
      partialize: (state) => ({
        items: state.items.map(({ thumbnailUrls, files, uploadProgress, uploadedFileCount, totalFileCount, ...rest }) => rest),
      }),
      storage: createCartStorage(),
    }
  )
);
