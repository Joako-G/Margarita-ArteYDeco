import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
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

const COMPACT_FILTERS_MEDIA_QUERY = '(max-width: 768px)'

function getFormValues(filters: IAdminProductFilters): AdminProductFiltersFormType {
  return {
    pageSize: String(filters.pageSize) as AdminProductFiltersFormType['pageSize'],
    publication: filters.publication,
    search: filters.search ?? '',
    sort: filters.sort,
    stock: filters.stock,
  }
}

function getActiveFilterCount(filters: IAdminProductFilters): number {
  let count = 0

  if (filters.search) count += 1
  if (filters.publication !== 'all') count += 1
  if (filters.stock !== 'all') count += 1
  if (filters.sort !== 'newest') count += 1

  return count
}

export function AdminProductFilters({ filters, onApply, onClear }: IAdminProductFiltersProps) {
  const [areAdvancedFiltersOpen, setAreAdvancedFiltersOpen] = useState(false)
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(COMPACT_FILTERS_MEDIA_QUERY).matches : false,
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_FILTERS_MEDIA_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsCompact(event.matches)

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

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

  const applyFilters = handleSubmit(onApply)
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters])

  const publicationRegister = register('publication', {
    onChange: isCompact ? applyFilters : undefined,
  })
  const stockRegister = register('stock', {
    onChange: isCompact ? applyFilters : undefined,
  })
  const sortRegister = register('sort', {
    onChange: isCompact ? applyFilters : undefined,
  })
  const pageSizeRegister = register('pageSize', {
    onChange: isCompact ? applyFilters : undefined,
  })

  const advancedFilters = (
    <>
      <Select label={isCompact ? 'Visible en la tienda' : 'Publicación'} {...publicationRegister}>
        <option value="all">Todos</option>
        <option value="active">{isCompact ? 'Visibles' : 'Activos'}</option>
        <option value="inactive">{isCompact ? 'Ocultos' : 'Inactivos'}</option>
      </Select>
      <Select label={isCompact ? 'Unidades disponibles' : 'Stock'} {...stockRegister}>
        <option value="all">Todos</option>
        <option value="inStock">{isCompact ? 'En stock' : 'Disponible'}</option>
        <option value="lowStock">Stock bajo</option>
        <option value="outOfStock">Sin stock</option>
      </Select>
      <Select label={isCompact ? 'Mostrar primero' : 'Ordenar por'} {...sortRegister}>
        <option value="newest">Última actualización</option>
        <option value="nameAsc">Nombre A–Z</option>
        <option value="nameDesc">Nombre Z–A</option>
        <option value="priceAsc">Menor precio</option>
        <option value="priceDesc">Mayor precio</option>
        <option value="stockAsc">Menor stock</option>
        <option value="stockDesc">Mayor stock</option>
      </Select>
      <Select label={isCompact ? 'Productos por página' : 'Filas'} {...pageSizeRegister}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
    </>
  )

  return (
    <form
      aria-label="Filtros de productos"
      className="admin-product-filters"
      onSubmit={applyFilters}
    >
      <div className="admin-product-filters__search">
        <Search aria-hidden="true" className="admin-product-filters__search-icon" size={18} />
        <Input
          autoComplete="off"
          className="admin-product-filters__search-input"
          error={errors.search?.message}
          label="Buscar producto"
          placeholder="Nombre del producto"
          type="search"
          {...register('search')}
        />
      </div>

      {isCompact ? (
        <>
          <div className="admin-product-filters__mobile-toolbar">
            <Button
              aria-expanded={areAdvancedFiltersOpen}
              onClick={() => setAreAdvancedFiltersOpen((open) => !open)}
              type="button"
              variant="secondary"
            >
              <SlidersHorizontal aria-hidden="true" size={18} />
              Más filtros
              {activeFilterCount > 0 ? (
                <span className="admin-product-filters__active-count">{activeFilterCount}</span>
              ) : null}
            </Button>
            <Button onClick={onClear} type="button" variant="ghost">
              <RotateCcw aria-hidden="true" size={18} />
              Quitar filtros
            </Button>
          </div>
          <div
            className={`admin-product-filters__advanced ${areAdvancedFiltersOpen ? 'admin-product-filters__advanced--open' : ''}`}
          >
            {advancedFilters}
          </div>
        </>
      ) : (
        <>
          {advancedFilters}
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
        </>
      )}
    </form>
  )
}
