import { useAdminConsumerWithdrawals } from './useAdminConsumerWithdrawals'

const ATTENTION_FILTERS = {
  compliance: 'attention', linkage: 'all', page: 1, pageSize: 10, sort: 'urgent', status: 'all',
} as const

export function useConsumerWithdrawalAttentionCount() {
  const query = useAdminConsumerWithdrawals(ATTENTION_FILTERS)
  return { count: query.data?.pagination.totalItems ?? 0, isPending: query.isPending }
}
