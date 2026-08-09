import { fetchAdminCsrfToken } from '@/features/admin-auth/services/admin-auth.service'
import { apiClient } from '@/shared/services/api/axios'
import { executeWithCsrf } from '@/shared/services/api/csrf.service'
import type { IApiResponse } from '@/shared/services/api/types'
import {
  prepareImageForUpload,
  PRODUCT_IMAGE_MAX_DIMENSION,
} from '@/shared/utils/prepare-image-upload'

import type {
  IAdminProductCategoryOption,
  IAdminProductCreatePayload,
  IAdminProductDetail,
  IAdminProductFilters,
  IAdminProductList,
  IAdminProductUpdatePayload,
} from '../types/admin-products'

async function getProducts(filters: IAdminProductFilters): Promise<IAdminProductList> {
  const response = await apiClient.get<IApiResponse<IAdminProductList>>('/admin/products', {
    params: filters,
  })
  return response.data.data
}

async function getCategoryOptions(): Promise<readonly IAdminProductCategoryOption[]> {
  const response = await apiClient.get<IApiResponse<readonly IAdminProductCategoryOption[]>>(
    '/admin/products/form-options',
  )
  return response.data.data
}

async function getProduct(productId: string): Promise<IAdminProductDetail> {
  const response = await apiClient.get<IApiResponse<IAdminProductDetail>>(
    `/admin/products/${encodeURIComponent(productId)}`,
  )
  return response.data.data
}

async function createProduct(payload: IAdminProductCreatePayload): Promise<IAdminProductDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.post<IApiResponse<IAdminProductDetail>>(
      '/admin/products',
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function updateProduct(
  productId: string,
  payload: IAdminProductUpdatePayload,
): Promise<IAdminProductDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.put<IApiResponse<IAdminProductDetail>>(
      `/admin/products/${encodeURIComponent(productId)}`,
      payload,
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function replaceProductImage(
  productId: string,
  image: File,
  expectedUpdatedAt: string,
): Promise<IAdminProductDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const preparedImage = await prepareImageForUpload(image, PRODUCT_IMAGE_MAX_DIMENSION)
    const response = await apiClient.put<IApiResponse<IAdminProductDetail>>(
      `/admin/products/${encodeURIComponent(productId)}/image`,
      preparedImage,
      {
        headers: {
          'Content-Type': preparedImage.type,
          'X-CSRF-Token': csrfToken,
        },
        params: { expectedUpdatedAt },
      },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function removeProductImage(
  productId: string,
  expectedUpdatedAt: string,
): Promise<IAdminProductDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.delete<IApiResponse<IAdminProductDetail>>(
      `/admin/products/${encodeURIComponent(productId)}/image`,
      {
        data: { expectedUpdatedAt },
        headers: { 'X-CSRF-Token': csrfToken },
      },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function setProductPublication(
  productId: string,
  expectedUpdatedAt: string,
  isActive: boolean,
): Promise<IAdminProductDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.patch<IApiResponse<IAdminProductDetail>>(
      `/admin/products/${encodeURIComponent(productId)}/publication`,
      { expectedUpdatedAt, isActive },
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function setProductFeatured(
  productId: string,
  expectedUpdatedAt: string,
  isFeatured: boolean,
): Promise<IAdminProductDetail> {
  return executeWithCsrf(async (csrfToken) => {
    const response = await apiClient.patch<IApiResponse<IAdminProductDetail>>(
      `/admin/products/${encodeURIComponent(productId)}/featured`,
      { expectedUpdatedAt, isFeatured },
      { headers: { 'X-CSRF-Token': csrfToken } },
    )
    return response.data.data
  }, true, fetchAdminCsrfToken)
}

async function softDeleteProduct(productId: string, expectedUpdatedAt: string): Promise<void> {
  return executeWithCsrf(async (csrfToken) => {
    await apiClient.delete(`/admin/products/${encodeURIComponent(productId)}`, {
      data: { expectedUpdatedAt },
      headers: { 'X-CSRF-Token': csrfToken },
    })
  }, true, fetchAdminCsrfToken)
}

export const adminProductsService = {
  createProduct,
  getCategoryOptions,
  getProduct,
  getProducts,
  removeProductImage,
  replaceProductImage,
  setProductFeatured,
  setProductPublication,
  softDeleteProduct,
  updateProduct,
}
