import type { Logger } from 'pino'

import {
  CustomerPhoneConflictError,
  type IAdminCustomerRepository,
} from '../repositories/admin-customers.repository.js'
import { normalizePhone } from '../schemas/orders.schema.js'
import type {
  IAdminCustomerDetailDto,
  IAdminCustomerDto,
  IAdminCustomerFilters,
  IAdminCustomerListDto,
  IAdminCustomerOrderFilters,
  IAdminCustomerRecord,
  IAdminCustomerUpdateRequest,
  IAdminPaginationDto,
} from '../types/admin-customers.js'
import { AppError } from '../utils/app-error.js'

export interface IAdminCustomerService {
  getById(customerId: string, filters: IAdminCustomerOrderFilters): Promise<IAdminCustomerDetailDto>
  list(filters: IAdminCustomerFilters): Promise<IAdminCustomerListDto>
  softDelete(customerId: string, expectedUpdatedAt: string, actorProfileId: string): Promise<void>
  update(
    customerId: string,
    input: IAdminCustomerUpdateRequest,
    actorProfileId: string,
  ): Promise<IAdminCustomerDetailDto>
}

export class AdminCustomerService implements IAdminCustomerService {
  public constructor(
    private readonly repository: IAdminCustomerRepository,
    private readonly logger: Logger,
  ) {}

  public async list(filters: IAdminCustomerFilters): Promise<IAdminCustomerListDto> {
    const page = await this.repository.findPage(filters)
    return {
      items: page.items.map((customer) => this.mapCustomer(customer)),
      pagination: this.createPagination(filters.page, filters.pageSize, page.totalItems),
    }
  }

  public async getById(
    customerId: string,
    filters: IAdminCustomerOrderFilters,
  ): Promise<IAdminCustomerDetailDto> {
    const customer = await this.requireCustomer(customerId)
    const orders = await this.repository.findOrders(customerId, filters.page, filters.pageSize)
    return {
      ...this.mapCustomer(customer),
      orders: {
        items: orders.items,
        pagination: this.createPagination(filters.page, filters.pageSize, orders.totalItems),
      },
    }
  }

  public async update(
    customerId: string,
    input: IAdminCustomerUpdateRequest,
    actorProfileId: string,
  ): Promise<IAdminCustomerDetailDto> {
    const current = await this.requireCustomer(customerId)
    if (current.updatedAt !== input.expectedUpdatedAt) throw this.concurrentUpdateError()

    const phoneNormalized = normalizePhone(input.phone)
    if (!/^[1-9][0-9]{7,14}$/.test(phoneNormalized)) {
      throw new AppError(400, 'Ingresá un celular válido con código de área', 'CUSTOMER_PHONE_INVALID')
    }

    try {
      const updated = await this.repository.update(customerId, {
        ...input,
        notes: input.notes === null || input.notes === '' ? null : input.notes,
        phoneNormalized,
      })
      if (updated === null) throw this.concurrentUpdateError()
      this.audit('customer_updated', customerId, actorProfileId, { orderCount: updated.orderCount })
      return this.getById(customerId, { page: 1, pageSize: 10 })
    } catch (error) {
      if (error instanceof CustomerPhoneConflictError) {
        throw new AppError(409, 'Ya existe otro cliente con ese celular', 'CUSTOMER_PHONE_CONFLICT')
      }
      throw error
    }
  }

  public async softDelete(
    customerId: string,
    expectedUpdatedAt: string,
    actorProfileId: string,
  ): Promise<void> {
    const current = await this.requireCustomer(customerId)
    if (current.updatedAt !== expectedUpdatedAt) throw this.concurrentUpdateError()
    const wasDeleted = await this.repository.softDelete(customerId, expectedUpdatedAt)
    if (!wasDeleted) throw this.concurrentUpdateError()
    this.audit('customer_soft_deleted', customerId, actorProfileId, {
      orderCount: current.orderCount,
      orderHistoryPreserved: true,
    })
  }

  private mapCustomer(customer: IAdminCustomerRecord): IAdminCustomerDto {
    return {
      createdAt: customer.createdAt,
      firstName: customer.firstName,
      id: customer.id,
      lastName: customer.lastName,
      notes: customer.notes ?? '',
      orderCount: customer.orderCount,
      phone: customer.phone,
      updatedAt: customer.updatedAt,
    }
  }

  private createPagination(page: number, pageSize: number, totalItems: number): IAdminPaginationDto {
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize)
    return {
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && totalPages > 0,
      page,
      pageSize,
      totalItems,
      totalPages,
    }
  }

  private async requireCustomer(customerId: string): Promise<IAdminCustomerRecord> {
    const customer = await this.repository.findById(customerId)
    if (customer === null) throw new AppError(404, 'Cliente no encontrado', 'ADMIN_CUSTOMER_NOT_FOUND')
    return customer
  }

  private concurrentUpdateError(): AppError {
    return new AppError(
      409,
      'El cliente cambió mientras lo editabas. Recargá la página e intentá nuevamente',
      'CUSTOMER_UPDATE_CONFLICT',
    )
  }

  private audit(
    action: string,
    entityId: string,
    actorProfileId: string,
    metadata: Readonly<Record<string, boolean | number>>,
  ): void {
    this.logger.info(
      { action, actorProfileId, entityId, entityType: 'customer', metadata },
      'Auditoría administrativa',
    )
  }
}
