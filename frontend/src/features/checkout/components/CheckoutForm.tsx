import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { Banknote, Clock3, MapPin, WalletCards } from 'lucide-react'

import { Input, Radio, TextArea, Typography } from '@/shared/components'
import type { ISettings } from '@/shared/types/commerce'

import type { ICheckoutFormValues } from '../types/checkout'

interface ICheckoutFormProps {
  errors: FieldErrors<ICheckoutFormValues>
  register: UseFormRegister<ICheckoutFormValues>
  settings: ISettings
}

export function CheckoutForm({ errors, register, settings }: ICheckoutFormProps) {
  return (
    <div className="checkout-form">
      <section aria-labelledby="contact-title" className="checkout-form__section">
        <div className="checkout-form__section-heading">
          <Typography as="h2" id="contact-title" variant="h3">
            Tus datos de contacto
          </Typography>
          <p>Los usaremos para identificar el pedido y avisarte cuando esté listo.</p>
        </div>

        <div className="checkout-form__contact-fields">
          <Input
            autoComplete="given-name"
            error={errors.firstName?.message}
            label="Nombre"
            {...register('firstName')}
          />
          <Input
            autoComplete="family-name"
            error={errors.lastName?.message}
            label="Apellido"
            {...register('lastName')}
          />
        </div>

        <Input
          autoComplete="tel"
          error={errors.phone?.message}
          helpText="Incluí el código de área. Por ejemplo: 11 2345 6789."
          inputMode="tel"
          label="Celular"
          {...register('phone')}
        />
        <TextArea
          error={errors.notes?.message}
          helpText="Opcional. Podés contarnos algún detalle que necesitemos considerar."
          label="Observaciones"
          maxLength={500}
          {...register('notes')}
        />
      </section>

      <section aria-labelledby="payment-title" className="checkout-form__section">
        <div className="checkout-form__section-heading">
          <Typography as="h2" id="payment-title" variant="h3">
            ¿Cómo preferís pagar?
          </Typography>
          <p>Elegí una opción. No te cobraremos nada desde esta página.</p>
        </div>

        <fieldset className="checkout-form__payment-fieldset">
          <legend className="checkout-form__legend">Método de pago</legend>
          <div className="checkout-form__payment-options">
            <div className="checkout-form__payment-option">
              <Radio label="Efectivo" value="cash" {...register('paymentMethod')} />
              <Banknote aria-hidden="true" size={24} strokeWidth={2} />
              <p>Pagás cuando retirás el pedido en el local.</p>
            </div>
            <div className="checkout-form__payment-option">
              <Radio label="Transferencia" value="transfer" {...register('paymentMethod')} />
              <WalletCards aria-hidden="true" size={24} strokeWidth={2} />
              <p>Obtenés un {settings.transferDiscount}% de descuento.</p>
            </div>
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="pickup-title" className="checkout-form__pickup">
        <div className="checkout-form__pickup-heading">
          <MapPin aria-hidden="true" size={24} strokeWidth={2} />
          <Typography as="h2" id="pickup-title" variant="h3">
            Retiro en el local
          </Typography>
        </div>
        <p>Todos los pedidos se retiran personalmente. No realizamos envíos.</p>
        <dl>
          <div>
            <dt>
              <MapPin aria-hidden="true" size={18} strokeWidth={2} />
              Dirección
            </dt>
            <dd>{settings.address}</dd>
          </div>
          <div>
            <dt>
              <Clock3 aria-hidden="true" size={18} strokeWidth={2} />
              Horarios
            </dt>
            <dd>{settings.businessHours}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
