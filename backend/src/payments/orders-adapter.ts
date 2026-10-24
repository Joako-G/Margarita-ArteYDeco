import type { CreatePaymentOrder, OrderPaymentSnapshot } from './types.js'

export interface OrdersPaymentAdapter {
  toPaymentOrder(snapshot: OrderPaymentSnapshot, idempotencyKey: string): CreatePaymentOrder
}

export class DefaultOrdersPaymentAdapter implements OrdersPaymentAdapter {
  public toPaymentOrder(
    snapshot: OrderPaymentSnapshot,
    idempotencyKey: string,
  ): CreatePaymentOrder {
    return {
      amount: snapshot.amount,
      currency: 'ARS',
      externalReference: snapshot.orderNumber,
      idempotencyKey,
    }
  }
}
