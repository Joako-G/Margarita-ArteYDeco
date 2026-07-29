import { ordersMock, productsMock, settingsMock } from '@/mocks'

import type {
  ICreateOrderRequest,
  IOrderConfirmation,
  IOrderInventoryProduct,
} from '../types/checkout'
import { createOrderTransaction } from '../utils/order-transaction'

const MOCK_REQUEST_DELAY = 450

let orderSequence = ordersMock.length + 1
let inventory: IOrderInventoryProduct[] = productsMock.map((product) => ({
  id: product.id,
  isActive: product.isActive,
  name: product.name,
  price: product.price,
  stockQuantity: product.stockQuantity,
}))

function createOrderNumber(): string {
  return `MAD-${String(orderSequence).padStart(4, '0')}`
}

function waitForMockRequest(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_REQUEST_DELAY)
  })
}

async function createOrder(request: ICreateOrderRequest): Promise<IOrderConfirmation> {
  await waitForMockRequest()

  const result = createOrderTransaction({
    inventory,
    orderNumber: createOrderNumber(),
    request,
    transferDiscount: settingsMock.transferDiscount,
  })

  inventory = result.inventory
  orderSequence += 1

  result.inventory.forEach((inventoryProduct) => {
    const product = productsMock.find((item) => item.id === inventoryProduct.id)

    if (product) product.stockQuantity = inventoryProduct.stockQuantity
  })

  return result.order
}

export const checkoutService = {
  createOrder,
}
