import { create } from 'zustand'

import type { ICheckoutFormValues } from '../types/checkout'

const EMPTY_CHECKOUT_DRAFT: ICheckoutFormValues = {
  acceptTerms: false,
  firstName: '',
  lastName: '',
  notes: '',
  paymentMethod: 'cash',
  phone: '',
}

interface ICheckoutDraftStore {
  clearDraft: () => void
  draft: ICheckoutFormValues
  setDraft: (draft: ICheckoutFormValues) => void
}

export const useCheckoutDraftStore = create<ICheckoutDraftStore>((set) => ({
  clearDraft: () => set({ draft: EMPTY_CHECKOUT_DRAFT }),
  draft: EMPTY_CHECKOUT_DRAFT,
  setDraft: (draft) => set({ draft }),
}))
