import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  adminCustomerOrderRowsSchema,
  adminCustomerRowSchema,
  adminCustomerRowsSchema,
} from '../schemas/admin-customers.schema.js'
import type {
  IAdminCustomerFilters,
  IAdminCustomerOrderPage,
  IAdminCustomerPage,
  IAdminCustomerRecord,
  IAdminCustomerUpdateInput,
} from '../types/admin-customers.js'
import { RepositoryError } from '../utils/app-error.js'
import { escapePostgrestLikePattern } from '../utils/postgrest-pattern.js'

export class CustomerPhoneConflictError extends Error {
  public constructor() {
    super('The normalized customer phone is already in use')
    this.name = 'CustomerPhoneConflictError'
  }
}

export interface IAdminCustomerRepository {
  findById(customerId: string): Promise<IAdminCustomerRecord | null>
  findOrders(customerId: string, page: number, pageSize: number): Promise<IAdminCustomerOrderPage>
  findPage(filters: IAdminCustomerFilters): Promise<IAdminCustomerPage>
  softDelete(customerId: string, expectedUpdatedAt: string): Promise<boolean>
  update(customerId: string, input: IAdminCustomerUpdateInput): Promise<IAdminCustomerRecord | null>
}

const CUSTOMER_SELECT = `
  id,
  first_name,
  last_name,
  phone,
  phone_normalized,
  notes,
  created_at,
  updated_at,
  orders(count)
`

function mapCustomer(row: unknown): IAdminCustomerRecord {
  const customer = adminCustomerRowSchema.safeParse(row)
  if (!customer.success) {
    throw new RepositoryError('El cliente administrativo devolvió un formato inválido')
  }

  return {
    createdAt: customer.data.created_at,
    firstName: customer.data.first_name,
    id: customer.data.id,
    lastName: customer.data.last_name,
    notes: customer.data.notes,
    orderCount: customer.data.orders[0]?.count ?? 0,
    phone: customer.data.phone,
    phoneNormalized: customer.data.phone_normalized,
    updatedAt: customer.data.updated_at,
  }
}

export class AdminCustomerRepository implements IAdminCustomerRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPage(filters: IAdminCustomerFilters): Promise<IAdminCustomerPage> {
    let query = this.client
      .from('customers')
      .select(CUSTOMER_SELECT, { count: 'exact' })
      .is('deleted_at', null)

    if (filters.search !== undefined) {
      const pattern = `%${escapePostgrestLikePattern(filters.search)}%`
      query = query.or([
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
      ].join(','))
    }

    switch (filters.sort) {
      case 'nameAsc':
        query = query.order('first_name', { ascending: true }).order('last_name', { ascending: true })
        break
      case 'nameDesc':
        query = query.order('first_name', { ascending: false }).order('last_name', { ascending: false })
        break
      case 'newest':
        query = query.order('created_at', { ascending: false })
        break
      case 'oldest':
        query = query.order('created_at', { ascending: true })
        break
    }

    const firstRow = (filters.page - 1) * filters.pageSize
    const { count, data, error } = await query
      .order('id', { ascending: true })
      .range(firstRow, firstRow + filters.pageSize - 1)

    if (error !== null || count === null) {
      throw new RepositoryError('No fue posible consultar los clientes administrativos')
    }

    const rows = adminCustomerRowsSchema.safeParse(data)
    if (!rows.success) throw new RepositoryError('El listado de clientes devolvió un formato inválido')
    return { items: rows.data.map(mapCustomer), totalItems: count }
  }

  public async findById(customerId: string): Promise<IAdminCustomerRecord | null> {
    const { data, error } = await this.client
      .from('customers')
      .select(CUSTOMER_SELECT)
      .eq('id', customerId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible consultar el cliente')
    return data === null ? null : mapCustomer(data)
  }

  public async findOrders(
    customerId: string,
    page: number,
    pageSize: number,
  ): Promise<IAdminCustomerOrderPage> {
    const firstRow = (page - 1) * pageSize
    const { count, data, error } = await this.client
      .from('orders')
      .select('id, order_number, status, payment_method, payment_status, total, created_at', {
        count: 'exact',
      })
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(firstRow, firstRow + pageSize - 1)

    if (error !== null || count === null) {
      throw new RepositoryError('No fue posible consultar el historial del cliente')
    }

    const rows = adminCustomerOrderRowsSchema.safeParse(data)
    if (!rows.success) throw new RepositoryError('El historial del cliente devolvió un formato inválido')
    return {
      items: rows.data.map((order) => ({
        createdAt: order.created_at,
        id: order.id,
        orderNumber: order.order_number,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        status: order.status,
        total: order.total,
      })),
      totalItems: count,
    }
  }

  public async update(
    customerId: string,
    input: IAdminCustomerUpdateInput,
  ): Promise<IAdminCustomerRecord | null> {
    const { data, error } = await this.client
      .from('customers')
      .update({
        first_name: input.firstName,
        last_name: input.lastName,
        notes: input.notes,
        phone: input.phone,
        phone_normalized: input.phoneNormalized,
      })
      .eq('id', customerId)
      .eq('updated_at', input.expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error?.code === '23505') throw new CustomerPhoneConflictError()
    if (error !== null) throw new RepositoryError('No fue posible actualizar el cliente')
    return data === null ? null : this.findById(customerId)
  }

  public async softDelete(customerId: string, expectedUpdatedAt: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', customerId)
      .eq('updated_at', expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible dar de baja el cliente')
    return data !== null
  }
}
