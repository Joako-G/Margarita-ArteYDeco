import type { IOrderRepository } from '../repositories/orders.repository.js'
import type { IPaymentCheckoutRepository, LatestPaymentAttempt, ResumablePaymentAttempt } from '../repositories/payment-checkout.repository.js'
import type { IPublicOrderConfirmationDto } from '../types/orders.js'
import type { IStorageUrlService } from '../types/storage.js'

function mapPaymentStatus(
  persistedStatus: 'paid' | 'pending' | 'rejected',
  latestAttempt: LatestPaymentAttempt | null,
): IPublicOrderConfirmationDto['paymentStatus'] {
  if (latestAttempt === null) return persistedStatus

  if (latestAttempt.status === 'approved') return 'approved'
  if (latestAttempt.status === 'in_process') return 'in_process'
  if (latestAttempt.status === 'cancelled') return 'expired'

  return latestAttempt.status
}

export interface IOrderConfirmationService {
  get(orderId: string, sessionId: string): Promise<IPublicOrderConfirmationDto | null>
}

export class OrderConfirmationService implements IOrderConfirmationService {
  public constructor(
    private readonly repository: IOrderRepository,
    private readonly paymentRepository?: IPaymentCheckoutRepository,
    private readonly storageService?: IStorageUrlService,
  ) {}

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

    const imageUrls = this.storageService === undefined
      ? new Map<string, string | null>()
      : await this.storageService.resolveSignedUrls(
        'products',
        order.items.flatMap((item) => item.imagePath === undefined || item.imagePath === null ? [] : [item.imagePath]),
      )

    const [latestAttempt, resumableAttempt] = order.paymentMethod === 'mercado_pago' && this.paymentRepository?.findLatestAttempt !== undefined
      ? await Promise.all([
        this.paymentRepository.findLatestAttempt(orderId),
        this.paymentRepository.findResumableAttempt?.(orderId, new Date()) ?? Promise.resolve(null),
      ])
      : [null, null] as [LatestPaymentAttempt | null, ResumablePaymentAttempt | null]

    return {
      bankDetails: order.paymentMethod === 'bank_transfer'
        ? {
            alias: settings.transferAlias,
            bankName: settings.bankName,
            cbu: settings.transferCbu,
          }
        : null,
      createdAt: order.createdAt,
      delivery: {
        method: order.deliveryMethod,
        shippingAddress: order.shippingAddress,
      },
      items: order.items.map((item) => ({
        imageUrl: item.imagePath === undefined || item.imagePath === null
          ? null
          : imageUrls.get(item.imagePath) ?? null,
        listUnitPrice: item.listUnitPrice,
        lineTotal: item.subtotal,
        name: item.productName,
        productDiscountPercentage: item.productDiscountPercentage,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod === 'bank_transfer'
        ? 'transfer'
        : order.paymentMethod === 'mercado_pago'
          ? 'mercado_pago'
          : 'cash',
      pickup: {
        address: settings.address,
        businessHours: settings.businessHours,
        mapsUrl: settings.mapsUrl,
      },
      paymentStatus: mapPaymentStatus(order.paymentStatus, latestAttempt),
      reservationExpiresAt: latestAttempt?.reservationExpiresAt.toISOString() ?? null,
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
      canResumePayment: order.paymentMethod === 'mercado_pago'
        && order.status !== 'cancelled'
        && (latestAttempt?.status === 'pending' || latestAttempt?.status === 'rejected')
        && resumableAttempt !== null,
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
