import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button, Input, Select } from '@/shared/components'

import {
  adminProductFiltersFormSchema,
  type AdminProductFiltersFormType,
} from '../schemas/admin-product-filters.schema'
import type { IAdminProductFilters } from '../types/admin-products'

interface IAdminProductFiltersProps {
  filters: IAdminProductFilters
  onApply: (values: AdminProductFiltersFormType) => void
  onClear: () => void
}

function getFormValues(filters: IAdminProductFilters): AdminProductFiltersFormType {
  return {
    pageSize: String(filters.pageSize) as AdminProductFiltersFormType['pageSize'],
    publication: filters.publication,
    search: filters.search ?? '',
    sort: filters.sort,
    stock: filters.stock,
  }
}

export function AdminProductFilters({ filters, onApply, onClear }: IAdminProductFiltersProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<AdminProductFiltersFormType>({
    defaultValues: getFormValues(filters),
    resolver: zodResolver(adminProductFiltersFormSchema),
  })

  useEffect(() => {
    reset(getFormValues(filters))
  }, [filters, reset])

  return (
    <form
      aria-label="Filtros de productos"
      className="admin-product-filters"
      onSubmit={handleSubmit(onApply)}
    >
      <Input
        autoComplete="off"
        error={errors.search?.message}
        label="Buscar producto"
        placeholder="Nombre del producto"
        type="search"
        {...register('search')}
      />
      <Select label="Publicación" {...register('publication')}>
        <option value="all">Todos</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
      </Select>
      <Select label="Stock" {...register('stock')}>
        <option value="all">Todos</option>
        <option value="inStock">Disponible</option>
        <option value="lowStock">Stock bajo</option>
        <option value="outOfStock">Sin stock</option>
      </Select>
      <Select label="Ordenar por" {...register('sort')}>
        <option value="newest">Última actualización</option>
        <option value="nameAsc">Nombre A–Z</option>
        <option value="nameDesc">Nombre Z–A</option>
        <option value="priceAsc">Menor precio</option>
        <option value="priceDesc">Mayor precio</option>
        <option value="stockAsc">Menor stock</option>
        <option value="stockDesc">Mayor stock</option>
      </Select>
      <Select label="Filas" {...register('pageSize')}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
      <div className="admin-product-filters__actions">
        <Button type="submit">
          <Search aria-hidden="true" size={18} />
          Aplicar
        </Button>
        <Button onClick={onClear} type="button" variant="ghost">
          <RotateCcw aria-hidden="true" size={18} />
          Limpiar
        </Button>
      </div>
    </form>
  )
}
