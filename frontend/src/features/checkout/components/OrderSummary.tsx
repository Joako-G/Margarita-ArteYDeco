import { LockKeyhole } from 'lucide-react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'

import productPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { useCartStore } from '@/features/cart'
import { Button, DeferredImage, Divider, Typography } from '@/shared/components'
import { formatPrice } from '@/shared/utils/format-price'

import type { CheckoutCartItemType, ICheckoutTotals, PaymentMethodType } from '../types/checkout'
import type { ICheckoutFormValues } from '../types/checkout'
import { CheckoutTermsAcceptance } from './CheckoutTermsAcceptance'

interface IOrderSummaryProps {
  errors: FieldErrors<ICheckoutFormValues>
  isSubmissionBlocked: boolean
  isSubmitting: boolean
  items: CheckoutCartItemType[]
  paymentMethod: PaymentMethodType
  register: UseFormRegister<ICheckoutFormValues>
  totals: ICheckoutTotals
}

export function OrderSummary({
  errors,
  isSubmissionBlocked,
  isSubmitting,
  items,
  paymentMethod,
  register,
  totals,
}: IOrderSummaryProps) {
  const openCart = useCartStore((state) => state.openCart)

  return (
    <aside aria-labelledby="summary-title" className="checkout-summary">
      <Typography as="h2" id="summary-title" variant="h3">
        Resumen del pedido
      </Typography>

      <ul aria-label="Productos a confirmar" className="checkout-summary__items">
        {items.map((item) => (
          <li className="checkout-summary__item" key={item.id}>
            <DeferredImage
              alt=""
              fallbackAlt=""
              fallbackSrc={productPlaceholderImage}
              height="80"
              src={item.image}
              width="80"
            />
            <div>
              <h3>{item.name}</h3>
              <p>
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
            <strong>{formatPrice(item.price * item.quantity)}</strong>
          </li>
        ))}
      </ul>

      <Divider />

      <dl className="checkout-summary__totals">
        <div>
          <dt>Subtotal</dt>
          <dd>{formatPrice(totals.subtotal)}</dd>
        </div>
        <div className={totals.discount > 0 ? 'checkout-summary__discount' : undefined}>
          <dt>
            Descuento
            {totals.discountPercentage > 0 ? ` (${totals.discountPercentage}%)` : ''}
          </dt>
          <dd>{totals.discount > 0 ? `− ${formatPrice(totals.discount)}` : formatPrice(0)}</dd>
        </div>
        <div className="checkout-summary__total">
          <dt>Total</dt>
          <dd>{formatPrice(totals.total)}</dd>
        </div>
      </dl>

      <p className="checkout-summary__payment-note">
        {paymentMethod === 'transfer'
          ? 'Aplicamos el descuento por transferencia antes de confirmar.'
          : 'El pago se realiza en efectivo al retirar.'}
      </p>

      <Button onClick={openCart} variant="ghost">
        Editar carrito
      </Button>
      <CheckoutTermsAcceptance errors={errors} register={register} />
      <Button
        className="checkout-summary__submit"
        disabled={isSubmissionBlocked}
        form="checkout-form"
        isLoading={isSubmitting}
        loadingText="Confirmando pedido…"
        size="large"
        type="submit"
      >
        {isSubmissionBlocked ? 'Verificá tu pedido antes de continuar' : 'Confirmar pedido'}
      </Button>
      <p className="checkout-summary__security">
        <LockKeyhole aria-hidden="true" size={16} strokeWidth={2} />
        Revisaremos nuevamente el stock antes de crear el pedido.
      </p>
    </aside>
  )
}
