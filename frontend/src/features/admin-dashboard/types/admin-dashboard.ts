import type { OrderStatusType } from '@/shared/utils/order-status'

export interface IAdminDashboard {
  lowStockProducts: readonly {
    id: string
    name: string
    stockQuantity: number
  }[]
  metrics: {
    activeProducts: number
    categories: number
    completedOrders: number
    customers: number
    lowStockProducts: number
    openOrders: number
    outOfStockProducts: number
  }
  recentOrders: readonly {
    createdAt: string
    customerName: string
    orderNumber: string
    paymentMethod: 'bank_transfer' | 'cash'
    status: OrderStatusType
    total: number
  }[]
}
