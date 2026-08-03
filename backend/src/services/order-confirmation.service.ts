import type { IOrderRepository } from '../repositories/orders.repository.js'
import type { IPublicOrderConfirmationDto } from '../types/orders.js'

export interface IOrderConfirmationService {
  get(orderId: string, sessionId: string): Promise<IPublicOrderConfirmationDto | null>
}

export class OrderConfirmationService implements IOrderConfirmationService {
  public constructor(private readonly repository: IOrderRepository) {}

  public async get(
    orderId: string,
    sessionId: string,
  ): Promise<IPublicOrderConfirmationDto | null> {
    const [order, settings] = await Promise.all([
      this.repository.findConfirmation(orderId, sessionId),
      this.repository.findOrderSettings(),
    ])

    if (order === null || settings === null) {
      return null
    }

    return {
      bankDetails: order.paymentMethod === 'bank_transfer'
        ? {
            alias: settings.transferAlias,
            bankName: settings.bankName,
            cbu: settings.transferCbu,
          }
        : null,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        lineTotal: item.subtotal,
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod === 'bank_transfer' ? 'transfer' : 'cash',
      pickup: {
        address: settings.address,
        businessHours: settings.businessHours,
        mapsUrl: settings.mapsUrl,
      },
      status: order.status,
      totals: {
        discount: order.discount,
        discountPercentage: order.paymentMethod === 'bank_transfer'
          ? settings.transferDiscount
          : 0,
        subtotal: order.subtotal,
        total: order.total,
      },
      whatsappProofUrl: this.createWhatsappProofUrl(
        settings.whatsapp,
        `${order.customerFirstName} ${order.customerLastName}`,
        order.orderNumber,
      ),
    }
  }

  private createWhatsappProofUrl(
    whatsapp: string,
    customerName: string,
    orderNumber: string,
  ): string {
    const message = `Hola, soy ${customerName}. Envío el comprobante del pedido ${orderNumber}.`
    return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`
  }
}
