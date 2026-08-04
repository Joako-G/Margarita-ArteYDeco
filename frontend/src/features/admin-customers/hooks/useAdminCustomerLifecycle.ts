import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/app/query-client'

import { adminCustomersService } from '../services/admin-customers.service'
import type { IAdminCustomer, IAdminCustomerUpdatePayload } from '../types/admin-customers'
import { ADMIN_CUSTOMERS_QUERY_KEY } from './useAdminCustomers'

type AdminCustomerMutationType =
  | { action: 'delete'; customer: IAdminCustomer }
  | { action: 'update'; customerId: string; payload: IAdminCustomerUpdatePayload }

async function mutateCustomer(input: AdminCustomerMutationType) {
  if (input.action === 'update') {
    return adminCustomersService.updateCustomer(input.customerId, input.payload)
  }
  await adminCustomersService.softDeleteCustomer(input.customer.id, input.customer.updatedAt)
  return null
}

export function useAdminCustomerLifecycle() {
  return useMutation({
    mutationFn: mutateCustomer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_CUSTOMERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ])
    },
  })
}
