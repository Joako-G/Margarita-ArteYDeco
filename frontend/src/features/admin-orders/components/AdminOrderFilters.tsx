import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
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

export function AdminOrderFilters({ filters, onApply, onClear }: IAdminOrderFiltersProps) {
  const { formState: { errors }, handleSubmit, register, reset } = useForm({
    defaultValues: getValues(filters),
    resolver: zodResolver(adminOrderFiltersFormSchema),
  })

  useEffect(() => reset(getValues(filters)), [filters, reset])

  return (
    <form className="admin-order-filters" noValidate onSubmit={handleSubmit(onApply)}>
      <Input
        error={errors.search?.message}
        label="Buscar pedido o cliente"
        placeholder="Ej.: MAD-20260803 o Ana"
        type="search"
        {...register('search')}
      />
      <Select label="Estado del pedido" {...register('status')}>
        <option value="all">Todos</option>
        <option value="pending">Pendientes</option>
        <option value="payment_pending">Pendientes de pago</option>
        <option value="paid">Pagados</option>
        <option value="preparing">En preparación</option>
        <option value="ready">Listos para retirar</option>
        <option value="picked_up">Retirados</option>
        <option value="cancelled">Cancelados</option>
      </Select>
      <Select label="Método de pago" {...register('paymentMethod')}>
        <option value="all">Todos</option>
        <option value="cash">Efectivo</option>
        <option value="bank_transfer">Transferencia</option>
      </Select>
      <Select label="Estado del pago" {...register('paymentStatus')}>
        <option value="all">Todos</option>
        <option value="pending">Pendiente</option>
        <option value="paid">Confirmado</option>
        <option value="rejected">Rechazado</option>
      </Select>
      <Select label="Ordenar" {...register('sort')}>
        <option value="newest">Más recientes</option>
        <option value="oldest">Más antiguos</option>
        <option value="totalDesc">Mayor total</option>
        <option value="totalAsc">Menor total</option>
      </Select>
      <Select label="Resultados" {...register('pageSize')}>
        <option value="10">10 por página</option>
        <option value="20">20 por página</option>
        <option value="50">50 por página</option>
      </Select>
      <div className="admin-order-filters__actions">
        <Button onClick={onClear} type="button" variant="ghost">Limpiar</Button>
        <Button type="submit">Aplicar filtros</Button>
      </div>
    </form>
  )
}
