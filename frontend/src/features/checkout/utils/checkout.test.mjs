import assert from 'node:assert/strict'
import test from 'node:test'

import { checkoutSchema } from '../schemas/checkout.schema.ts'
import { calculateCheckoutTotals } from './checkout-calculations.ts'
import { createWhatsAppProofUrl, normalizePhone } from './checkout-links.ts'
import { createOrderTransaction, OrderTransactionError } from './order-transaction.ts'

const INVENTORY = [
  {
    id: 'product-1',
    isActive: true,
    name: 'Molde de rosas',
    price: 12500,
    stockQuantity: 3,
  },
  {
    id: 'product-2',
    isActive: true,
    name: 'Pincel liner fino',
    price: 4200,
    stockQuantity: 1,
  },
]

const BASE_REQUEST = {
  customer: {
    firstName: 'Ana',
    lastName: 'Pérez',
    notes: '',
    phone: '+54 9 11 2345-6789',
  },
  items: [
    { productId: 'product-1', quantity: 2 },
    { productId: 'product-2', quantity: 1 },
  ],
  paymentMethod: 'cash',
}

test('valida y normaliza los datos obligatorios del checkout', () => {
  const result = checkoutSchema.safeParse({
    firstName: '  Ana ',
    lastName: ' Pérez ',
    notes: '  Preparar para regalo. ',
    paymentMethod: 'transfer',
    phone: '5491123456789',
  })

  assert.equal(result.success, true)

  if (result.success) {
    assert.equal(result.data.firstName, 'Ana')
    assert.equal(result.data.notes, 'Preparar para regalo.')
  }

  assert.equal(
    checkoutSchema.safeParse({
      firstName: '',
      lastName: '',
      notes: '',
      paymentMethod: 'cash',
      phone: '123',
    }).success,
    false,
  )

  assert.equal(
    checkoutSchema.safeParse({
      firstName: 'Ana',
      lastName: 'Pérez',
      notes: '',
      paymentMethod: 'cash',
      phone: '11abc23456789',
    }).success,
    false,
  )
})

test('calcula el descuento por transferencia desde la configuración', () => {
  assert.deepEqual(
    calculateCheckoutTotals(
      [
        { price: 12500, quantity: 2 },
        { price: 4200, quantity: 1 },
      ],
      'transfer',
      10,
    ),
    {
      subtotal: 29200,
      discount: 2920,
      discountPercentage: 10,
      total: 26280,
    },
  )
})

test('crea un pedido en efectivo con snapshots y descuenta el stock', () => {
  const result = createOrderTransaction({
    inventory: INVENTORY,
    orderNumber: 'MAD-0003',
    request: BASE_REQUEST,
    transferDiscount: 10,
  })

  assert.equal(result.order.status, 'pending')
  assert.equal(result.order.customer.phoneNormalized, '5491123456789')
  assert.equal(result.order.items[0].name, 'Molde de rosas')
  assert.equal(result.order.totals.total, 29200)
  assert.deepEqual(
    result.inventory.map((product) => product.stockQuantity),
    [1, 0],
  )
})

test('consolida productos repetidos antes de validar y calcular', () => {
  const result = createOrderTransaction({
    inventory: INVENTORY,
    orderNumber: 'MAD-0004',
    request: {
      ...BASE_REQUEST,
      items: [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-1', quantity: 2 },
      ],
      paymentMethod: 'transfer',
    },
    transferDiscount: 10,
  })

  assert.equal(result.order.items.length, 1)
  assert.equal(result.order.items[0].quantity, 3)
  assert.equal(result.order.status, 'payment_pending')
  assert.equal(result.order.totals.discount, 3750)
  assert.equal(result.inventory[0].stockQuantity, 0)
})

test('no modifica ningún stock cuando un producto no tiene unidades suficientes', () => {
  assert.throws(
    () =>
      createOrderTransaction({
        inventory: INVENTORY,
        orderNumber: 'MAD-0005',
        request: {
          ...BASE_REQUEST,
          items: [
            { productId: 'product-1', quantity: 1 },
            { productId: 'product-2', quantity: 2 },
          ],
        },
        transferDiscount: 10,
      }),
    (error) => error instanceof OrderTransactionError && error.code === 'STOCK_CHANGED',
  )

  assert.deepEqual(
    INVENTORY.map((product) => product.stockQuantity),
    [3, 1],
  )
})

test('genera el enlace de WhatsApp con teléfono y mensaje normalizados', () => {
  assert.equal(normalizePhone('+54 9 11 2345-6789'), '5491123456789')
  assert.equal(
    createWhatsAppProofUrl('54 9 11 0000-0000', 'Ana Pérez', 'MAD-0003'),
    'https://wa.me/5491100000000?text=Hola%2C%20soy%20Ana%20P%C3%A9rez.%20Quiero%20enviar%20el%20comprobante%20de%20transferencia%20del%20pedido%20MAD-0003.',
  )
})
