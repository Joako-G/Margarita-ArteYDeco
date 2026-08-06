import type { Logger } from 'pino'

import type { IAdminOrderRepository } from '../repositories/admin-orders.repository.js'
import type { ISettingsRepository } from '../repositories/settings.repository.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import type {
  AdminOrderActionType,
  AdminOrderStatusType,
  AdminPaymentStatusType,
  IAdminOrderActionRequest,
  IAdminOrderCancellationRequest,
  IAdminOrderDetailDto,
  IAdminOrderFilters,
  IAdminOrderListItemDto,
  IAdminOrderListDto,
  IAdminOrderRecord,
} from '../types/admin-orders.js'
import { AppError } from '../utils/app-error.js'

interface IOrderTransition {
  paymentStatus: AdminPaymentStatusType
  status: AdminOrderStatusType
}

export interface IAdminOrderCancellationResult {
  order: IAdminOrderDetailDto
  stockRestored: true
}

export interface IAdminOrderService {
  cancel(
    orderId: string,
    input: IAdminOrderCancellationRequest,
    actorProfileId: string,
  ): Promise<IAdminOrderCancellationResult>
  executeAction(
    orderId: string,
    input: IAdminOrderActionRequest,
    actorProfileId: string,
  ): Promise<IAdminOrderDetailDto>
  getById(orderId: string): Promise<IAdminOrderDetailDto>
  list(filters: IAdminOrderFilters): Promise<IAdminOrderListDto>
}

function getAvailableActions(order: IAdminOrderRecord): readonly AdminOrderActionType[] {
  if (order.paymentMethod === 'bank_transfer') {
    switch (order.status) {
      case 'payment_pending': return ['confirmPayment']
      case 'paid': return ['startPreparing']
      case 'preparing': return ['markReady']
      case 'ready': return ['markPickedUp']
      default: return []
    }
  }

  switch (order.status) {
    case 'pending': return ['startPreparing']
    case 'preparing': return ['markReady']
    case 'ready': return ['confirmPayment']
    case 'paid': return ['markPickedUp']
    default: return []
  }
}

function deriveTransition(
  order: IAdminOrderRecord,
  action: AdminOrderActionType,
): IOrderTransition | null {
  if (!getAvailableActions(order).includes(action)) return null

  switch (action) {
    case 'confirmPayment': return { paymentStatus: 'paid', status: 'paid' }
    case 'startPreparing':
      return { paymentStatus: order.paymentStatus, status: 'preparing' }
    case 'markReady': return { paymentStatus: order.paymentStatus, status: 'ready' }
    case 'markPickedUp': return { paymentStatus: 'paid', status: 'picked_up' }
  }
}

function mapListItem(order: IAdminOrderRecord): IAdminOrderListItemDto {
  return {
    createdAt: order.createdAt,
    customer: {
      firstName: order.customerFirstName,
      lastName: order.customerLastName,
      phone: order.customerPhone,
    },
    deliveryMethod: order.deliveryMethod,
    id: order.id,
    itemCount: order.itemCount,
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    status: order.status,
    total: order.total,
    updatedAt: order.updatedAt,
  }
}

export class AdminOrderService implements IAdminOrderService {
  public constructor(
    private readonly repository: IAdminOrderRepository,
    private readonly settingsRepository: ISettingsRepository,
    private readonly logger: Logger,
  ) {}

  public async list(filters: IAdminOrderFilters): Promise<IAdminOrderListDto> {
    const page = await this.repository.findPage(filters)
    const totalPages = Math.ceil(page.totalItems / filters.pageSize)
    return {
      items: page.items.map(mapListItem),
      pagination: {
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1,
        page: filters.page,
        pageSize: filters.pageSize,
        totalItems: page.totalItems,
        totalPages,
      },
    }
  }

