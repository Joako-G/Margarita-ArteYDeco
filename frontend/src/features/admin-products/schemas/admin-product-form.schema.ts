import { z } from 'zod'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1_024 * 1_024

export const adminProductFormSchema = z.object({
  categoryId: z.string().uuid('Seleccioná una categoría'),
  description: z.string().trim().max(2_000, 'La descripción no puede superar 2000 caracteres'),
  image: z.instanceof(File).optional()
    .refine((file) => file === undefined || ACCEPTED_IMAGE_TYPES.includes(file.type), {
      message: 'La imagen debe ser JPG, PNG o WebP',
    })
    .refine((file) => file === undefined || file.size <= MAX_IMAGE_BYTES, {
      message: 'La imagen no puede superar los 5 MB',
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
})

export type AdminProductFormType = z.infer<typeof adminProductFormSchema>
