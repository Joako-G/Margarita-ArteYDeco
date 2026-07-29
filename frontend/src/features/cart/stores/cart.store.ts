import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { IProduct } from '@/shared/types/catalog'

import type { ICartItem } from '../types/cart'

interface ICartStore {
  availabilityMessage: string | null
  clearCart: () => void
  closeCart: () => void
  dismissAvailabilityMessage: () => void
  dismissSuccessMessage: () => void
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
      availabilityMessage: null,
      successMessage: null,
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
      clearCart: () => set({ items: [], availabilityMessage: null, successMessage: null }),
      closeCart: () => set({ isCartOpen: false }),
      dismissAvailabilityMessage: () => set({ availabilityMessage: null }),
      dismissSuccessMessage: () => set({ successMessage: null }),
      openCart: () => set({ isCartOpen: true }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),
      syncProducts: (products) => {
        const productsById = new Map(products.map((product) => [product.id, product]))
        let nextAvailabilityMessage: string | null = null

        set((state) => {
          const nextItems = state.items.flatMap((item) => {
            const currentProduct = productsById.get(item.id)

            if (!currentProduct || !currentProduct.isActive || currentProduct.stockQuantity === 0) {
              nextAvailabilityMessage = `${item.name} dejó de estar disponible y se quitó del carrito.`
              return []
            }

            const nextQuantity = Math.min(item.quantity, currentProduct.stockQuantity)

            if (nextQuantity !== item.quantity) {
              nextAvailabilityMessage = `Actualizamos la cantidad de ${item.name} según el stock disponible.`
            }

            return [createCartItem(currentProduct, nextQuantity)]
          })

          return {
            items: nextItems,
            availabilityMessage: nextAvailabilityMessage ?? state.availabilityMessage,
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
