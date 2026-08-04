import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, ImageOff, PackagePlus } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import { AdminInventoryPanel } from '@/features/admin-inventory'
import {
  AdminProductForm,
  type AdminProductFormType,
  useAdminProduct,
  useAdminProductCategoryOptions,
  useCreateAdminProduct,
  useUpdateAdminProduct,
} from '@/features/admin-products'
import type { IAdminProductDetail } from '@/features/admin-products'
import { Button, Skeleton } from '@/shared/components'
import { getApiErrorResponse, getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-products/admin-product-form.css'
import '@/features/admin-inventory/admin-inventory.css'

interface IProductFormLocationState {
  feedback?: 'created' | 'createdWithoutImage'
}

function getSaveError(error: unknown): string {
  return getApiErrorResponse(error)?.message ??
    'Revisá que el backend esté disponible e intentá nuevamente.'
}

export function AdminProductFormPage() {
  const { productId } = useParams<{ productId: string }>()
  const isEditing = productId !== undefined
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as IProductFormLocationState | null
  const product = useAdminProduct(productId)
  const categories = useAdminProductCategoryOptions()
  const createProduct = useCreateAdminProduct()
  const updateProduct = useUpdateAdminProduct()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hasUnsavedProductChanges, setHasUnsavedProductChanges] = useState(false)
  const [feedback, setFeedback] = useState<IProductFormLocationState['feedback']>(
    locationState?.feedback,
  )
  const unauthorizedError = product.error ?? categories.error ?? createProduct.error ?? updateProduct.error
  useRefreshAdminSessionOnUnauthorized(unauthorizedError)

  useEffect(() => {
    document.title = `${isEditing ? 'Editar producto' : 'Nuevo producto'} | Margarita Arte & Deco`
    return () => {
      document.title = 'Margarita Arte & Deco'
    }
  }, [isEditing])

  useEffect(() => {
    if (locationState?.feedback) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, locationState?.feedback, navigate])

  async function handleSubmit(values: AdminProductFormType): Promise<void> {
    setSubmitError(null)
    setFeedback(undefined)
    const payload = {
      categoryId: values.categoryId,
      description: values.description.trim() || null,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      name: values.name.trim(),
      price: Number(values.price.replace(',', '.')),
      stockQuantity: Number(values.stockQuantity),
    }

    try {
      if (!isEditing) {
        const result = await createProduct.mutateAsync({ image: values.image, payload })
        navigate(routes.adminProductEdit(result.product.id), {
          replace: true,
          state: {
            feedback: result.imageWarning ? 'createdWithoutImage' : 'created',
          } satisfies IProductFormLocationState,
        })
        return
      }

      const currentProduct = product.data as IAdminProductDetail
      const result = await updateProduct.mutateAsync({
        currentUpdatedAt: currentProduct.updatedAt,
        image: values.image,
        payload,
        productId: currentProduct.id,
        removeCurrentImage: values.removeCurrentImage,
      })
      setFeedback(result.imageWarning ? 'createdWithoutImage' : 'created')
    } catch (error) {
      setSubmitError(getSaveError(error))
    }
  }

  if (isEditing && product.isError && getApiErrorStatus(product.error) === 404) {
    return <Navigate replace to={routes.adminProducts} />
  }

  const isLoading = categories.isPending || (isEditing && product.isPending)
  const loadFailed = categories.isError || (isEditing && product.isError)

  return (
    <main className="admin-page admin-product-editor" aria-labelledby="admin-product-form-title">
      <AdminPageHeader
        currentLabel={isEditing ? 'Editar producto' : 'Nuevo producto'}
        description={isEditing
          ? 'Actualizá la información comercial, la publicación y la imagen.'
          : 'Cargá los datos básicos. La imagen es opcional y puede agregarse después.'}
        sectionLabel="Productos"
        title={isEditing ? 'Editar producto' : 'Nuevo producto'}
        titleId="admin-product-form-title"
      />

      {feedback ? (
        <div
          className={`admin-product-form__alert ${feedback === 'created' ? '' : 'admin-product-form__alert--warning'}`}
          role="status"
        >
          {feedback === 'created' ? <CircleCheck aria-hidden="true" /> : <ImageOff aria-hidden="true" />}
          <div>
            <strong>{isEditing ? 'Producto guardado' : 'Producto creado'}</strong>
            <span>{feedback === 'created'
              ? 'Los cambios ya están disponibles en el catálogo.'
              : 'Los datos se guardaron, pero la imagen no pudo cargarse. Podés reintentarla ahora.'}</span>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="admin-product-form__loading" aria-label="Cargando formulario">
          <Skeleton className="admin-product-form__loading-main" />
          <Skeleton className="admin-product-form__loading-side" />
        </div>
      ) : null}

      {loadFailed && getApiErrorStatus(unauthorizedError) !== 401 ? (
        <div className="admin-product-form__load-error" role="alert">
          <CircleAlert aria-hidden="true" size={28} />
          <div>
            <h2>No pudimos preparar el formulario</h2>
            <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
          </div>
          <Button onClick={() => {
            void categories.refetch()
            if (isEditing) void product.refetch()
          }} variant="secondary">
            Reintentar
          </Button>
        </div>
      ) : null}

      {!isLoading && !loadFailed && categories.data ? (
        categories.data.length > 0 ? (
          <>
            <AdminProductForm
              categories={categories.data}
              isSubmitting={createProduct.isPending || updateProduct.isPending}
              key={product.data?.updatedAt ?? 'new-product'}
              onDirtyChange={setHasUnsavedProductChanges}
              onSubmit={handleSubmit}
              product={product.data}
              submitError={submitError}
            />
            {isEditing && product.data ? (
              <AdminInventoryPanel
                hasUnsavedProductChanges={hasUnsavedProductChanges}
                productId={product.data.id}
              />
            ) : null}
          </>
        ) : (
          <div className="admin-product-form__load-error">
            <PackagePlus aria-hidden="true" size={28} />
            <div>
              <h2>Primero necesitás una categoría</h2>
              <p>Los productos deben pertenecer a una categoría antes de crearse.</p>
            </div>
            <Link className="ui-button ui-button--secondary" to={routes.adminProducts}>
              Volver a productos
            </Link>
          </div>
        )
      ) : null}
    </main>
  )
}
