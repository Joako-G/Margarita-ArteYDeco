import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ImagePlus, Images, Layers3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { Button, Input, Select, Switch, TextArea } from '@/shared/components'

import {
  adminCategoryFormSchema,
  type AdminCategoryFormType,
} from '../schemas/admin-category-form.schema'
import type { IAdminCategory } from '../types/admin-categories'

interface IAdminCategoryFormProps {
  category?: IAdminCategory
  isSubmitting: boolean
  onSubmit: (values: AdminCategoryFormType) => Promise<void>
  submitError?: string | null
}

function getDefaultValues(category?: IAdminCategory): AdminCategoryFormType {
  return {
    catalogArea: category?.catalogArea ?? 'art',
    description: category?.description ?? '',
    displayOrder: String(category?.displayOrder ?? 0),
    image: undefined,
    isActive: category?.isActive ?? true,
    name: category?.name ?? '',
  }
}

export function AdminCategoryForm({
  category,
  isSubmitting,
  onSubmit,
  submitError,
}: IAdminCategoryFormProps) {
  const {
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<AdminCategoryFormType>({
    defaultValues: getDefaultValues(category),
    resolver: zodResolver(adminCategoryFormSchema),
  })
  const name = useWatch({ control, name: 'name' })
  const area = useWatch({ control, name: 'catalogArea' })
  const displayOrder = useWatch({ control, name: 'displayOrder' })
  const selectedImage = useWatch({ control, name: 'image' })
  const previewUrl = useMemo(
    () => selectedImage ? URL.createObjectURL(selectedImage) : null,
    [selectedImage],
  )

  useEffect(() => () => {
    if (previewUrl !== null) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const imageUrl = previewUrl ?? category?.imageUrl ?? null
  const hasProducts = (category?.productCount ?? 0) > 0

  async function handleValidSubmit(values: AdminCategoryFormType) {
    if (category === undefined && values.image === undefined) {
      setError('image', { message: 'Seleccioná una imagen para crear la categoría' })
      return
    }
    await onSubmit(values)
  }

  return (
    <form className="admin-category-form" noValidate onSubmit={handleSubmit(handleValidSubmit)}>
      {submitError ? (
        <div className="admin-category-form__alert admin-category-form__alert--error" role="alert">
          <strong>No pudimos guardar la categoría</strong>
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="admin-category-form__layout">
        <section aria-labelledby="category-information-title" className="admin-category-form__panel">
          <div className="admin-category-form__section-heading">
            <p>Información</p>
            <h2 id="category-information-title">Datos de la categoría</h2>
          </div>
          <div className="admin-category-form__fields">
            <Input
              autoComplete="off"
              error={errors.name?.message}
              label="Nombre"
              maxLength={100}
              {...register('name')}
            />

            {hasProducts ? (
              <>
                <Input
                  disabled
                  helpText="El área no puede cambiar porque hay productos asociados."
                  label="Área del catálogo"
                  value={category?.catalogArea === 'art' ? 'Arte' : 'Decoraciones'}
                />
                <input type="hidden" {...register('catalogArea')} />
              </>
            ) : (
              <Select label="Área del catálogo" {...register('catalogArea')}>
                <option value="art">Arte</option>
                <option value="decoration">Decoraciones</option>
              </Select>
            )}

            <TextArea
              error={errors.description?.message}
              helpText="Opcional. Explicá qué reúne esta categoría."
              label="Descripción"
              maxLength={1_000}
              rows={5}
              {...register('description')}
            />

            <Input
              error={errors.displayOrder?.message}
              helpText="Dentro de Arte o Decoraciones, las categorías con número menor se muestran primero."
              inputMode="numeric"
              label="Posición en el área"
              {...register('displayOrder')}
            />
          </div>
        </section>

        <aside className="admin-category-form__side">
          <section aria-labelledby="category-image-title" className="admin-category-form__panel">
            <div className="admin-category-form__section-heading">
              <p>Imagen</p>
              <h2 id="category-image-title">Vista previa circular</h2>
            </div>
            {imageUrl ? (
              <img
                alt={`Vista previa de ${name.trim() || 'categoría sin nombre'}`}
                className="admin-category-form__preview"
                src={imageUrl}
              />
            ) : (
              <div className="admin-category-form__preview-placeholder">
                <Images aria-hidden="true" size={30} />
                <span>Imagen pendiente</span>
              </div>
            )}
            <Controller
              control={control}
              name="image"
              render={({ field: { name: fieldName, onBlur, onChange } }) => (
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  error={errors.image?.message}
                  helpText="JPG, PNG o WebP cuadrada de hasta 10 MB. Las imágenes grandes se optimizan antes de subir."
                  label={category?.imageUrl ? 'Reemplazar imagen' : 'Imagen de la categoría'}
                  name={fieldName}
                  onBlur={onBlur}
                  onChange={(event) => {
                    onChange(event.target.files?.[0])
                    clearErrors('image')
                  }}
                  type="file"
                />
              )}
            />
          </section>

          <section aria-labelledby="category-publication-title" className="admin-category-form__panel">
            <div className="admin-category-form__section-heading">
              <p>Catálogo</p>
              <h2 id="category-publication-title">Visible en la tienda</h2>
            </div>
            <Switch label="Visible en la tienda" {...register('isActive')} />
            <p className="admin-category-form__publication-help">
              Para mostrarla debe tener una imagen cargada. Las categorías ocultas no aparecen en la tienda.
            </p>
            <div className="admin-category-form__summary">
              <Layers3 aria-hidden="true" size={20} />
              <div>
                <strong>{name.trim() || 'Categoría sin nombre'}</strong>
                <span>
                  {area === 'art' ? 'Arte' : 'Decoraciones'} · {displayOrder || '0'} en el área
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="admin-category-form__actions">
        <Link className="ui-button ui-button--secondary" to={routes.adminCategories}>Cancelar</Link>
        <Button
          isLoading={isSubmitting}
          loadingText={category ? 'Guardando cambios…' : 'Creando categoría…'}
          type="submit"
        >
          <ImagePlus aria-hidden="true" size={18} />
          {category ? 'Guardar cambios' : 'Crear categoría'}
        </Button>
      </div>
    </form>
  )
}
