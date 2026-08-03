import type { IAdminDashboardRepository } from '../repositories/admin-dashboard.repository.js'
import type { IAdminDashboardDto } from '../types/admin-dashboard.js'

export interface IAdminDashboardService {
  getSummary(): Promise<IAdminDashboardDto>
}

export class AdminDashboardService implements IAdminDashboardService {
  public constructor(private readonly repository: IAdminDashboardRepository) {}

  public async getSummary(): Promise<IAdminDashboardDto> {
    const snapshot = await this.repository.getSnapshot()

    return {
      lowStockProducts: snapshot.lowStockProducts,
      metrics: snapshot.metrics,
      recentOrders: snapshot.recentOrders.map((order) => ({
        createdAt: order.createdAt,
        customerName: `${order.customerFirstName} ${order.customerLastName}`.trim(),
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        status: order.status,
        total: order.total,
      })),
    }
  }
}
