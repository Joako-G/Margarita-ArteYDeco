import type { PostgrestError } from '@supabase/supabase-js'

import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  adminDashboardLowStockRowsSchema,
  adminDashboardRecentOrderRowsSchema,
  adminDashboardSettingsRowSchema,
} from '../schemas/admin-dashboard.schema.js'
import type { IAdminDashboardSnapshot } from '../types/admin-dashboard.js'
import { RepositoryError } from '../utils/app-error.js'

export interface IAdminDashboardRepository {
  getSnapshot(): Promise<IAdminDashboardSnapshot>
}

interface ICountResult {
  count: number | null
  error: PostgrestError | null
}

const OPEN_ORDER_STATUSES = [
  'pending',
  'payment_pending',
  'paid',
  'preparing',
  'ready',
] as const

function readCount(result: ICountResult): number {
  if (result.error !== null || result.count === null) {
    throw new RepositoryError()
  }

  return result.count
}

export class AdminDashboardRepository implements IAdminDashboardRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async getSnapshot(): Promise<IAdminDashboardSnapshot> {
    const settingsResult = await this.client
      .from('settings')
      .select('low_stock_threshold')
      .eq('singleton_key', true)
      .maybeSingle()

    if (settingsResult.error !== null || settingsResult.data === null) {
      throw new RepositoryError('No fue posible consultar el umbral de stock bajo')
    }

    const settings = adminDashboardSettingsRowSchema.safeParse(settingsResult.data)

    if (!settings.success) {
      throw new RepositoryError('La configuración devolvió un formato inválido')
    }

    const lowStockThreshold = settings.data.low_stock_threshold
    const [
      activeProductsResult,
      outOfStockProductsResult,
      lowStockProductsCountResult,
      categoriesResult,
      customersResult,
      openOrdersResult,
      completedOrdersResult,
      recentOrdersResult,
      lowStockProductsResult,
    ] = await Promise.all([
      this.client
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null),
      this.client
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null)
        .eq('stock_quantity', 0),
      this.client
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null)
        .gt('stock_quantity', 0)
        .lte('stock_quantity', lowStockThreshold),
      this.client
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      this.client
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .is('deleted_at', null),
      this.client
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', OPEN_ORDER_STATUSES),
      this.client
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'picked_up'),
      this.client
        .from('orders')
        .select(`
          order_number,
          customer_first_name,
          customer_last_name,
          created_at,
          status,
          payment_method,
          total
        `)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(5),
      this.client
        .from('products')
        .select('id, name, stock_quantity')
        .eq('is_active', true)
        .is('deleted_at', null)
        .gt('stock_quantity', 0)
        .lte('stock_quantity', lowStockThreshold)
        .order('stock_quantity', { ascending: true })
        .order('name', { ascending: true })
        .limit(5),
    ])

    if (recentOrdersResult.error !== null || lowStockProductsResult.error !== null) {
      throw new RepositoryError()
    }

    const recentOrders = adminDashboardRecentOrderRowsSchema.safeParse(recentOrdersResult.data)
    const lowStockProducts = adminDashboardLowStockRowsSchema.safeParse(
      lowStockProductsResult.data,
    )

    if (!recentOrders.success || !lowStockProducts.success) {
      throw new RepositoryError('El resumen administrativo devolvió un formato inválido')
    }

    return {
      lowStockProducts: lowStockProducts.data.map((product) => ({
        id: product.id,
        name: product.name,
        stockQuantity: product.stock_quantity,
      })),
      metrics: {
        activeProducts: readCount(activeProductsResult),
        categories: readCount(categoriesResult),
        completedOrders: readCount(completedOrdersResult),
        customers: readCount(customersResult),
        lowStockProducts: readCount(lowStockProductsCountResult),
        openOrders: readCount(openOrdersResult),
        outOfStockProducts: readCount(outOfStockProductsResult),
      },
      recentOrders: recentOrders.data.map((order) => ({
        createdAt: order.created_at,
        customerFirstName: order.customer_first_name,
        customerLastName: order.customer_last_name,
        orderNumber: order.order_number,
        paymentMethod: order.payment_method,
        status: order.status,
        total: order.total,
      })),
    }
  }
}
