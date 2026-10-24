import { create } from 'zustand'

import type { ICheckoutFormValues } from '../types/checkout'

const EMPTY_CHECKOUT_DRAFT: ICheckoutFormValues = {
  acceptTerms: false,
  deliveryMethod: 'pickup',
  firstName: '',
  lastName: '',
  notes: '',
  paymentMethod: 'cash',
  phone: '',
  shippingAddress: '',
}

export function normalizeCheckoutDraft(value: unknown): ICheckoutFormValues {
  if (typeof value !== 'object' || value === null) return { ...EMPTY_CHECKOUT_DRAFT }

  const draft = value as Partial<ICheckoutFormValues>

  return {
    acceptTerms: draft.acceptTerms ?? EMPTY_CHECKOUT_DRAFT.acceptTerms,
    deliveryMethod: draft.deliveryMethod ?? EMPTY_CHECKOUT_DRAFT.deliveryMethod,
    firstName: draft.firstName ?? EMPTY_CHECKOUT_DRAFT.firstName,
    lastName: draft.lastName ?? EMPTY_CHECKOUT_DRAFT.lastName,
    notes: draft.notes ?? EMPTY_CHECKOUT_DRAFT.notes,
    paymentMethod: draft.paymentMethod ?? EMPTY_CHECKOUT_DRAFT.paymentMethod,
    phone: draft.phone ?? EMPTY_CHECKOUT_DRAFT.phone,
    shippingAddress: draft.shippingAddress ?? EMPTY_CHECKOUT_DRAFT.shippingAddress,
  }
}

interface ICheckoutDraftStore {
  clearDraft: () => void
  draft: ICheckoutFormValues
  setDraft: (draft: ICheckoutFormValues) => void
}

export const useCheckoutDraftStore = create<ICheckoutDraftStore>((set) => ({
  clearDraft: () => set({ draft: { ...EMPTY_CHECKOUT_DRAFT } }),
  draft: { ...EMPTY_CHECKOUT_DRAFT },
  setDraft: (draft) => set({ draft: normalizeCheckoutDraft(draft) }),
}))
