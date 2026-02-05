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

// 앨범/화보 주문 정보
export interface AlbumOrderCartInfo {
  folderId: string;                // 폴더 ID
  folderName: string;              // 폴더명
  fileCount: number;               // 파일 수
  pageCount: number;               // 페이지 수
  printMethod: 'indigo' | 'inkjet'; // 출력기종
  colorMode: '4c' | '6c';          // 도수
  pageLayout: 'single' | 'spread'; // 페이지 레이아웃
  bindingDirection: string;        // 제본방향
  specificationId: string;         // 규격 ID
  specificationName: string;       // 규격명
  totalSize?: number;              // 총 용량 (bytes)
}

export interface CartItem {
  id: string;
  productId: string;
  productType: 'product' | 'half_product' | 'album-order';
  name: string;
  thumbnailUrl?: string;
  basePrice: number;
  quantity: number;
  options: CartItemOption[];
  totalPrice: number;
  files?: Array<{
    name: string;
    url: string;
  }>;
  copperPlateInfo?: CopperPlateCartInfo; // 동판 정보 (변경 감지용)
  albumOrderInfo?: AlbumOrderCartInfo;   // 앨범/화보 주문 정보
}

interface CartState {
  items: CartItem[];

  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateOptions: (id: string, options: CartItemOption[]) => void;
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
        const newItem: CartItem = {
          ...item,
          id: generateId(),
          totalPrice: calculateItemTotal(item.basePrice, item.quantity, item.options),
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
    }
  )
);
