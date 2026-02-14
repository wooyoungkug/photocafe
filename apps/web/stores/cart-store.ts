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
  recipientPostalCode: string;
  recipientAddress: string;
  recipientAddressDetail: string;
  deliveryMethod: string;
  deliveryFee: number;
  deliveryFeeType: string;
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
  fabricName?: string;             // 원단명
  foilName?: string;               // 박 동판명
  foilColor?: string;              // 박 색상
  foilPosition?: string;           // 박 위치
  totalSize?: number;              // 총 용량 (bytes)
  shippingInfo?: CartShippingInfo; // 배송 정보
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
}

interface CartState {
  items: CartItem[];

  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateOptions: (id: string, options: CartItemOption[]) => void;
  updateItemShipping: (id: string, shippingInfo: CartShippingInfo) => void;
  updateAllItemsShipping: (shippingInfo: CartShippingInfo) => void;
  updateAlbumInfo: (id: string, updates: Partial<AlbumOrderCartInfo>) => void;
  reorderItems: (items: CartItem[]) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateItemTotal(basePrice: number, quantity: number, options: CartItemOption[]): number {
  const optionsTotal = options.reduce((sum, opt) => sum + opt.price, 0);
  return (basePrice + optionsTotal) * quantity;
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
      // thumbnailUrls는 대용량이므로 localStorage 저장에서 제외 (메모리에만 유지)
      partialize: (state) => ({
        items: state.items.map(({ thumbnailUrls, files, ...rest }) => rest),
      }),
      storage: {
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch (e) {
            // QuotaExceededError 방지 - 저장 실패해도 메모리 상태는 유지
            console.warn('Cart storage quota exceeded, data kept in memory only');
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // ignore
          }
        },
      },
    }
  )
);
