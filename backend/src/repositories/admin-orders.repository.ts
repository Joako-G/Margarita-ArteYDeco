import type { PostgrestError } from '@supabase/supabase-js'

import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  adminOrderItemRowsSchema,
  adminOrderRowsSchema,
} from '../schemas/admin-orders.schema.js'
import type {
  AdminOrderStatusType,
  AdminPaymentStatusType,
  IAdminOrderFilters,
  IAdminOrderItemRecord,
  IAdminOrderPage,
  IAdminOrderRecord,
} from '../types/admin-orders.js'
import { AppError, RepositoryError } from '../utils/app-error.js'
import { escapePostgrestLikePattern } from '../utils/postgrest-pattern.js'

export interface IAdminOrderRepository {
  cancel(
    orderId: string,
    actorProfileId: string,
    reason: string,
    expectedUpdatedAt: string,
    confirmManualRefund: boolean,
  ): Promise<boolean>
  findById(orderId: string): Promise<IAdminOrderRecord | null>
  findItems(orderId: string): Promise<readonly IAdminOrderItemRecord[]>
  findPage(filters: IAdminOrderFilters): Promise<IAdminOrderPage>
  transition(
    orderId: string,
    status: AdminOrderStatusType,
    paymentStatus: AdminPaymentStatusType,
    actorProfileId: string,
    expectedUpdatedAt: string,
  ): Promise<boolean>
}

function mapRpcError(error: PostgrestError): AppError {
  if (error.code === '40001') {
    return new AppError(
      409,
      'El pedido cambió mientras lo revisabas',
      'ORDER_UPDATE_CONFLICT',
    )
  }
  if (error.code === '23514') {
    return new AppError(
      409,
      'El pedido cambió o la transición ya no está disponible',
      'ORDER_TRANSITION_CONFLICT',
    )
  }
  if (error.code === '42501') {
    return new AppError(403, 'No tenés permiso para modificar pedidos', 'ADMIN_FORBIDDEN')
  }
  if (error.code === '22023') {
    return new AppError(400, 'No fue posible validar la operación', 'INVALID_ORDER_ACTION')
  }
  return new RepositoryError('No fue posible actualizar el pedido')
}

function mapOrder(row: unknown): IAdminOrderRecord {
  const parsed = adminOrderRowsSchema.element.safeParse(row)
  if (!parsed.success) {
    throw new RepositoryError('El pedido administrativo devolvió un formato inválido')
  }

  return {
    createdAt: parsed.data.created_at,
    customerFirstName: parsed.data.customer_first_name,
    customerLastName: parsed.data.customer_last_name,
    customerPhone: parsed.data.customer_phone,
    customerPhoneNormalized: parsed.data.customer_phone_normalized,
    deliveryMethod: parsed.data.delivery_method,
    discount: parsed.data.discount,
    id: parsed.data.id,
    itemCount: parsed.data.order_items[0]?.count ?? 0,
    notes: parsed.data.notes,
    orderNumber: parsed.data.order_number,
    paymentMethod: parsed.data.payment_method,
    paymentStatus: parsed.data.payment_status,
    pickedUpAt: parsed.data.picked_up_at,
    shippingAddress: parsed.data.shipping_address,
    status: parsed.data.status,
    subtotal: parsed.data.subtotal,
    total: parsed.data.total,
    updatedAt: parsed.data.updated_at,
  }
}

const ADMIN_ORDER_SELECT = `
  id,
  order_number,
  customer_first_name,
  customer_last_name,
  customer_phone,
  customer_phone_normalized,
  status,
  subtotal,
  discount,
  total,
  payment_method,
  payment_status,
  delivery_method,
  shipping_address,
  picked_up_at,
  notes,
  created_at,
  updated_at,
  order_items(count)
`

function quotePostgrestValue(value: string): string {
  const escaped = escapePostgrestLikePattern(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
  return `"%${escaped}%"`
}

export class AdminOrderRepository implements IAdminOrderRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPage(filters: IAdminOrderFilters): Promise<IAdminOrderPage> {
    let query = this.client.from('orders').select(ADMIN_ORDER_SELECT, { count: 'exact' })

    if (filters.status !== 'all') query = query.eq('status', filters.status)
    if (filters.paymentMethod !== 'all') {
      query = query.eq('payment_method', filters.paymentMethod)
    }
    if (filters.paymentStatus !== 'all') {
      query = query.eq('payment_status', filters.paymentStatus)
    }
    if (filters.search !== undefined) {
      const pattern = quotePostgrestValue(filters.search)
      query = query.or([
        `order_number.ilike.${pattern}`,
        `customer_first_name.ilike.${pattern}`,
        `customer_last_name.ilike.${pattern}`,
        `customer_phone.ilike.${pattern}`,
      ].join(','))
    }

    switch (filters.sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
      case 'totalAsc':
        query = query.order('total', { ascending: true })
        break
      case 'totalDesc':
        query = query.order('total', { ascending: false })
        break
    }

    const firstRow = (filters.page - 1) * filters.pageSize
    const { count, data, error } = await query
      .order('id', { ascending: true })
      .range(firstRow, firstRow + filters.pageSize - 1)

    if (error !== null || count === null) {
      throw new RepositoryError('No fue posible consultar los pedidos administrativos')
    }

    const rows = adminOrderRowsSchema.safeParse(data)
    if (!rows.success) {
      throw new RepositoryError('El listado de pedidos devolvió un formato inválido')
    }

    return { items: rows.data.map(mapOrder), totalItems: count }
  }

  public async findById(orderId: string): Promise<IAdminOrderRecord | null> {
    const { data, error } = await this.client
      .from('orders')
      .select(ADMIN_ORDER_SELECT)
      .eq('id', orderId)
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible consultar el pedido')
    return data === null ? null : mapOrder(data)
  }

  public async findItems(orderId: string): Promise<readonly IAdminOrderItemRecord[]> {
    const { data, error } = await this.client
      .from('order_items')
      .select('product_name,quantity,unit_price,subtotal')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error !== null) throw new RepositoryError('No fue posible consultar el detalle del pedido')
    const rows = adminOrderItemRowsSchema.safeParse(data)
    if (!rows.success) throw new RepositoryError('Los productos del pedido devolvieron un formato inválido')
    return rows.data.map((item) => ({
      productName: item.product_name,
      quantity: item.quantity,
      subtotal: item.subtotal,
      unitPrice: item.unit_price,
    }))
  }

  public async transition(
    orderId: string,
    status: AdminOrderStatusType,
    paymentStatus: AdminPaymentStatusType,
    actorProfileId: string,
    expectedUpdatedAt: string,
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc('transition_order_status', {
      p_actor_profile_id: actorProfileId,
      p_expected_updated_at: expectedUpdatedAt,
      p_order_id: orderId,
      p_payment_status: paymentStatus,
      p_status: status,
    })
    if (error !== null) throw mapRpcError(error)
    return data
  }

  public async cancel(
    orderId: string,
    actorProfileId: string,
    reason: string,
    expectedUpdatedAt: string,
    confirmManualRefund: boolean,
  ): Promise<boolean> {
    const { data, error } = await this.client.rpc('cancel_order_with_stock', {
      p_actor_profile_id: actorProfileId,
      p_confirm_manual_refund: confirmManualRefund,
      p_expected_updated_at: expectedUpdatedAt,
      p_order_id: orderId,
      p_reason: reason,
    })
    if (error !== null) throw mapRpcError(error)
    return data
  }
}
