import { useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import { adminAuthService } from '../services/admin-auth.service'
import type { IAdminCredentials, IAdminSession } from '../types/admin-auth'

export const ADMIN_SESSION_QUERY_KEY = ['admin', 'session'] as const

export function useAdminSession() {
  return useQuery({
    queryFn: adminAuthService.getSession,
    queryKey: ADMIN_SESSION_QUERY_KEY,
    retry: false,
    staleTime: 60_000,
  })
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: (credentials: IAdminCredentials) => adminAuthService.login(credentials),
    onSuccess: (session: IAdminSession) => {
      queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, session)
    },
  })
}

export function useAdminLogout() {
  return useMutation({
    mutationFn: adminAuthService.logout,
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ADMIN_SESSION_QUERY_KEY })
    },
  })
}

export function useRefreshAdminSessionOnUnauthorized(error: unknown) {
  useEffect(() => {
    if (getApiErrorStatus(error) === 401) {
      void queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_QUERY_KEY })
    }
  }, [error])
}
