import { useEffect } from 'react'

import type { IProduct } from '@/shared/types/catalog'

import { useCartStore } from '../stores/cart.store'

interface IUseSyncCartProductsOptions {
  isError: boolean
  isFetching: boolean
  products: IProduct[] | undefined
}

export function useSyncCartProducts({
  isError,
  isFetching,
  products,
}: IUseSyncCartProductsOptions) {
  const beginAvailabilityCheck = useCartStore((state) => state.beginAvailabilityCheck)
  const failAvailabilityCheck = useCartStore((state) => state.failAvailabilityCheck)
  const syncProducts = useCartStore((state) => state.syncProducts)

  useEffect(() => {
    if (products) {
      syncProducts(products)
      return
    }

    if (isFetching) {
      beginAvailabilityCheck()
      return
    }

    if (isError) failAvailabilityCheck()
  }, [beginAvailabilityCheck, failAvailabilityCheck, isError, isFetching, products, syncProducts])
}
