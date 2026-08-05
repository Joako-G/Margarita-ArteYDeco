import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
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

const COMPACT_FILTERS_MEDIA_QUERY = '(max-width: 768px)'

function getValues(filters: IAdminCategoryFilters): AdminCategoryFiltersFormType {
  return {
    area: filters.area,
    pageSize: String(filters.pageSize) as '10' | '20' | '50',
    publication: filters.publication,
    search: filters.search ?? '',
    sort: filters.sort,
  }
}

function getActiveFilterCount(filters: IAdminCategoryFilters): number {
  let count = 0

  if (filters.search) count += 1
  if (filters.area !== 'all') count += 1
  if (filters.publication !== 'all') count += 1
  if (filters.sort !== 'orderAsc') count += 1

  return count
}

export function AdminCategoryFilters({
  filters,
  onApply,
  onClear,
}: IAdminCategoryFiltersProps) {
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

  const { formState: { errors }, handleSubmit, register, reset } = useForm({
    defaultValues: getValues(filters),
    resolver: zodResolver(adminCategoryFiltersFormSchema),
  })

  useEffect(() => reset(getValues(filters)), [filters, reset])

  const applyFilters = handleSubmit(onApply)
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters])

  const areaRegister = register('area', {
    onChange: isCompact ? applyFilters : undefined,
  })
  const publicationRegister = register('publication', {
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
      <Select label="Área" {...areaRegister}>
        <option value="all">Todas</option>
        <option value="art">Arte</option>
        <option value="decoration">Decoración</option>
      </Select>
      <Select label="Visible en la tienda" {...publicationRegister}>
        <option value="all">Todas</option>
        <option value="active">Visibles</option>
        <option value="inactive">Ocultas</option>
      </Select>
      <Select label="Mostrar primero" {...sortRegister}>
        <option value="orderAsc">Orden en la tienda</option>
        <option value="orderDesc">Orden inverso en la tienda</option>
        <option value="nameAsc">Nombre A–Z</option>
        <option value="nameDesc">Nombre Z–A</option>
        <option value="newest">Actualizadas recientemente</option>
      </Select>
      <Select label="Categorías por página" {...pageSizeRegister}>
        <option value="10">10</option>
        <option value="20">20</option>
        <option value="50">50</option>
      </Select>
    </>
  )

  return (
    <form
      aria-label="Filtros de categorías"
      className="admin-category-filters"
      noValidate
      onSubmit={applyFilters}
    >
      <div className="admin-category-filters__search">
        <Search aria-hidden="true" className="admin-category-filters__search-icon" size={18} />
        <Input
          autoComplete="off"
          className="admin-category-filters__search-input"
          error={errors.search?.message}
          label="Buscar categoría"
          placeholder="Nombre de la categoría"
          type="search"
          {...register('search')}
        />
      </div>

      {isCompact ? (
        <>
          <div className="admin-category-filters__mobile-toolbar">
            <Button
              aria-expanded={areAdvancedFiltersOpen}
              onClick={() => setAreAdvancedFiltersOpen((open) => !open)}
              type="button"
              variant="secondary"
            >
              <SlidersHorizontal aria-hidden="true" size={18} />
              Más filtros
              {activeFilterCount > 0 ? (
                <span className="admin-category-filters__active-count">{activeFilterCount}</span>
              ) : null}
            </Button>
            <Button onClick={onClear} type="button" variant="ghost">
              <RotateCcw aria-hidden="true" size={18} />
              Quitar filtros
            </Button>
          </div>
          <div
            className={`admin-category-filters__advanced ${areAdvancedFiltersOpen ? 'admin-category-filters__advanced--open' : ''}`}
          >
            {advancedFilters}
          </div>
        </>
      ) : (
        <>
          {advancedFilters}
          <div className="admin-category-filters__actions">
            <Button type="submit">
              <Search aria-hidden="true" size={18} />
              Filtrar
            </Button>
            <Button onClick={onClear} type="button" variant="ghost">
              <RotateCcw aria-hidden="true" size={18} />
              Quitar filtros
            </Button>
          </div>
        </>
      )}
    </form>
  )
}
