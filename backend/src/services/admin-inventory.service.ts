import {
  InventoryAdjustmentDatabaseError,
  type IAdminInventoryRepository,
} from '../repositories/admin-inventory.repository.js'
import type {
  IAdminInventoryDto,
  IAdminInventoryFilters,
  IAdminStockAdjustmentDto,
  IAdminStockAdjustmentRequest,
} from '../types/admin-inventory.js'
import { AppError } from '../utils/app-error.js'

export interface IAdminInventoryService {
  adjustStock(
    productId: string,
    input: IAdminStockAdjustmentRequest,
    actorProfileId: string,
  ): Promise<IAdminStockAdjustmentDto>
  getHistory(productId: string, filters: IAdminInventoryFilters): Promise<IAdminInventoryDto>
}

export class AdminInventoryService implements IAdminInventoryService {
  public constructor(private readonly repository: IAdminInventoryRepository) {}

  public async getHistory(
    productId: string,
    filters: IAdminInventoryFilters,
  ): Promise<IAdminInventoryDto> {
    const page = await this.repository.findPage(productId, filters)
    if (page === null) throw this.productNotFoundError()
    const totalPages = Math.ceil(page.totalItems / filters.pageSize)

    return {
      movements: page.items,
      pagination: {
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: page.totalItems,
        totalPages,
      },
      product: page.product,
    }
  }

  public async adjustStock(
    productId: string,
    input: IAdminStockAdjustmentRequest,
    actorProfileId: string,
  ): Promise<IAdminStockAdjustmentDto> {
    const quantityDelta = input.direction === 'increase' ? input.quantity : -input.quantity

    try {
      return {
        stockQuantity: await this.repository.adjustStock(
          productId,
          quantityDelta,
          input.reason,
          actorProfileId,
        ),
      }
    } catch (error) {
      if (!(error instanceof InventoryAdjustmentDatabaseError)) throw error

      switch (error.code) {
        case 'P0002':
          throw this.productNotFoundError()
        case '23514':
          throw new AppError(
            409,
            'No podés retirar más unidades que el stock disponible',
            'INSUFFICIENT_STOCK_FOR_ADJUSTMENT',
          )
        case '42501':
          throw new AppError(403, 'No tenés permiso para ajustar el stock', 'ADMIN_ACCESS_FORBIDDEN')
        case '22023':
          throw new AppError(400, 'El ajuste de stock no es válido', 'STOCK_ADJUSTMENT_INVALID')
      }
    }
  }

  private productNotFoundError(): AppError {
    return new AppError(404, 'Producto no encontrado', 'ADMIN_PRODUCT_NOT_FOUND')
  }
}
