export type AdminInventoryMovementType =
  | 'initial_stock'
  | 'manual_adjustment'
  | 'order_cancelled'
  | 'order_created'

export type AdminStockAdjustmentDirectionType = 'decrease' | 'increase'

export interface IAdminInventoryMovement {
  actorName: string | null
  createdAt: string
  id: string
  movementType: AdminInventoryMovementType
  orderNumber: string | null
  quantityDelta: number
  reason: string | null
  stockAfter: number
  stockBefore: number
}

export interface IAdminInventoryHistory {
  movements: readonly IAdminInventoryMovement[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  product: {
    id: string
    name: string
    stockQuantity: number
  }
}

export interface IAdminStockAdjustmentPayload {
  direction: AdminStockAdjustmentDirectionType
  quantity: number
  reason: string
}

export interface IAdminStockAdjustmentResult {
  stockQuantity: number
}
