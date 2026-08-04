import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'

import { adminProductsService } from '../services/admin-products.service'
import type { IAdminProductSaveInput, IAdminProductSaveResult } from '../types/admin-products'
import { ADMIN_PRODUCTS_QUERY_KEY } from './useAdminProducts'

export const ADMIN_PRODUCT_OPTIONS_QUERY_KEY = [...ADMIN_PRODUCTS_QUERY_KEY, 'form-options'] as const

export function useAdminProduct(productId: string | undefined) {
  return useQuery({
    enabled: productId !== undefined,
    queryFn: () => adminProductsService.getProduct(productId as string),
    queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, 'detail', productId],
    retry: false,
  })
}

export function useAdminProductCategoryOptions() {
  return useQuery({
    queryFn: adminProductsService.getCategoryOptions,
    queryKey: ADMIN_PRODUCT_OPTIONS_QUERY_KEY,
    staleTime: 60_000,
  })
}

export async function invalidateProductQueries(productId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: [...ADMIN_PRODUCTS_QUERY_KEY, 'detail', productId] }),
  ])
}

export function useCreateAdminProduct() {
  return useMutation({
    mutationFn: async (input: IAdminProductSaveInput): Promise<IAdminProductSaveResult> => {
      let product = await adminProductsService.createProduct(input.payload)
      let imageWarning = false

      if (input.image !== undefined) {
        try {
          product = await adminProductsService.replaceProductImage(
            product.id,
            input.image,
            product.updatedAt,
          )
        } catch {
          imageWarning = true
        }
      }

      return { imageWarning, product }
    },
    onSuccess: ({ product }) => invalidateProductQueries(product.id),
  })
}

interface IUpdateProductMutationInput extends IAdminProductSaveInput {
  currentUpdatedAt: string
  productId: string
}

export function useUpdateAdminProduct() {
  return useMutation({
    mutationFn: async (input: IUpdateProductMutationInput): Promise<IAdminProductSaveResult> => {
      let product = await adminProductsService.updateProduct(input.productId, {
        categoryId: input.payload.categoryId,
        description: input.payload.description,
        expectedUpdatedAt: input.currentUpdatedAt,
        isActive: input.payload.isActive,
        isFeatured: input.payload.isFeatured,
        name: input.payload.name,
        price: input.payload.price,
      })
      let imageWarning = false

      try {
        if (input.image !== undefined) {
          product = await adminProductsService.replaceProductImage(
            product.id,
            input.image,
            product.updatedAt,
          )
        } else if (input.removeCurrentImage) {
          product = await adminProductsService.removeProductImage(product.id, product.updatedAt)
        }
      } catch {
        imageWarning = true
      }

      return { imageWarning, product }
    },
    onSuccess: ({ product }) => {
      queryClient.setQueryData(
        [...ADMIN_PRODUCTS_QUERY_KEY, 'detail', product.id],
        product,
      )
      return invalidateProductQueries(product.id)
    },
  })
}
