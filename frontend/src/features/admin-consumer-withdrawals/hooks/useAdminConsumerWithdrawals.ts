import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminConsumerWithdrawalsService } from '../services/admin-consumer-withdrawals.service'
import type { IAdminConsumerWithdrawalActionPayload, IAdminConsumerWithdrawalFilters } from '../types/admin-consumer-withdrawals'
import type { IAdminConsumerWithdrawalContingencyPayload } from '../types/admin-consumer-withdrawals'

export const ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY = ['admin', 'consumer-withdrawals'] as const

function shouldRetry(failureCount: number, error: Error) {
  const status = getApiErrorStatus(error)
  return failureCount < 1 && status !== 400 && status !== 401 && status !== 403 && status !== 404 && status !== 429
}

export function useAdminConsumerWithdrawals(filters: IAdminConsumerWithdrawalFilters) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () => adminConsumerWithdrawalsService.getList(filters),
    queryKey: [...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'list', filters],
    retry: shouldRetry,
    staleTime: 15_000,
  })
}

export function useAdminConsumerWithdrawal(requestId: string | undefined) {
  return useQuery({
    enabled: Boolean(requestId),
    queryFn: () => adminConsumerWithdrawalsService.getDetail(requestId ?? ''),
    queryKey: [...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'detail', requestId],
    retry: shouldRetry,
    staleTime: 15_000,
  })
}

export function useAdminConsumerWithdrawalAction(requestId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: IAdminConsumerWithdrawalActionPayload) => adminConsumerWithdrawalsService.executeAction(requestId, payload),
    onSuccess: (detail) => {
      queryClient.setQueryData([...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'detail', requestId], detail)
      void queryClient.invalidateQueries({ queryKey: [...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'list'] })
    },
  })
}

export function useAdminConsumerWithdrawalCandidates(requestId: string, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => adminConsumerWithdrawalsService.getCandidates(requestId), queryKey: [...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'candidates', requestId], retry: shouldRetry })
}

export function useAdminConsumerWithdrawalLink(requestId: string) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (payload: { expectedVersion: number; note: string; orderId: string }) => adminConsumerWithdrawalsService.linkOrder(requestId, payload), onSuccess: (detail) => { queryClient.setQueryData([...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'detail', requestId], detail); void queryClient.invalidateQueries({ queryKey: [...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'list'] }); void queryClient.removeQueries({ queryKey: [...ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY, 'candidates', requestId] }) } })
}

export function useCreateAdminConsumerWithdrawalContingency() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: (payload: IAdminConsumerWithdrawalContingencyPayload) => adminConsumerWithdrawalsService.createContingency(payload), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ADMIN_CONSUMER_WITHDRAWALS_QUERY_KEY }) } })
}
