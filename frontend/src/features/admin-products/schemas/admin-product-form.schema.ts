import { z } from 'zod'

import {
  ACCEPTED_CATALOG_IMAGE_TYPES,
  CATALOG_IMAGE_INPUT_MAX_BYTES,
} from '../../../shared/utils/prepare-image-upload.ts'

export const adminProductFormSchema = z.object({
  categoryId: z.string().uuid('Seleccioná una categoría'),
  description: z.string().trim().max(2_000, 'La descripción no puede superar 2000 caracteres'),
  discountPercentage: z.string().trim()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un porcentaje válido')
    .refine((value) => Number(value.replace(',', '.')) < 100, 'El descuento debe ser menor a 100'),
  image: z.instanceof(File).optional()
    .refine((file) => file === undefined || ACCEPTED_CATALOG_IMAGE_TYPES.includes(file.type), {
      message: 'La imagen debe ser JPG, PNG o WebP',
    })
    .refine((file) => file === undefined || file.size <= CATALOG_IMAGE_INPUT_MAX_BYTES, {
      message: 'La imagen original no puede superar los 10 MB',
    }),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  name: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(120),
  price: z.string().trim()
    .regex(/^\d+(?:[.,]\d{1,2})?$/, 'Ingresá un precio válido')
    .refine((value) => Number(value.replace(',', '.')) > 0, 'El precio debe ser mayor a cero'),
  removeCurrentImage: z.boolean(),
  stockQuantity: z.string().trim()
    .regex(/^\d+$/, 'Ingresá una cantidad entera mayor o igual a cero')
    .refine((value) => Number(value) <= 2_147_483_647, 'El stock ingresado es demasiado alto'),
}).superRefine((product, context) => {
  const price = Number(product.price.replace(',', '.'))
  const discount = Number(product.discountPercentage.replace(',', '.'))
  const salePrice = Math.round(price * (100 - discount)) / 100

  if (Number.isFinite(salePrice) && salePrice <= 0) {
    context.addIssue({
      code: 'custom',
      message: 'El descuento deja el precio final en cero',
      path: ['discountPercentage'],
    })
  }
})

export type AdminProductFormType = z.infer<typeof adminProductFormSchema>
