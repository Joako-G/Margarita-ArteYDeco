import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { ExternalLink, Save } from 'lucide-react'

import { Button, Input, TextArea } from '@/shared/components'

import {
  adminSettingsFormSchema,
  type AdminSettingsFormType,
} from '../schemas/admin-settings-form.schema'
import type { IAdminSettings } from '../types/admin-settings'

interface IAdminSettingsFormProps {
  isBlocked: boolean
  isSubmitting: boolean
  onSubmit: (values: AdminSettingsFormType) => Promise<void>
  settings: IAdminSettings
}

function getDefaultValues(settings: IAdminSettings): AdminSettingsFormType {
  return {
    address: settings.address,
    bankName: settings.bankName,
    businessHours: settings.businessHours,
    businessName: settings.businessName,
    facebook: settings.facebook ?? '',
    instagram: settings.instagram ?? '',
    lowStockThreshold: String(settings.lowStockThreshold),
    mapsUrl: settings.mapsUrl,
    tiktok: settings.tiktok ?? '',
    transferAlias: settings.transferAlias,
    transferCbu: settings.transferCbu,
    transferDiscount: String(settings.transferDiscount),
    whatsapp: settings.whatsapp,
  }
}

export function AdminSettingsForm({
  isBlocked,
  isSubmitting,
  onSubmit,
  settings,
}: IAdminSettingsFormProps) {
  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<AdminSettingsFormType>({
    defaultValues: getDefaultValues(settings),
    resolver: zodResolver(adminSettingsFormSchema),
  })
  const mapsUrl = useWatch({ control, name: 'mapsUrl' })
  const safeMapsUrl = useMemo(() => {
    try {
      const url = new URL(mapsUrl)
      return url.protocol === 'https:' ? url.toString() : null
    } catch {
      return null
    }
  }, [mapsUrl])

  return (
    <form className="admin-settings-form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <section aria-labelledby="settings-business-title" className="admin-settings__panel">
        <div className="admin-settings__section-heading">
          <div>
            <p>Comercio</p>
            <h2 id="settings-business-title">Identidad y contacto</h2>
          </div>
          <span>Visible en la tienda y en las confirmaciones.</span>
        </div>
        <div className="admin-settings__fields admin-settings__fields--two-columns">
          <Input
            autoComplete="organization"
            error={errors.businessName?.message}
            label="Nombre del negocio"
            maxLength={120}
            placeholder="Ej.: Margaritas Arte & Deco"
            {...register('businessName')}
          />
          <Input
            autoComplete="tel"
            error={errors.whatsapp?.message}
            helpText="Incluí código de país y área. Se usa en los enlaces de WhatsApp."
            inputMode="tel"
            label="WhatsApp"
            maxLength={40}
            placeholder="Ej.: 54 9 11 2345-6789"
            {...register('whatsapp')}
          />
        </div>
      </section>

      <section aria-labelledby="settings-pickup-title" className="admin-settings__panel">
        <div className="admin-settings__section-heading">
          <div>
            <p>Retiro en el local</p>
            <h2 id="settings-pickup-title">Dirección, horarios y ubicación</h2>
          </div>
          <span>Estos datos se muestran antes y después de confirmar una compra.</span>
        </div>
        <div className="admin-settings__fields">
          <Input
            autoComplete="street-address"
            error={errors.address?.message}
            label="Dirección"
            maxLength={300}
            placeholder="Ej.: Av. San Martín 1234, Buenos Aires"
            {...register('address')}
          />
          <TextArea
            error={errors.businessHours?.message}
            helpText="Escribí los días y horarios tal como deben verlos los clientes."
            label="Horarios de atención"
            maxLength={1_000}
            placeholder="Ej.: Lunes a viernes de 9 a 18 h. Sábados de 9 a 13 h."
            rows={4}
            {...register('businessHours')}
          />
          <div className="admin-settings__maps-field">
            <Input
              error={errors.mapsUrl?.message}
              helpText="Pegá el enlace HTTPS para abrir la ubicación exacta."
              label="Enlace de Google Maps"
              maxLength={500}
              placeholder="Ej.: https://maps.app.goo.gl/..."
              type="url"
              {...register('mapsUrl')}
            />
            {safeMapsUrl ? (
              <a href={safeMapsUrl} rel="noreferrer" target="_blank">
                <ExternalLink aria-hidden="true" size={18} />
                Probar ubicación
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="settings-transfer-title" className="admin-settings__panel">
        <div className="admin-settings__section-heading">
          <div>
            <p>Transferencias</p>
            <h2 id="settings-transfer-title">Datos de cobro y descuento</h2>
          </div>
          <span>Se entregan únicamente al confirmar un pedido por transferencia.</span>
        </div>
        <div className="admin-settings__fields admin-settings__fields--two-columns">
          <Input
            autoComplete="off"
            error={errors.bankName?.message}
            label="Banco"
            maxLength={120}
            placeholder="Ej.: Banco Nación"
            {...register('bankName')}
          />
          <Input
            autoComplete="off"
            error={errors.transferAlias?.message}
            label="Alias"
            maxLength={120}
            placeholder="Ej.: MARGARITA.ARTE"
            {...register('transferAlias')}
          />
          <Input
            autoComplete="off"
            error={errors.transferCbu?.message}
            helpText="Debe contener 22 dígitos. Podés pegarlo con espacios."
            inputMode="numeric"
            label="CBU"
            maxLength={40}
            placeholder="Ej.: 0000000000000000000000"
            {...register('transferCbu')}
          />
          <Input
            error={errors.transferDiscount?.message}
            helpText="Este descuento se calcula automáticamente al crear un pedido por transferencia."
            inputMode="decimal"
            label="Descuento por transferencia (%)"
            max="100"
            min="0"
            step="0.01"
            type="number"
            placeholder="Ej.: 10"
            {...register('transferDiscount')}
          />
        </div>
      </section>

      <section aria-labelledby="settings-operation-title" className="admin-settings__panel">
        <div className="admin-settings__section-heading">
          <div>
            <p>Operación</p>
            <h2 id="settings-operation-title">Inventario y redes sociales</h2>
          </div>
          <span>Elegí desde cuántas unidades querés recibir el aviso de poco stock.</span>
        </div>
        <div className="admin-settings__fields admin-settings__fields--two-columns">
          <Input
            error={errors.lowStockThreshold?.message}
            helpText="Los productos con stock igual o menor se consideran bajos."
            inputMode="numeric"
            label="Avisar cuando queden"
            min="0"
            step="1"
            type="number"
            placeholder="Ej.: 5"
            {...register('lowStockThreshold')}
          />
          <div aria-hidden="true" className="admin-settings__field-spacer" />
          <Input
            error={errors.instagram?.message}
            helpText="Opcional. Debe comenzar con https://"
            label="Instagram"
            maxLength={500}
            placeholder="Ej.: https://instagram.com/margaritaartedeco"
            type="url"
            {...register('instagram')}
          />
          <Input
            error={errors.facebook?.message}
            helpText="Opcional. Debe comenzar con https://"
            label="Facebook"
            maxLength={500}
            placeholder="Ej.: https://facebook.com/margaritaartedeco"
            type="url"
            {...register('facebook')}
          />
          <Input
            error={errors.tiktok?.message}
            helpText="Opcional. Debe comenzar con https://"
            label="TikTok"
            maxLength={500}
            placeholder="Ej.: https://tiktok.com/@margaritaartedeco"
            type="url"
            {...register('tiktok')}
          />
        </div>
      </section>

      <div className="admin-settings-form__actions">
        <p>{isDirty ? 'Hay cambios sin guardar.' : 'La configuración está actualizada.'}</p>
        <div>
          <Button disabled={!isDirty || isBlocked || isSubmitting} onClick={() => reset()} type="button" variant="ghost">
            Descartar cambios
          </Button>
          <Button disabled={!isDirty || isBlocked} isLoading={isSubmitting} loadingText="Guardando…" type="submit">
            <Save aria-hidden="true" size={18} />
            Guardar configuración
          </Button>
        </div>
      </div>
    </form>
  )
}
