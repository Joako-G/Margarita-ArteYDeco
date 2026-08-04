import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button, Input, Select } from '@/shared/components'

import {
  adminCategoryFiltersFormSchema,
  type AdminCategoryFiltersFormType,
} from '../schemas/admin-category-filters.schema'
import type { IAdminCategoryFilters } from '../types/admin-categories'

interface IAdminCategoryFiltersProps {
  filters: IAdminCategoryFilters
  onApply: (values: AdminCategoryFiltersFormType) => void
  onClear: () => void
}

function getValues(filters: IAdminCategoryFilters): AdminCategoryFiltersFormType {
  return {
    area: filters.area,
    pageSize: String(filters.pageSize) as '10' | '20' | '50',
    publication: filters.publication,
    search: filters.search ?? '',
    sort: filters.sort,
  }
}

export function AdminCategoryFilters({
  filters,
  onApply,
  onClear,
}: IAdminCategoryFiltersProps) {
  const { formState: { errors }, handleSubmit, register, reset } = useForm({
    defaultValues: getValues(filters),
    resolver: zodResolver(adminCategoryFiltersFormSchema),
  })

  useEffect(() => reset(getValues(filters)), [filters, reset])

  return (
    <form className="admin-category-filters" noValidate onSubmit={handleSubmit(onApply)}>
      <Input
        error={errors.search?.message}
        label="Buscar por nombre"
        placeholder="Ej.: pinceles"
        type="search"
        {...register('search')}
      />
      <Select label="Área" {...register('area')}>
        <option value="all">Todas</option>
        <option value="art">Arte</option>
        <option value="decoration">Decoraciones</option>
      </Select>
      <Select label="Publicación" {...register('publication')}>
        <option value="all">Todas</option>
        <option value="active">Activas</option>
        <option value="inactive">Inactivas</option>
      </Select>
      <Select label="Ordenar" {...register('sort')}>
        <option value="orderAsc">Orden visual ascendente</option>
        <option value="orderDesc">Orden visual descendente</option>
        <option value="nameAsc">Nombre A–Z</option>
        <option value="nameDesc">Nombre Z–A</option>
        <option value="newest">Actualizadas recientemente</option>
      </Select>
      <Select label="Resultados" {...register('pageSize')}>
        <option value="10">10 por página</option>
        <option value="20">20 por página</option>
        <option value="50">50 por página</option>
      </Select>
      <div className="admin-category-filters__actions">
        <Button onClick={onClear} type="button" variant="ghost">Limpiar</Button>
        <Button type="submit">Aplicar filtros</Button>
      </div>
    </form>
  )
}
