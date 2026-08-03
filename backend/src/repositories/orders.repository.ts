import type { PostgrestError } from '@supabase/supabase-js'

import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  createdOrderReferenceSchema,
  guestSessionOrderRowsSchema,
  orderIdRowSchema,
  orderItemRowsSchema,
  orderRowSchema,
  orderSettingsRowSchema,
  orderRecoveryCandidateSchema,
} from '../schemas/orders.schema.js'
import type {
  ICreateOrderInput,
  ICreatedOrderReference,
  IOrderConfirmationRow,
  IOrderRecoveryCandidate,
  IOrderSettingsRow,
} from '../types/orders.js'
import { AppError, RepositoryError } from '../utils/app-error.js'

export interface IOrderRepository {
  createWithStock(sessionId: string, input: ICreateOrderInput): Promise<ICreatedOrderReference>
  findConfirmation(orderId: string, sessionId: string): Promise<IOrderConfirmationRow | null>
  findOrderIdByNumber(orderNumber: string): Promise<string | null>
  findOrderSettings(): Promise<IOrderSettingsRow | null>
  findRecentOrderId(sessionId: string): Promise<string | null>
  findRecoveryCandidate(orderNumber: string): Promise<IOrderRecoveryCandidate | null>
}

function mapOrderRpcError(error: PostgrestError): AppError {
  if (error.code === 'P0001' && error.message === 'One or more products are unavailable') {
    return new AppError(
      409,
      'Uno o más productos ya no están disponibles en la cantidad solicitada',
      'PRODUCT_UNAVAILABLE',
    )
  }

  if (['22023', '22P02', '23514'].includes(error.code)) {
    return new AppError(400, 'No fue posible validar el pedido', 'INVALID_ORDER')
  }

  return new RepositoryError('No fue posible crear el pedido')
}

export class OrderRepository implements IOrderRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async createWithStock(
    sessionId: string,
    input: ICreateOrderInput,
  ): Promise<ICreatedOrderReference> {
    const { data, error } = await this.client.rpc('create_order_with_stock', {
      p_customer_first_name: input.customer.firstName,
      p_customer_last_name: input.customer.lastName,
      p_customer_phone: input.customer.phone,
      p_customer_phone_normalized: input.customer.phoneNormalized,
      p_guest_session_id: sessionId,
      p_items: input.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_notes: input.customer.notes,
      p_payment_method: input.paymentMethod,
    })

    if (error !== null) {
      throw mapOrderRpcError(error)
    }

    const parsed = createdOrderReferenceSchema.safeParse(data?.[0])

    if (!parsed.success) {
      throw new RepositoryError('La creación del pedido devolvió un formato inválido')
    }

    return { orderId: parsed.data.order_id, orderNumber: parsed.data.order_number }
  }

  public async findConfirmation(
    orderId: string,
    sessionId: string,
  ): Promise<IOrderConfirmationRow | null> {
    const relationResult = await this.client
      .from('guest_session_orders')
      .select('id')
      .eq('guest_session_id', sessionId)
      .eq('order_id', orderId)
      .maybeSingle()

    if (relationResult.error !== null) {
      throw new RepositoryError()
    }

    if (relationResult.data === null) {
      return null
    }

    const [orderResult, itemsResult] = await Promise.all([
      this.client
        .from('orders')
        .select(`
          order_number,
          created_at,
          status,
          payment_method,
          customer_first_name,
          customer_last_name,
          subtotal,
          discount,
          total
        `)
        .eq('id', orderId)
        .maybeSingle(),
      this.client
        .from('order_items')
        .select('product_name, quantity, unit_price, subtotal')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ])

    if (orderResult.error !== null || itemsResult.error !== null) {
      throw new RepositoryError()
    }

    if (orderResult.data === null) {
      return null
    }

    const parsedOrder = orderRowSchema.safeParse(orderResult.data)
    const parsedItems = orderItemRowsSchema.safeParse(itemsResult.data)

    if (!parsedOrder.success || !parsedItems.success) {
      throw new RepositoryError('La confirmación del pedido devolvió un formato inválido')
    }

    return {
      createdAt: parsedOrder.data.created_at,
      customerFirstName: parsedOrder.data.customer_first_name,
      customerLastName: parsedOrder.data.customer_last_name,
      discount: parsedOrder.data.discount,
      items: parsedItems.data.map((item) => ({
        productName: item.product_name,
        quantity: item.quantity,
        subtotal: item.subtotal,
        unitPrice: item.unit_price,
      })),
      orderNumber: parsedOrder.data.order_number,
      paymentMethod: parsedOrder.data.payment_method,
      status: parsedOrder.data.status,
      subtotal: parsedOrder.data.subtotal,
      total: parsedOrder.data.total,
    }
  }

  public async findOrderSettings(): Promise<IOrderSettingsRow | null> {
    const { data, error } = await this.client
      .from('settings')
      .select(`
        address,
        business_hours,
        maps_url,
        transfer_alias,
        transfer_cbu,
        bank_name,
        transfer_discount,
        whatsapp
      `)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError()
    }

    if (data === null) {
      return null
    }

    const parsed = orderSettingsRowSchema.safeParse(data)

    if (!parsed.success) {
      throw new RepositoryError('La configuración del pedido devolvió un formato inválido')
    }

    return {
      address: parsed.data.address,
      bankName: parsed.data.bank_name,
      businessHours: parsed.data.business_hours,
      mapsUrl: parsed.data.maps_url,
      transferAlias: parsed.data.transfer_alias,
      transferCbu: parsed.data.transfer_cbu,
      transferDiscount: parsed.data.transfer_discount,
      whatsapp: parsed.data.whatsapp,
    }
  }

  public async findOrderIdByNumber(orderNumber: string): Promise<string | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError()
    }

    if (data === null) {
      return null
    }

    const parsed = orderIdRowSchema.safeParse(data)

    if (!parsed.success) {
      throw new RepositoryError('La consulta del pedido devolvió un formato inválido')
    }

    return parsed.data.id
  }

  public async findRecentOrderId(sessionId: string): Promise<string | null> {
    const relationResult = await this.client
      .from('guest_session_orders')
      .select('order_id')
      .eq('guest_session_id', sessionId)

    if (relationResult.error !== null) {
      throw new RepositoryError()
    }

    const relations = guestSessionOrderRowsSchema.safeParse(relationResult.data)

    if (!relations.success) {
      throw new RepositoryError('Las relaciones de la sesión devolvieron un formato inválido')
    }

    if (relations.data.length === 0) {
      return null
    }

    const { data, error } = await this.client
      .from('orders')
      .select('id')
      .in('id', relations.data.map((relation) => relation.order_id))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError()
    }

    if (data === null) {
      return null
    }

    const parsed = orderIdRowSchema.safeParse(data)

    if (!parsed.success) {
      throw new RepositoryError('La consulta de la sesión devolvió un formato inválido')
    }

    return parsed.data.id
  }

  public async findRecoveryCandidate(
    orderNumber: string,
  ): Promise<IOrderRecoveryCandidate | null> {
    const { data, error } = await this.client
      .from('orders')
      .select('id, customer_phone_normalized')
      .eq('order_number', orderNumber)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError()
    }

    if (data === null) {
      return null
    }

    const parsed = orderRecoveryCandidateSchema.safeParse(data)

    if (!parsed.success) {
      throw new RepositoryError('La recuperación del pedido devolvió un formato inválido')
    }

    return {
      id: parsed.data.id,
      phoneNormalized: parsed.data.customer_phone_normalized,
    }
  }
}
