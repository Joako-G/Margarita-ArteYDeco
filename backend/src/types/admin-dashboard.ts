import type { PaymentMethodType } from './orders.js'

export type AdminDashboardOrderStatusType =
  | 'cancelled'
  | 'confirmed'
  | 'delivered'
  | 'pending'
  | 'picked_up'
  | 'preparing'
  | 'ready'

export interface IAdminDashboardSnapshot {
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
    customerFirstName: string
    customerLastName: string
    orderNumber: string
    paymentMethod: PaymentMethodType
    status: AdminDashboardOrderStatusType
    total: number
  }[]
}

export interface IAdminDashboardDto {
  lowStockProducts: IAdminDashboardSnapshot['lowStockProducts']
  metrics: IAdminDashboardSnapshot['metrics']
  recentOrders: readonly {
    createdAt: string
    customerName: string
    orderNumber: string
    paymentMethod: PaymentMethodType
    status: AdminDashboardOrderStatusType
    total: number
  }[]
}
