import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'
import {
  CATEGORY_IMAGE_MAX_DIMENSION,
  prepareImageForUpload,
} from '@/shared/utils/prepare-image-upload'

import type {
  IAdminCategory,
  IAdminCategoryCreatePayload,
  IAdminCategoryFilters,
  IAdminCategoryList,
  IAdminCategoryUpdatePayload,
} from '../types/admin-categories'

async function getCategories(filters: IAdminCategoryFilters): Promise<IAdminCategoryList> {
  const response = await apiClient.get<IApiResponse<IAdminCategoryList>>('/admin/categories', {
    params: filters,
  })
  return response.data.data
}

async function getCategory(categoryId: string): Promise<IAdminCategory> {
  const response = await apiClient.get<IApiResponse<IAdminCategory>>(
    `/admin/categories/${encodeURIComponent(categoryId)}`,
  )
  return response.data.data
}

async function createCategory(payload: IAdminCategoryCreatePayload): Promise<IAdminCategory> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminCategory>>(
      '/admin/categories',
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function updateCategory(
  categoryId: string,
  payload: IAdminCategoryUpdatePayload,
): Promise<IAdminCategory> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminCategory>>(
      `/admin/categories/${encodeURIComponent(categoryId)}`,
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function replaceCategoryImage(
  categoryId: string,
  image: File,
  expectedUpdatedAt: string,
): Promise<IAdminCategory> {
  return executeWithCsrf(async (csrfToken) => {
    const preparedImage = await prepareImageForUpload(image, CATEGORY_IMAGE_MAX_DIMENSION)
    const response = await apiClient.put<IApiResponse<IAdminCategory>>(
      `/admin/categories/${encodeURIComponent(categoryId)}/image`,
      preparedImage,
      {
        headers: { 'Content-Type': preparedImage.type, 'X-CSRF-Token': csrfToken },
        params: { expectedUpdatedAt },
      },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function setCategoryPublication(
  categoryId: string,
  expectedUpdatedAt: string,
  isActive: boolean,
): Promise<IAdminCategory> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.patch<IApiResponse<IAdminCategory>>(
      `/admin/categories/${encodeURIComponent(categoryId)}/publication`,
      { expectedUpdatedAt, isActive },
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function softDeleteCategory(categoryId: string, expectedUpdatedAt: string): Promise<void> {
  return executeWithCsrf(async (csrfToken) => {
    await apiClient.delete(`/admin/categories/${encodeURIComponent(categoryId)}`, {
      data: { expectedUpdatedAt },
      headers: { 'X-CSRF-Token': csrfToken },
    })
  }, true, fetchAdminCsrfToken)
}

export const adminCategoriesService = {
  createCategory,
  getCategories,
  getCategory,
  replaceCategoryImage,
  setCategoryPublication,
  softDeleteCategory,
  updateCategory,
}
