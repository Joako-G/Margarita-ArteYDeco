import type { ICustomer } from '@/shared/types/commerce'

export const customersMock: ICustomer[] = [
  {
    id: 'customer-ana',
    firstName: 'Ana',
    lastName: 'Pérez',
    phone: '11 5555 0142',
    phoneNormalized: '1155550142',
    notes: 'Prefiere contacto por WhatsApp.',
  },
  {
    id: 'customer-laura',
    firstName: 'Laura',
    lastName: 'Gómez',
    phone: '11 5555 0187',
    phoneNormalized: '1155550187',
    notes: '',
  },
]
