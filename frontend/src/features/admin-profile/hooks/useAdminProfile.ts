import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'
import { ADMIN_SESSION_QUERY_KEY } from '@/features/admin-auth/hooks/useAdminAuth'
import type { IAdminSession } from '@/features/admin-auth/types/admin-auth'

import { adminProfileService } from '../services/admin-profile.service'
import type {
  IAdminProfileEmailInput,
  IAdminProfileNameInput,
  IAdminProfilePasswordInput,
} from '../types/admin-profile'

export const ADMIN_PROFILE_QUERY_KEY = ['admin', 'profile'] as const

export function useAdminProfile() {
  return useQuery({
    queryFn: adminProfileService.get,
    queryKey: ADMIN_PROFILE_QUERY_KEY,
    staleTime: 60_000,
  })
}

export function useUpdateAdminProfileName() {
  return useMutation({
    mutationFn: (input: IAdminProfileNameInput) => adminProfileService.updateFullName(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(ADMIN_PROFILE_QUERY_KEY, profile)
      queryClient.setQueryData<IAdminSession>(ADMIN_SESSION_QUERY_KEY, (session) => session
        ? { ...session, profile: { ...session.profile, fullName: profile.fullName } }
        : session)
    },
  })
}

export function useRequestAdminEmailChange() {
  return useMutation({
    mutationFn: (input: IAdminProfileEmailInput) => adminProfileService.requestEmailChange(input),
    onSuccess: (result) => {
      if (result.status === 'confirmed') {
        void queryClient.invalidateQueries({ queryKey: ['admin'] })
      }
    },
  })
}

export function useUpdateAdminPassword() {
  return useMutation({
    mutationFn: (input: IAdminProfilePasswordInput) => adminProfileService.updatePassword(input),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['admin'] })
    },
  })
}
