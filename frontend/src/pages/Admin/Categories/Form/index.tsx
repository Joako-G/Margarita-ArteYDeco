import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, ImageOff } from 'lucide-react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminCategoryForm,
  type AdminCategoryFormType,
  useAdminCategory,
  useCreateAdminCategory,
  useUpdateAdminCategory,
} from '@/features/admin-categories'
import type { IAdminCategory } from '@/features/admin-categories'
import { Button, Skeleton } from '@/shared/components'
import { getApiErrorResponse, getApiErrorStatus } from '@/shared/services/api/errors'
import { getImageUploadPreparationError } from '@/shared/utils/prepare-image-upload'

import '@/features/admin-categories/admin-category-form.css'

interface ICategoryFormLocationState {
  feedback?: 'saved' | 'savedWithoutImage'
}

function getSaveError(error: unknown): string {
  return getImageUploadPreparationError(error) ?? getApiErrorResponse(error)?.message ??
    'No pudimos conectar con el sistema. Revisá tu conexión e intentá nuevamente.'
}

export function AdminCategoryFormPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const isEditing = categoryId !== undefined
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as ICategoryFormLocationState | null
  const category = useAdminCategory(categoryId)
  const createCategory = useCreateAdminCategory()
  const updateCategory = useUpdateAdminCategory()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<ICategoryFormLocationState['feedback']>(
    locationState?.feedback,
  )
  const unauthorizedError = category.error ?? createCategory.error ?? updateCategory.error
  useRefreshAdminSessionOnUnauthorized(unauthorizedError)

  useEffect(() => {
    document.title = `${isEditing ? 'Editar categoría' : 'Nueva categoría'} | Margarita Arte & Deco`
    return () => { document.title = 'Margarita Arte & Deco' }
  }, [isEditing])

  useEffect(() => {
    if (locationState?.feedback) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, locationState?.feedback, navigate])

  async function handleSubmit(values: AdminCategoryFormType): Promise<void> {
    setSubmitError(null)
    setFeedback(undefined)
    const payload = {
      catalogArea: values.catalogArea,
      description: values.description.trim() || null,
      name: values.name.trim(),
    }

    try {
      if (!isEditing) {
        const result = await createCategory.mutateAsync({
          image: values.image,
          isActive: values.isActive,
          payload,
        })
        navigate(routes.adminCategoryEdit(result.category.id), {
          replace: true,
          state: {
            feedback: result.imageWarning ? 'savedWithoutImage' : 'saved',
          } satisfies ICategoryFormLocationState,
        })
        return
      }

      const result = await updateCategory.mutateAsync({
        currentCategory: category.data as IAdminCategory,
        image: values.image,
        isActive: values.isActive,
        payload: {
          ...payload,
          displayOrder: Number(values.displayOrder),
        },
      })
      setFeedback(result.imageWarning ? 'savedWithoutImage' : 'saved')
    } catch (error) {
      setSubmitError(getSaveError(error))
    }
  }

  if (isEditing && category.isError && getApiErrorStatus(category.error) === 404) {
    return <Navigate replace to={routes.adminCategories} />
  }

  return (
    <main className="admin-page admin-category-editor" aria-labelledby="admin-category-form-title">
      <AdminPageHeader
        currentLabel={isEditing ? 'Editar categoría' : 'Nueva categoría'}
        description={isEditing
          ? 'Actualizá sus datos y elegí dónde y cómo se muestra en la tienda.'
          : 'Definí el área y agregá una imagen. La posición se asignará automáticamente.'}
        sectionLabel="Categorías"
        title={isEditing ? 'Editar categoría' : 'Nueva categoría'}
        titleId="admin-category-form-title"
      />

      {feedback ? (
        <div className={`admin-category-form__alert ${feedback === 'saved' ? '' : 'admin-category-form__alert--warning'}`} role="status">
          {feedback === 'saved' ? <CircleCheck aria-hidden="true" /> : <ImageOff aria-hidden="true" />}
          <div>
            <strong>{isEditing ? 'Categoría guardada' : 'Categoría creada'}</strong>
            <span>{feedback === 'saved'
              ? isEditing
                ? 'La información de la categoría quedó actualizada.'
                : 'La categoría quedó guardada al final del área que elegiste.'
              : 'Guardamos la categoría, pero no pudimos cargar la imagen. Si todavía no tenía una, seguirá oculta hasta que vuelvas a intentarlo.'}</span>
          </div>
        </div>
      ) : null}

      {isEditing && category.isPending ? (
        <div className="admin-category-form__loading" aria-label="Cargando formulario">
          <Skeleton className="admin-category-form__loading-main" />
          <Skeleton className="admin-category-form__loading-side" />
        </div>
      ) : null}

      {isEditing && category.isError && getApiErrorStatus(category.error) !== 401 ? (
        <div className="admin-category-form__load-error" role="alert">
          <CircleAlert aria-hidden="true" size={28} />
          <div>
            <h2>No pudimos preparar el formulario</h2>
            <p>No pudimos conectar con el sistema. Revisá tu conexión e intentá nuevamente.</p>
          </div>
          <Button onClick={() => void category.refetch()} variant="secondary">Reintentar</Button>
        </div>
      ) : null}

      {(!isEditing || category.data) && !category.isError ? (
        <AdminCategoryForm
          category={category.data}
          isSubmitting={createCategory.isPending || updateCategory.isPending}
          key={category.data?.updatedAt ?? 'new-category'}
          onSubmit={handleSubmit}
          submitError={submitError}
        />
      ) : null}
    </main>
  )
}
