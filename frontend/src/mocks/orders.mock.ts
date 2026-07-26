import type { IOrder } from '@/shared/types/commerce'

export const ordersMock: IOrder[] = [
  {
    id: 'order-001',
    customerId: 'customer-ana',
    orderNumber: 'MAD-0001',
    status: 'preparing',
    paymentMethod: 'cash',
    subtotal: 18900,
    discount: 0,
    total: 18900,
  },
  {
    id: 'order-002',
    customerId: 'customer-laura',
    orderNumber: 'MAD-0002',
    status: 'payment_pending',
    paymentMethod: 'transfer',
    subtotal: 27800,
    discount: 2780,
    total: 25020,
  },
]
