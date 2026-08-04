import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { ADMIN_DASHBOARD_QUERY_KEY } from '@/features/admin-dashboard/hooks/useAdminDashboard'
import { ADMIN_PRODUCT_OPTIONS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProductEditor'
import { ADMIN_PRODUCTS_QUERY_KEY } from '@/features/admin-products/hooks/useAdminProducts'
import { CATALOG_QUERY_KEY } from '@/features/catalog/hooks/useCatalog'

import { adminCategoriesService } from '../services/admin-categories.service'
import type {
  IAdminCategory,
  IAdminCategorySaveInput,
  IAdminCategorySaveResult,
} from '../types/admin-categories'
import { ADMIN_CATEGORIES_QUERY_KEY } from './useAdminCategories'

export function useAdminCategory(categoryId: string | undefined) {
  return useQuery({
    enabled: categoryId !== undefined,
    queryFn: () => adminCategoriesService.getCategory(categoryId as string),
    queryKey: [...ADMIN_CATEGORIES_QUERY_KEY, 'detail', categoryId],
    retry: false,
  })
}

export async function invalidateCategoryQueries(categoryId: string): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_OPTIONS_QUERY_KEY }),
    queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEY }),
    queryClient.invalidateQueries({
      queryKey: [...ADMIN_CATEGORIES_QUERY_KEY, 'detail', categoryId],
    }),
  ])
}

async function uploadAndPublish(
  category: IAdminCategory,
  image: File | undefined,
  shouldPublish: boolean,
): Promise<IAdminCategorySaveResult> {
  let current = category

  if (image !== undefined) {
    try {
      current = await adminCategoriesService.replaceCategoryImage(
        current.id,
        image,
        current.updatedAt,
      )
    } catch {
      return { category: current, imageWarning: true }
    }
  }

  if (shouldPublish && !current.isActive) {
    current = await adminCategoriesService.setCategoryPublication(
      current.id,
      current.updatedAt,
      true,
    )
  }

  return { category: current, imageWarning: false }
}

export function useCreateAdminCategory() {
  return useMutation({
    mutationFn: async (input: IAdminCategorySaveInput) => {
      const category = await adminCategoriesService.createCategory(input.payload)
      return uploadAndPublish(category, input.image, input.isActive)
    },
    onSuccess: ({ category }) => invalidateCategoryQueries(category.id),
  })
}

interface IUpdateCategoryMutationInput extends IAdminCategorySaveInput {
  currentCategory: IAdminCategory
}

export function useUpdateAdminCategory() {
  return useMutation({
    mutationFn: async (input: IUpdateCategoryMutationInput) => {
      const needsImageBeforePublication = input.isActive && input.currentCategory.imageUrl === null
      let category = await adminCategoriesService.updateCategory(input.currentCategory.id, {
        ...input.payload,
        expectedUpdatedAt: input.currentCategory.updatedAt,
        isActive: needsImageBeforePublication ? false : input.isActive,
      })
      const result = await uploadAndPublish(category, input.image, input.isActive)
      category = result.category
      return { category, imageWarning: result.imageWarning }
    },
    onSuccess: ({ category }) => {
      queryClient.setQueryData(
        [...ADMIN_CATEGORIES_QUERY_KEY, 'detail', category.id],
        category,
      )
      return invalidateCategoryQueries(category.id)
    },
  })
}
