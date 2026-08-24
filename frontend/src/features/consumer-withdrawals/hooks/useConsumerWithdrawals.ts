import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'

import { consumerWithdrawalsService } from '../services/consumer-withdrawals.service'

export function useCreateConsumerWithdrawal() {
  const idempotencyKey = useRef(crypto.randomUUID())
  return useMutation({
    mutationFn: (payload: Parameters<typeof consumerWithdrawalsService.create>[0]) =>
      consumerWithdrawalsService.create(payload, idempotencyKey.current),
    onSuccess: () => { idempotencyKey.current = crypto.randomUUID() },
    retry: false,
  })
}

export function useConsumerWithdrawalStatus() {
  return useMutation({ mutationFn: consumerWithdrawalsService.getStatus, retry: false })
}
