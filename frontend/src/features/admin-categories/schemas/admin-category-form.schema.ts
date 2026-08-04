import { z } from 'zod'

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1_024 * 1_024

export const adminCategoryFormSchema = z.object({
  catalogArea: z.enum(['art', 'decoration']),
  description: z.string().trim().max(1_000, 'La descripción no puede superar 1000 caracteres'),
  displayOrder: z.string().trim()
    .regex(/^\d+$/, 'Ingresá un orden entero mayor o igual a cero')
    .refine((value) => Number(value) <= 2_147_483_647, 'El orden ingresado es demasiado alto'),
  image: z.instanceof(File).optional()
    .refine((file) => file === undefined || ACCEPTED_IMAGE_TYPES.includes(file.type), {
      message: 'La imagen debe ser JPG, PNG o WebP',
    })
    .refine((file) => file === undefined || file.size <= MAX_IMAGE_BYTES, {
      message: 'La imagen no puede superar los 5 MB',
    }),
  isActive: z.boolean(),
  name: z.string().trim().min(2, 'Ingresá al menos 2 caracteres').max(100),
})

export type AdminCategoryFormType = z.infer<typeof adminCategoryFormSchema>
