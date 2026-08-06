import type { MouseEvent } from 'react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { Checkbox } from '@/shared/components'

import type { ICheckoutFormValues } from '../types/checkout'

interface ICheckoutTermsAcceptanceProps {
  errors: FieldErrors<ICheckoutFormValues>
  register: UseFormRegister<ICheckoutFormValues>
}

export function CheckoutTermsAcceptance({ errors, register }: ICheckoutTermsAcceptanceProps) {
  const errorMessage = errors.acceptTerms?.message

  function stopLabelPropagation(event: MouseEvent<HTMLAnchorElement>) {
    event.stopPropagation()
  }

  return (
    <div className="checkout__terms">
      <Checkbox
        aria-describedby={errorMessage ? 'checkout-terms-error' : undefined}
        aria-invalid={Boolean(errorMessage)}
        form="checkout-form"
        label={
          <>
            He leído y acepto{' '}
            <Link onClick={stopLabelPropagation} to="/terminos-y-condiciones">
              los Términos y Condiciones
            </Link>{' '}
            y la{' '}
            <Link onClick={stopLabelPropagation} to="/politica-de-privacidad">
              Política de Privacidad
            </Link>
            .
          </>
        }
        {...register('acceptTerms')}
      />
      {errorMessage ? (
        <p className="checkout__terms-error" id="checkout-terms-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
