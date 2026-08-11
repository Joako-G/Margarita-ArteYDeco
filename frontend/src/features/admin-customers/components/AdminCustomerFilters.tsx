import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button, Input, Select } from '@/shared/components'

import {
  adminCustomerFiltersFormSchema,
  type AdminCustomerFiltersFormType,
} from '../schemas/admin-customer-filters.schema'
import type { IAdminCustomerFilters } from '../types/admin-customers'

interface IAdminCustomerFiltersProps {
  filters: IAdminCustomerFilters
  onApply: (values: AdminCustomerFiltersFormType) => void
  onClear: () => void
}

function getValues(filters: IAdminCustomerFilters): AdminCustomerFiltersFormType {
  return {
    pageSize: String(filters.pageSize) as '10' | '20' | '50',
    search: filters.search ?? '',
    sort: filters.sort,
  }
}

export function AdminCustomerFilters({ filters, onApply, onClear }: IAdminCustomerFiltersProps) {
  const { formState: { errors }, handleSubmit, register, reset } = useForm({
    defaultValues: getValues(filters),
    resolver: zodResolver(adminCustomerFiltersFormSchema),
  })

  useEffect(() => reset(getValues(filters)), [filters, reset])

  return (
    <form className="admin-customer-filters" noValidate onSubmit={handleSubmit(onApply)}>
      <Input
        error={errors.search?.message}
        label="Buscar cliente"
        placeholder="Ej.: María, González o 11 2345-6789"
        type="search"
        {...register('search')}
      />
      <Select label="Mostrar primero" {...register('sort')}>
        <option value="nameAsc">Nombre A–Z</option>
        <option value="nameDesc">Nombre Z–A</option>
        <option value="newest">Más recientes</option>
        <option value="oldest">Más antiguos</option>
      </Select>
      <Select label="Clientes por página" {...register('pageSize')}>
        <option value="10">10 por página</option>
        <option value="20">20 por página</option>
        <option value="50">50 por página</option>
      </Select>
      <div className="admin-customer-filters__actions">
        <Button onClick={onClear} type="button" variant="ghost">Limpiar</Button>
        <Button type="submit">Aplicar filtros</Button>
      </div>
    </form>
  )
}
