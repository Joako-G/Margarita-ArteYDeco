import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button, Input, TextArea } from '@/shared/components'

import {
  adminCustomerFormSchema,
  type AdminCustomerFormType,
} from '../schemas/admin-customer-form.schema'
import type { IAdminCustomer } from '../types/admin-customers'

interface IAdminCustomerFormProps {
  customer: IAdminCustomer
  isSubmitting: boolean
  onSubmit: (values: AdminCustomerFormType) => Promise<void>
}

export function AdminCustomerForm({ customer, isSubmitting, onSubmit }: IAdminCustomerFormProps) {
  const { formState: { errors, isDirty }, handleSubmit, register, reset } = useForm({
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      notes: customer.notes,
      phone: customer.phone,
    },
    resolver: zodResolver(adminCustomerFormSchema),
  })

  return (
    <form className="admin-customer-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="admin-customer-form__fields">
        <Input
          autoComplete="given-name"
          error={errors.firstName?.message}
          label="Nombre"
          maxLength={100}
          placeholder="Ej.: María"
          {...register('firstName')}
        />
        <Input
          autoComplete="family-name"
          error={errors.lastName?.message}
          label="Apellido"
          maxLength={100}
          placeholder="Ej.: González"
          {...register('lastName')}
        />
        <Input
          autoComplete="tel"
          error={errors.phone?.message}
          helpText="Incluí código de área. Se utiliza para reconocer compras futuras."
          inputMode="tel"
          label="Celular"
          maxLength={40}
          placeholder="Ej.: 11 2345-6789"
          {...register('phone')}
        />
        <TextArea
          error={errors.notes?.message}
          helpText="Uso interno. No modifica las observaciones de pedidos anteriores."
          label="Observaciones"
          maxLength={1_000}
          placeholder="Ej.: Prefiere recibir mensajes por la tarde."
          rows={5}
          {...register('notes')}
        />
      </div>
      <div className="admin-customer-form__actions">
        <Button disabled={!isDirty || isSubmitting} onClick={() => reset()} type="button" variant="ghost">
          Descartar cambios
        </Button>
        <Button disabled={!isDirty} isLoading={isSubmitting} loadingText="Guardando…" type="submit">
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
