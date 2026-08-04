import { useCatalog } from '@/features/catalog/hooks/useCatalog'

import { useSyncCartProducts } from '../hooks/useSyncCartProducts'

export function CartAvailabilitySync() {
  const { data, isError, isFetching } = useCatalog()

  useSyncCartProducts({
    isError,
    isFetching,
    products: data?.products,
  })

  return null
}
