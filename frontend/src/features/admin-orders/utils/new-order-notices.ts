import type { IAdminOrderListItem } from '../types/admin-orders'

export interface INewOrderNotice {
  createdAt: string
  id: string
  orderNumber: string
  paymentMethod: IAdminOrderListItem['paymentMethod']
  total: number
}

export const NEW_ORDER_NOTICE_LIMIT = 10

export function detectNewOrders(
  knownOrderIds: readonly string[],
  orders: readonly IAdminOrderListItem[],
): IAdminOrderListItem[] {
  const knownIds = new Set(knownOrderIds)

  return orders.filter((order) => !knownIds.has(order.id))
}

export function toNewOrderNotice(order: IAdminOrderListItem): INewOrderNotice {
  return {
    createdAt: order.createdAt,
    id: order.id,
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    total: order.total,
  }
}

export function mergeNewOrderNotices(
  currentNotices: readonly INewOrderNotice[],
  incomingNotices: readonly INewOrderNotice[],
): INewOrderNotice[] {
  const currentIds = new Set(currentNotices.map((notice) => notice.id))
  const addedNotices = incomingNotices.filter((notice) => !currentIds.has(notice.id))

  return [...addedNotices, ...currentNotices]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, NEW_ORDER_NOTICE_LIMIT)
}

export function removeNotice(
  notices: readonly INewOrderNotice[],
  noticeId: string,
): INewOrderNotice[] {
  return notices.filter((notice) => notice.id !== noticeId)
}