  public async getById(orderId: string): Promise<IAdminOrderDetailDto> {
    const order = await this.requireOrder(orderId)
    const [items, settings] = await Promise.all([
      this.repository.findItems(orderId),
      this.settingsRepository.findPublic(),
    ])
    if (settings === null) {
      throw new AppError(503, 'La configuración del negocio no está disponible', 'SETTINGS_UNAVAILABLE')
    }

    return {
      ...mapListItem(order),
      availableActions: getAvailableActions(order),
      business: {
        address: settings.address,
        businessHours: settings.businessHours,
        businessName: settings.businessName,
        mapsUrl: settings.mapsUrl,
      },
      canCancel: !['cancelled', 'picked_up'].includes(order.status),
      discount: order.discount,
      items,
      notes: order.notes ?? '',
      pickedUpAt: order.pickedUpAt,
      requiresManualRefundOnCancel: order.paymentStatus === 'paid',
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      whatsappPhone: normalizePhone(settings.whatsapp),
    }
  }

  public async executeAction(
    orderId: string,
    input: IAdminOrderActionRequest,
    actorProfileId: string,
  ): Promise<IAdminOrderDetailDto> {
    const order = await this.requireOrder(orderId)
    this.validateVersion(order, input.expectedUpdatedAt)
    const transition = deriveTransition(order, input.action)
    if (transition === null) {
      throw new AppError(
        409,
        'La acción no está disponible para el estado actual del pedido',
        'ORDER_ACTION_NOT_ALLOWED',
      )
    }

    const transitioned = await this.repository.transition(
      orderId,
      transition.status,
      transition.paymentStatus,
      actorProfileId,
      input.expectedUpdatedAt,
    )
    if (!transitioned) throw this.notFoundError()
    this.audit('order_status_changed', orderId, actorProfileId, { action: input.action })
    return this.getById(orderId)
  }

  public async cancel(
    orderId: string,
    input: IAdminOrderCancellationRequest,
    actorProfileId: string,
  ): Promise<IAdminOrderCancellationResult> {
    const order = await this.requireOrder(orderId)
    this.validateVersion(order, input.expectedUpdatedAt)
    if (['cancelled', 'picked_up'].includes(order.status)) {
      throw new AppError(409, 'Este pedido ya no puede cancelarse', 'ORDER_CANCELLATION_NOT_ALLOWED')
    }
    if (order.paymentStatus === 'paid' && !input.confirmManualRefund) {
      throw new AppError(
        409,
        'Confirmá que el reintegro monetario se gestionará manualmente',
        'ORDER_MANUAL_REFUND_CONFIRMATION_REQUIRED',
      )
    }

    const cancelled = await this.repository.cancel(
      orderId,
      actorProfileId,
      input.reason,
      input.expectedUpdatedAt,
      input.confirmManualRefund,
    )
    if (!cancelled) {
      throw new AppError(409, 'El pedido ya fue cancelado', 'ORDER_ALREADY_CANCELLED')
    }
    this.audit('order_cancelled', orderId, actorProfileId, { wasPaid: order.paymentStatus === 'paid' })
    return { order: await this.getById(orderId), stockRestored: true }
  }

  private async requireOrder(orderId: string): Promise<IAdminOrderRecord> {
    const order = await this.repository.findById(orderId)
    if (order === null) throw this.notFoundError()
    return order
  }

  private validateVersion(order: IAdminOrderRecord, expectedUpdatedAt: string): void {
    if (order.updatedAt !== expectedUpdatedAt) {
      throw new AppError(
        409,
        'El pedido cambió mientras lo revisabas. Recargá el detalle',
        'ORDER_UPDATE_CONFLICT',
      )
    }
  }

  private notFoundError(): AppError {
    return new AppError(404, 'Pedido no encontrado', 'ADMIN_ORDER_NOT_FOUND')
  }

  private audit(
    action: string,
    entityId: string,
    actorProfileId: string,
    metadata: Readonly<Record<string, boolean | string>>,
  ): void {
    this.logger.info(
      { action, actorProfileId, entityId, entityType: 'order', metadata },
      'Auditoría administrativa',
    )
  }
}
