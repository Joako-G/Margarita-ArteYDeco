import { z } from 'zod'

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '')
}

export const adminCustomerFormSchema = z.strictObject({
  firstName: z.string().trim().min(2, 'Ingresá el nombre').max(100, 'Usá hasta 100 caracteres'),
  lastName: z.string().trim().min(2, 'Ingresá el apellido').max(100, 'Usá hasta 100 caracteres'),
  notes: z.string().trim().max(1_000, 'Usá hasta 1000 caracteres'),
  phone: z.string().trim()
    .min(8, 'Ingresá el celular con código de área')
    .max(40, 'Revisá el celular ingresado')
    .refine((value) => /^[1-9][0-9]{7,14}$/.test(normalizePhone(value)), {
      message: 'Ingresá un celular válido con código de área',
    }),
})

export type AdminCustomerFormType = z.infer<typeof adminCustomerFormSchema>
