'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItemOption {
  name: string;
  value: string;
  price: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productType: 'product' | 'half_product';
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
