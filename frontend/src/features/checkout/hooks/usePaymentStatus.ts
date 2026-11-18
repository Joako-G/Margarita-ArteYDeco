import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { paymentStatusService } from '../services/payment-status.service'
import {
  getPaymentStatusPollingInterval,
  PAYMENT_STATUS_AUTO_POLL_WINDOW,
  shouldContinuePaymentStatusPolling,
} from '../utils/payment-status'

export const PAYMENT_STATUS_QUERY_KEY = ['payment-status'] as const

export function usePaymentStatus(orderNumber: string, enabled: boolean, reconcileApprovedReturn = false) {
  const { refetch, ...query } = useQuery({
    enabled: false,
    queryFn: () => paymentStatusService.fetchPaymentStatus(orderNumber),
    queryKey: [...PAYMENT_STATUS_QUERY_KEY, orderNumber],
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 0,
  })
  const pollCountRef = useRef(0)
  const startedAtRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const runIdRef = useRef(0)
  const pollRef = useRef<(runId: number) => Promise<unknown>>(async () => undefined)
  const [isAutoPollingTimedOut, setIsAutoPollingTimedOut] = useState(false)
  const [isAuthoritativeStatusReady, setIsAuthoritativeStatusReady] = useState(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const poll = useCallback(
    async (runId: number) => {
      const result = await refetch()
      setIsAuthoritativeStatusReady(Boolean(result.data && !result.isError))

       const shouldContinue = shouldContinuePaymentStatusPolling(result.data?.status, reconcileApprovedReturn)
       if (runId !== runIdRef.current || !shouldContinue) return result

      const elapsed = Date.now() - (startedAtRef.current ?? Date.now())
      if (elapsed >= PAYMENT_STATUS_AUTO_POLL_WINDOW) {
        setIsAutoPollingTimedOut(true)
        return result
      }

      const nextInterval = getPaymentStatusPollingInterval(pollCountRef.current)
      pollCountRef.current += 1
      timerRef.current = window.setTimeout(() => {
        void pollRef.current(runId)
      }, nextInterval)

      return result
    },
    [reconcileApprovedReturn, refetch],
  )
  const refreshPaymentStatus = useCallback(async () => {
    clearTimer()
    pollCountRef.current = 0
    startedAtRef.current = Date.now()
    setIsAutoPollingTimedOut(false)
    setIsAuthoritativeStatusReady(false)
    runIdRef.current += 1
    return poll(runIdRef.current)
  }, [clearTimer, poll])

  useEffect(() => {
    if (!enabled || !orderNumber) return

    pollRef.current = poll
    const initialTimer = window.setTimeout(() => {
      void refreshPaymentStatus()
    }, 0)

    return () => {
      runIdRef.current += 1
      window.clearTimeout(initialTimer)
      clearTimer()
    }
  }, [clearTimer, enabled, orderNumber, poll, refreshPaymentStatus])

  return {
    ...query,
    isAutoPollingTimedOut,
    isAuthoritativeStatusReady,
    refreshPaymentStatus,
  }
}
