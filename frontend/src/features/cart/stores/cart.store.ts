import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { IProduct } from '@/shared/types/catalog'

import type { CartAvailabilityStatusType, ICartAvailabilityChange, ICartItem } from '../types/cart'
import { reconcileCartItems } from '../utils/cart-availability'

interface ICartStore {
  availabilityChanges: ICartAvailabilityChange[]
  availabilityStatus: CartAvailabilityStatusType
  beginAvailabilityCheck: () => void
  clearCart: () => void
  closeCart: () => void
  dismissAvailabilityChanges: () => void
  dismissSuccessMessage: () => void
  failAvailabilityCheck: () => void
  isCartOpen: boolean
  items: ICartItem[]
  addItem: (product: IProduct, quantity: number) => boolean
  openCart: () => void
  removeItem: (productId: string) => void
  successMessage: string | null
  syncProducts: (products: IProduct[]) => void
  updateItemQuantity: (productId: string, quantity: number) => void
}

function createCartItem(product: IProduct, quantity: number): ICartItem {
  return {
    ...product,
    quantity,
  }
}

export const useCartStore = create<ICartStore>()(
  persist(
    (set) => ({
      items: [],
      isCartOpen: false,
      availabilityChanges: [],
      availabilityStatus: 'checking',
      successMessage: null,
      beginAvailabilityCheck: () => set({ availabilityStatus: 'checking' }),
      addItem: (product, quantity) => {
        if (!product.isActive || product.stockQuantity < 1 || quantity < 1) return false

        let wasAdded = false

        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id)

          if (!existingItem) {
            const nextQuantity = Math.min(quantity, product.stockQuantity)
            wasAdded = nextQuantity > 0

            return {
              items: wasAdded
                ? [...state.items, createCartItem(product, nextQuantity)]
                : state.items,
            }
          }

          const nextQuantity = Math.min(existingItem.quantity + quantity, product.stockQuantity)
          wasAdded = nextQuantity > existingItem.quantity

          return {
            items: state.items.map((item) =>
              item.id === product.id ? createCartItem(product, nextQuantity) : item,
            ),
          }
        })

        if (wasAdded) {
          set({ successMessage: `${product.name} se agregó al carrito.` })
        }

        return wasAdded
      },
      clearCart: () => set({ items: [], availabilityChanges: [], successMessage: null }),
      closeCart: () => set({ isCartOpen: false }),
      dismissAvailabilityChanges: () => set({ availabilityChanges: [] }),
      dismissSuccessMessage: () => set({ successMessage: null }),
      failAvailabilityCheck: () => set({ availabilityStatus: 'error' }),
      openCart: () => set({ isCartOpen: true }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),
      syncProducts: (products) => {
        set((state) => {
          const result = reconcileCartItems(state.items, products)

          return {
            availabilityChanges:
              result.changes.length > 0
                ? [...state.availabilityChanges, ...result.changes]
                : state.availabilityChanges,
            availabilityStatus: 'ready',
            items: result.items,
          }
        })
      },
      updateItemQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== productId) return item

            return {
              ...item,
              quantity: Math.min(Math.max(quantity, 1), item.stockQuantity),
            }
          }),
        })),
    }),
    {
      name: 'margarita-shopping-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
