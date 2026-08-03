import type { PostgrestError } from '@supabase/supabase-js'

import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  adminInventoryMovementRowsSchema,
  adminInventoryProductRowSchema,
} from '../schemas/admin-inventory.schema.js'
import type {
  IAdminInventoryFilters,
  IAdminInventoryPage,
} from '../types/admin-inventory.js'
import { RepositoryError } from '../utils/app-error.js'

export type InventoryAdjustmentDatabaseErrorCode = '22023' | '23514' | '42501' | 'P0002'

export class InventoryAdjustmentDatabaseError extends Error {
  public constructor(public readonly code: InventoryAdjustmentDatabaseErrorCode) {
    super('The inventory adjustment was rejected by the database')
    this.name = 'InventoryAdjustmentDatabaseError'
  }
}

export interface IAdminInventoryRepository {
  adjustStock(
    productId: string,
    quantityDelta: number,
    reason: string,
    actorProfileId: string,
  ): Promise<number>
  findPage(productId: string, filters: IAdminInventoryFilters): Promise<IAdminInventoryPage | null>
}

function isAdjustmentDatabaseError(
  error: PostgrestError,
): error is PostgrestError & { code: InventoryAdjustmentDatabaseErrorCode } {
  return ['22023', '23514', '42501', 'P0002'].includes(error.code)
}

export class AdminInventoryRepository implements IAdminInventoryRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPage(
    productId: string,
    filters: IAdminInventoryFilters,
  ): Promise<IAdminInventoryPage | null> {
    const productResult = await this.client
      .from('products')
      .select('id,name,stock_quantity')
      .eq('id', productId)
      .is('deleted_at', null)
      .maybeSingle()

    if (productResult.error !== null) {
      throw new RepositoryError('No fue posible consultar el stock del producto')
    }

    if (productResult.data === null) return null

    const product = adminInventoryProductRowSchema.safeParse(productResult.data)
    if (!product.success) {
      throw new RepositoryError('El stock del producto devolvió un formato inválido')
    }

    const firstRow = (filters.page - 1) * filters.pageSize
    const { count, data, error } = await this.client
      .from('inventory_movements')
      .select(`
        id,
        movement_type,
        quantity_delta,
        stock_before,
        stock_after,
        reason,
        created_at,
        actor:profiles!inventory_movements_created_by_fkey(full_name),
        order:orders!inventory_movements_order_id_fkey(order_number)
      `, { count: 'exact' })
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(firstRow, firstRow + filters.pageSize - 1)

    if (error !== null || count === null) {
      throw new RepositoryError('No fue posible consultar el historial de inventario')
    }

    const movements = adminInventoryMovementRowsSchema.safeParse(data)
    if (!movements.success) {
      throw new RepositoryError('El historial de inventario devolvió un formato inválido')
    }

    return {
      items: movements.data.map((movement) => ({
        actorName: movement.actor?.full_name ?? null,
        createdAt: movement.created_at,
        id: movement.id,
        movementType: movement.movement_type,
        orderNumber: movement.order?.order_number ?? null,
        quantityDelta: movement.quantity_delta,
        reason: movement.reason,
        stockAfter: movement.stock_after,
        stockBefore: movement.stock_before,
      })),
      product: {
        id: product.data.id,
        name: product.data.name,
        stockQuantity: product.data.stock_quantity,
      },
      totalItems: count,
    }
  }

  public async adjustStock(
    productId: string,
    quantityDelta: number,
    reason: string,
    actorProfileId: string,
  ): Promise<number> {
    const { data, error } = await this.client.rpc('adjust_product_stock', {
      p_actor_profile_id: actorProfileId,
      p_product_id: productId,
      p_quantity_delta: quantityDelta,
      p_reason: reason,
    })

    if (error !== null) {
      if (isAdjustmentDatabaseError(error)) {
        throw new InventoryAdjustmentDatabaseError(error.code)
      }
      throw new RepositoryError('No fue posible ajustar el stock del producto')
    }

    if (!Number.isInteger(data) || data < 0) {
      throw new RepositoryError('El ajuste de stock devolvió un formato inválido')
    }

    return data
  }
}
