import { useEffect } from 'react'

import type { IProduct } from '@/shared/types/catalog'

import { useCartStore } from '../stores/cart.store'

export function useSyncCartProducts(products: IProduct[] | undefined) {
  const syncProducts = useCartStore((state) => state.syncProducts)

  useEffect(() => {
    if (!products) return

    syncProducts(products)
  }, [products, syncProducts])
}
