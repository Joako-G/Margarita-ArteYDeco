import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'

import { Button, Input, Select } from '@/shared/components'

import {
  adminOrderFiltersFormSchema,
  type AdminOrderFiltersFormType,
} from '../schemas/admin-order-filters.schema'
import type { IAdminOrderFilters } from '../types/admin-orders'

interface IAdminOrderFiltersProps {
  filters: IAdminOrderFilters
  onApply: (values: AdminOrderFiltersFormType) => void
  onClear: () => void
}

const COMPACT_FILTERS_MEDIA_QUERY = '(max-width: 768px)'

function getValues(filters: IAdminOrderFilters): AdminOrderFiltersFormType {
  return {
    pageSize: String(filters.pageSize) as '10' | '20' | '50',
    paymentMethod: filters.paymentMethod,
    paymentStatus: filters.paymentStatus,
    search: filters.search ?? '',
    sort: filters.sort,
    status: filters.status,
  }
}

function getActiveFilterCount(filters: IAdminOrderFilters): number {
  let count = 0

  if (filters.search) count += 1
  if (filters.status !== 'all') count += 1
  if (filters.paymentMethod !== 'all') count += 1
  if (filters.paymentStatus !== 'all') count += 1
  if (filters.sort !== 'newest') count += 1

  return count
}

export function AdminOrderFilters({ filters, onApply, onClear }: IAdminOrderFiltersProps) {
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
    resolver: zodResolver(adminOrderFiltersFormSchema),
  })

  useEffect(() => reset(getValues(filters)), [filters, reset])

  const applyFilters = handleSubmit(onApply)
  const activeFilterCount = useMemo(() => getActiveFilterCount(filters), [filters])

  const statusRegister = register('status', {
    onChange: isCompact ? applyFilters : undefined,
  })
  const paymentMethodRegister = register('paymentMethod', {
    onChange: isCompact ? applyFilters : undefined,
  })
  const paymentStatusRegister = register('paymentStatus', {
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
      <Select label="Estado del pedido" {...statusRegister}>
        <option value="all">Todos</option>
        <option value="pending">Pendientes</option>
        <option value="confirmed">Confirmados</option>
        <option value="preparing">En preparación</option>
        <option value="ready">Listos</option>
        <option value="picked_up">Retirados</option>
        <option value="delivered">Entregados</option>
        <option value="cancelled">Cancelados</option>
      </Select>
      <Select label="Cómo pagó" {...paymentMethodRegister}>
        <option value="all">Todos</option>
        <option value="cash">Efectivo</option>
        <option value="bank_transfer">Transferencia</option>
      </Select>
      <Select label="Estado del pago" {...paymentStatusRegister}>
        <option value="all">Todos</option>
        <option value="pending">Sin confirmar</option>
        <option value="paid">Confirmado</option>
        <option value="rejected">Rechazado</option>
      </Select>
      <Select label="Ordenar por" {...sortRegister}>
        <option value="newest">Más recientes primero</option>
        <option value="oldest">Más antiguos primero</option>
        <option value="totalDesc">Mayor importe primero</option>
        <option value="totalAsc">Menor importe primero</option>
      </Select>
      <Select label="Resultados por página" {...pageSizeRegister}>
        <option value="10">10 pedidos</option>
        <option value="20">20 pedidos</option>
        <option value="50">50 pedidos</option>
      </Select>
    </>
  )

  return (
    <form
      aria-label="Filtros de pedidos"
      className="admin-order-filters"
      onSubmit={applyFilters}
    >
      <div className="admin-order-filters__search">
        <Search aria-hidden="true" className="admin-order-filters__search-icon" size={18} />
        <Input
          autoComplete="off"
          className="admin-order-filters__search-input"
          error={errors.search?.message}
          label="Buscar pedido"
          placeholder="Ej.: 000123, María o 11 2345-6789"
          type="search"
          {...register('search')}
        />
      </div>

      {isCompact ? (
        <>
          <div className="admin-order-filters__mobile-toolbar">
            <Button
              aria-expanded={areAdvancedFiltersOpen}
              onClick={() => setAreAdvancedFiltersOpen((open) => !open)}
              type="button"
              variant="secondary"
            >
              <SlidersHorizontal aria-hidden="true" size={18} />
              Más filtros
              {activeFilterCount > 0 ? (
                <span className="admin-order-filters__active-count">{activeFilterCount}</span>
              ) : null}
            </Button>
            <Button onClick={onClear} type="button" variant="ghost">
              <RotateCcw aria-hidden="true" size={18} />
              Quitar filtros
            </Button>
          </div>
          <div
            className={`admin-order-filters__advanced ${areAdvancedFiltersOpen ? 'admin-order-filters__advanced--open' : ''}`}
          >
            {advancedFilters}
          </div>
        </>
      ) : (
        <>
          {advancedFilters}
          <div className="admin-order-filters__actions">
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
