import type { IOrder } from '@/shared/types/commerce'

export const ordersMock: IOrder[] = [
  {
    id: 'order-001',
    customerId: 'customer-ana',
    deliveryMethod: 'pickup',
    orderNumber: 'MAD-0001',
    status: 'preparing',
    paymentMethod: 'cash',
    shippingAddress: null,
    subtotal: 18900,
    discount: 0,
    total: 18900,
  },
  {
    id: 'order-002',
    customerId: 'customer-laura',
    deliveryMethod: 'shipping',
    orderNumber: 'MAD-0002',
    status: 'pending',
    paymentMethod: 'transfer',
    shippingAddress: 'Belgrano 607, San Salvador de Jujuy',
    subtotal: 27800,
    discount: 2780,
    total: 25020,
  },
]
