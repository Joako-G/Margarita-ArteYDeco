import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'

import { adminProductsService } from '../services/admin-products.service'
import type {
  AdminProductLifecycleMutationInputType,
  IAdminProductDetail,
} from '../types/admin-products'
import { ADMIN_PRODUCTS_QUERY_KEY } from './useAdminProducts'
import { invalidateProductQueries } from './useAdminProductEditor'

async function mutateProductLifecycle(
  input: AdminProductLifecycleMutationInputType,
): Promise<IAdminProductDetail | null> {
  const { product } = input

  switch (input.action) {
    case 'publication':
      return adminProductsService.setProductPublication(
        product.id,
        product.updatedAt,
        input.value,
      )
    case 'featured':
      return adminProductsService.setProductFeatured(
        product.id,
        product.updatedAt,
        input.value,
      )
    case 'delete':
      await adminProductsService.softDeleteProduct(product.id, product.updatedAt)
      return null
  }
}

export function useAdminProductLifecycle() {
  return useMutation({
    mutationFn: mutateProductLifecycle,
    onSuccess: async (product, input) => {
      if (product !== null) {
        queryClient.setQueryData(
          [...ADMIN_PRODUCTS_QUERY_KEY, 'detail', product.id],
          product,
        )
      } else {
        queryClient.removeQueries({
          exact: true,
          queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, 'detail', input.product.id],
        })
      }

      await invalidateProductQueries(input.product.id)
    },
  })
}
