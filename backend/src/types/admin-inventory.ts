export type InventoryMovementType =
  | 'initial_stock'
  | 'manual_adjustment'
  | 'order_cancelled'
  | 'order_created'

export type AdminStockAdjustmentDirectionType = 'decrease' | 'increase'

export interface IAdminInventoryFilters {
  page: number
  pageSize: number
}

export interface IAdminInventoryProductRecord {
  id: string
  name: string
  stockQuantity: number
}

export interface IAdminInventoryMovementRecord {
  actorName: string | null
  createdAt: string
  id: string
  movementType: InventoryMovementType
  orderNumber: string | null
  quantityDelta: number
  reason: string | null
  stockAfter: number
  stockBefore: number
}

export interface IAdminInventoryPage {
  items: readonly IAdminInventoryMovementRecord[]
  product: IAdminInventoryProductRecord
  totalItems: number
}

export interface IAdminInventoryDto {
  movements: readonly IAdminInventoryMovementRecord[]
  pagination: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  product: IAdminInventoryProductRecord
}

export interface IAdminStockAdjustmentRequest {
  direction: AdminStockAdjustmentDirectionType
  quantity: number
  reason: string
}

export interface IAdminStockAdjustmentDto {
  stockQuantity: number
}
