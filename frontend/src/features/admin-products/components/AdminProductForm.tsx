import { useEffect, useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, PackageCheck, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { routes } from '@/config/routes'
import { Button, Input, Select, Switch, TextArea } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import {
  adminProductFormSchema,
  type AdminProductFormType,
} from '../schemas/admin-product-form.schema'
import type { IAdminProductCategoryOption, IAdminProductDetail } from '../types/admin-products'

interface IAdminProductFormProps {
  categories: readonly IAdminProductCategoryOption[]
  isSubmitting: boolean
  onDirtyChange?: (isDirty: boolean) => void
  onSubmit: (values: AdminProductFormType) => Promise<void>
  product?: IAdminProductDetail
  submitError?: string | null
}

function getDefaultValues(product?: IAdminProductDetail): AdminProductFormType {
  return {
    categoryId: product?.category.id ?? '',
    description: product?.description ?? '',
    image: undefined,
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    name: product?.name ?? '',
    price: product ? String(product.price) : '',
    removeCurrentImage: false,
    stockQuantity: product ? String(product.stockQuantity) : '0',
  }
}

export function AdminProductForm({
  categories,
  isSubmitting,
  onDirtyChange,
  onSubmit,
  product,
  submitError,
}: IAdminProductFormProps) {
  const isEditing = product !== undefined
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    setValue,
  } = useForm<AdminProductFormType>({
    defaultValues: getDefaultValues(product),
    resolver: zodResolver(adminProductFormSchema),
  })
  const name = useWatch({ control, name: 'name' })
  const price = useWatch({ control, name: 'price' })
  const selectedImage = useWatch({ control, name: 'image' })
  const removeCurrentImage = useWatch({ control, name: 'removeCurrentImage' })
  const previewUrl = useMemo(
    () => selectedImage ? URL.createObjectURL(selectedImage) : null,
    [selectedImage],
  )

  useEffect(() => () => {
    if (previewUrl !== null) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => () => {
    onDirtyChange?.(false)
  }, [onDirtyChange])

  const currentImageUrl = removeCurrentImage ? null : product?.imageUrl ?? null
  const displayedImage = previewUrl ?? currentImageUrl ?? productPlaceholderImage
  const numericPrice = Number(price.replace(',', '.'))

  const groupedCategories = {
    art: categories.filter((category) => category.catalogArea === 'art'),
    decoration: categories.filter((category) => category.catalogArea === 'decoration'),
  }

  return (
    <form className="admin-product-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      {submitError ? (
        <div className="admin-product-form__alert admin-product-form__alert--error" role="alert">
          <strong>No pudimos guardar el producto</strong>
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="admin-product-form__layout">
        <section aria-labelledby="product-information-title" className="admin-product-form__panel">
          <div className="admin-product-form__section-heading">
            <p>Información</p>
            <h2 id="product-information-title">Datos del producto</h2>
          </div>

          <div className="admin-product-form__fields">
            <Input
              autoComplete="off"
              error={errors.name?.message}
              helpText="La dirección del producto en la tienda se crea automáticamente."
              label="Nombre"
              maxLength={120}
              placeholder="Ej.: Bandeja de madera"
              {...register('name')}
            />

            <Select
              error={errors.categoryId?.message}
              label="Categoría"
              {...register('categoryId')}
            >
              <option value="">Seleccioná una categoría</option>
              <optgroup label="Arte">
                {groupedCategories.art.map((category) => (
                  <option
                    disabled={!category.isActive && category.id !== product?.category.id}
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}{category.isActive ? '' : ' (inactiva)'}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Decoraciones">
                {groupedCategories.decoration.map((category) => (
                  <option
                    disabled={!category.isActive && category.id !== product?.category.id}
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}{category.isActive ? '' : ' (inactiva)'}
                  </option>
                ))}
              </optgroup>
            </Select>

            <TextArea
              error={errors.description?.message}
              helpText="Opcional. Contá brevemente sus características o usos."
              label="Descripción"
              maxLength={2_000}
              placeholder="Ej.: Bandeja artesanal lista para pintar o decorar."
              rows={5}
              {...register('description')}
            />

            <div className="admin-product-form__row">
              <Input
                error={errors.price?.message}
                inputMode="decimal"
                label="Precio"
                placeholder="Ej.: 12500,00"
                {...register('price')}
              />
              <Input
                disabled={isEditing}
                error={errors.stockQuantity?.message}
                helpText={isEditing ? 'Para cambiar las unidades, usá la sección de inventario que aparece más abajo.' : 'Cantidad disponible al crear el producto.'}
                inputMode="numeric"
                label="Unidades disponibles"
                placeholder="Ej.: 10"
                {...register('stockQuantity')}
              />
            </div>
          </div>
        </section>

        <aside className="admin-product-form__side">
          <section aria-labelledby="product-image-title" className="admin-product-form__panel">
            <div className="admin-product-form__section-heading">
              <p>Imagen</p>
              <h2 id="product-image-title">Vista previa</h2>
            </div>
            <img
              alt={`Vista previa de ${name.trim() || 'producto sin nombre'}`}
              className="admin-product-form__preview"
              src={displayedImage}
            />
            <Controller
              control={control}
              name="image"
              render={({ field: { name: fieldName, onBlur, onChange } }) => (
                <Input
                  accept="image/jpeg,image/png,image/webp"
                  error={errors.image?.message}
                  helpText="Opcional. JPG, PNG o WebP de hasta 10 MB. Las imágenes grandes se optimizan antes de subir."
                  label={currentImageUrl ? 'Reemplazar imagen' : 'Agregar imagen'}
                  name={fieldName}
                  onBlur={onBlur}
                  onChange={(event) => {
                    onChange(event.target.files?.[0])
                    setValue('removeCurrentImage', false)
                  }}
                  type="file"
                />
              )}
            />
            {isEditing && product.imageUrl !== null && selectedImage === undefined ? (
              <Button
                className="admin-product-form__remove-image"
                onClick={() => setValue('removeCurrentImage', !removeCurrentImage)}
                size="small"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" size={16} />
                {removeCurrentImage ? 'Conservar imagen' : 'Quitar imagen'}
              </Button>
            ) : null}
          </section>

          <section aria-labelledby="product-publication-title" className="admin-product-form__panel">
            <div className="admin-product-form__section-heading">
              <p>Catálogo</p>
              <h2 id="product-publication-title">Cómo se muestra en la tienda</h2>
            </div>
            <Switch label="Visible en la tienda" {...register('isActive')} />
            <Switch label="Mostrar entre los recomendados" {...register('isFeatured')} />
            <div className="admin-product-form__summary">
              <PackageCheck aria-hidden="true" size={20} />
              <div>
                <strong>{name.trim() || 'Producto sin nombre'}</strong>
                <span>{numericPrice > 0 ? formatPrice(numericPrice) : 'Precio pendiente'}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="admin-product-form__actions">
        <Link className="ui-button ui-button--secondary" to={routes.adminProducts}>
          Cancelar
        </Link>
        <Button
          isLoading={isSubmitting}
          loadingText={isEditing ? 'Guardando cambios…' : 'Creando producto…'}
          type="submit"
        >
          <ImagePlus aria-hidden="true" size={18} />
          {isEditing ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  )
}
