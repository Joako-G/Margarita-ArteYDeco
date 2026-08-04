import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'

import { adminCategoriesService } from '../services/admin-categories.service'
import type {
  AdminCategoryLifecycleMutationInputType,
  IAdminCategory,
} from '../types/admin-categories'
import { ADMIN_CATEGORIES_QUERY_KEY } from './useAdminCategories'
import { invalidateCategoryQueries } from './useAdminCategoryEditor'

async function mutateCategoryLifecycle(
  input: AdminCategoryLifecycleMutationInputType,
): Promise<IAdminCategory | null> {
  if (input.action === 'publication') {
    return adminCategoriesService.setCategoryPublication(
      input.category.id,
      input.category.updatedAt,
      input.value,
    )
  }

  await adminCategoriesService.softDeleteCategory(
    input.category.id,
    input.category.updatedAt,
  )
  return null
}

export function useAdminCategoryLifecycle() {
  return useMutation({
    mutationFn: mutateCategoryLifecycle,
    onSuccess: async (category, input) => {
      if (category !== null) {
        queryClient.setQueryData(
          [...ADMIN_CATEGORIES_QUERY_KEY, 'detail', category.id],
          category,
        )
      } else {
        queryClient.removeQueries({
          exact: true,
          queryKey: [...ADMIN_CATEGORIES_QUERY_KEY, 'detail', input.category.id],
        })
      }
      await invalidateCategoryQueries(input.category.id)
    },
  })
}
