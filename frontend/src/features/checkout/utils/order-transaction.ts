import type {
  ICreateOrderItem,
  IOrderInventoryProduct,
  IOrderTransactionInput,
  IOrderTransactionResult,
} from '../types/checkout'
import { calculateCheckoutTotals } from './checkout-calculations.ts'
import { normalizePhone } from './checkout-links.ts'

type OrderTransactionErrorCodeType =
  'EMPTY_CART' | 'INVALID_QUANTITY' | 'PRODUCT_UNAVAILABLE' | 'STOCK_CHANGED'

export class OrderTransactionError extends Error {
  code: OrderTransactionErrorCodeType

  constructor(code: OrderTransactionErrorCodeType, message: string) {
    super(message)
    this.code = code
    this.name = 'OrderTransactionError'
  }
}

function consolidateItems(items: ICreateOrderItem[]): ICreateOrderItem[] {
  const quantitiesByProduct = new Map<string, number>()

  items.forEach((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderTransactionError(
        'INVALID_QUANTITY',
        'Revisá las cantidades del carrito antes de confirmar.',
      )
    }

    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
    )
  })

  return Array.from(quantitiesByProduct, ([productId, quantity]) => ({
    productId,
    quantity,
  }))
}

function findAvailableProduct(
  inventoryById: Map<string, IOrderInventoryProduct>,
  item: ICreateOrderItem,
): IOrderInventoryProduct {
  const product = inventoryById.get(item.productId)

  if (!product || !product.isActive) {
    throw new OrderTransactionError(
      'PRODUCT_UNAVAILABLE',
      'Uno de los productos dejó de estar disponible. Volvé al carrito para revisarlo.',
    )
  }

  if (product.stockQuantity < item.quantity) {
    throw new OrderTransactionError(
      'STOCK_CHANGED',
      `Cambió el stock de ${product.name}. Volvé al carrito para ajustar la cantidad.`,
    )
  }

  return product
}

export function createOrderTransaction({
  inventory,
  orderNumber,
  request,
  transferDiscount,
}: IOrderTransactionInput): IOrderTransactionResult {
  if (request.items.length === 0) {
    throw new OrderTransactionError(
      'EMPTY_CART',
      'Tu carrito está vacío. Agregá al menos un producto antes de confirmar.',
    )
  }

  const consolidatedItems = consolidateItems(request.items)
  const inventoryById = new Map(inventory.map((product) => [product.id, product]))
  const validatedItems = consolidatedItems.map((item) => ({
    item,
    product: findAvailableProduct(inventoryById, item),
  }))
  const orderItems = validatedItems.map(({ item, product }) => ({
    productId: product.id,
    name: product.name,
    quantity: item.quantity,
    unitPrice: product.price,
    lineTotal: product.price * item.quantity,
  }))
  const totals = calculateCheckoutTotals(
    orderItems.map((item) => ({ price: item.unitPrice, quantity: item.quantity })),
    request.paymentMethod,
    transferDiscount,
  )
  const purchasedQuantityByProduct = new Map(
    validatedItems.map(({ item }) => [item.productId, item.quantity]),
  )
  const nextInventory = inventory.map((product) => ({
    ...product,
    stockQuantity: product.stockQuantity - (purchasedQuantityByProduct.get(product.id) ?? 0),
  }))

  return {
    inventory: nextInventory,
    order: {
      orderNumber,
      status: request.paymentMethod === 'transfer' ? 'payment_pending' : 'pending',
      paymentMethod: request.paymentMethod,
      createdAt: new Date().toISOString(),
      customer: {
        ...request.customer,
        phoneNormalized: normalizePhone(request.customer.phone),
      },
      items: orderItems,
      totals,
    },
  }
}
