import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { ImagePlus, Trash2 } from 'lucide-react'

import fallbackLogo from '@/assets/images/logo-header-optimized.webp'
import { Button, Input, Modal } from '@/shared/components'

import {
  adminSettingsLogoSchema,
  type AdminSettingsLogoFormType,
} from '../schemas/admin-settings-form.schema'
import type { IAdminSettings } from '../types/admin-settings'

interface IAdminSettingsLogoFormProps {
  isBlocked: boolean
  isRemoving: boolean
  isReplacing: boolean
  onRemove: () => Promise<boolean>
  onReplace: (file: File) => Promise<boolean>
  settings: IAdminSettings
}

export function AdminSettingsLogoForm({
  isBlocked,
  isRemoving,
  isReplacing,
  onRemove,
  onReplace,
  settings,
}: IAdminSettingsLogoFormProps) {
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const { control, formState: { errors }, handleSubmit, reset } = useForm<AdminSettingsLogoFormType>({
    resolver: zodResolver(adminSettingsLogoSchema),
  })
  const selectedLogo = useWatch({ control, name: 'logo' })
  const previewUrl = useMemo(
    () => selectedLogo ? URL.createObjectURL(selectedLogo) : null,
    [selectedLogo],
  )

  useEffect(() => () => {
    if (previewUrl !== null) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function handleReplace(values: AdminSettingsLogoFormType) {
    if (await onReplace(values.logo)) reset()
  }

  async function handleRemove() {
    if (await onRemove()) setIsRemoveOpen(false)
  }

  const imageUrl = previewUrl ?? settings.logoUrl ?? fallbackLogo
  const isUsingFallback = settings.logoUrl === null && previewUrl === null

  return (
    <section aria-labelledby="settings-logo-title" className="admin-settings__panel admin-settings-logo">
      <div className="admin-settings__section-heading">
        <div>
          <p>Marca</p>
          <h2 id="settings-logo-title">Logo público</h2>
        </div>
        <span>Si no cargás uno, la tienda seguirá mostrando el logo oficial.</span>
      </div>

      <div className="admin-settings-logo__preview">
        <img alt="Vista previa del logo de Margaritas Arte & Deco" src={imageUrl} />
        <span>{isUsingFallback ? 'Logo oficial de respaldo' : previewUrl ? 'Vista previa sin guardar' : 'Logo configurado'}</span>
      </div>

      <form className="admin-settings-logo__form" noValidate onSubmit={handleSubmit(handleReplace)}>
        <Controller
          control={control}
          name="logo"
          render={({ field: { name, onBlur, onChange } }) => (
            <Input
              accept="image/jpeg,image/png,image/webp"
              disabled={isBlocked}
              error={errors.logo?.message}
              helpText="JPG, PNG o WebP de hasta 5 MB. Conservaremos sus proporciones."
              label={settings.logoUrl ? 'Reemplazar logo' : 'Cargar logo'}
              name={name}
              onBlur={onBlur}
              onChange={(event) => onChange(event.target.files?.[0])}
              type="file"
            />
          )}
        />
        <div className="admin-settings-logo__actions">
          <Button disabled={!selectedLogo || isBlocked || isRemoving} isLoading={isReplacing} loadingText="Guardando logo…" type="submit">
            <ImagePlus aria-hidden="true" size={18} />
            Actualizar logo
          </Button>
          {settings.logoUrl ? (
            <Button disabled={isBlocked || isReplacing || isRemoving} onClick={() => setIsRemoveOpen(true)} type="button" variant="ghost">
              <Trash2 aria-hidden="true" size={18} />
              Usar logo de respaldo
            </Button>
          ) : null}
        </div>
      </form>

      <Modal
        footer={(
          <div className="admin-settings-logo__modal-actions">
            <Button disabled={isRemoving} onClick={() => setIsRemoveOpen(false)} variant="secondary">Cancelar</Button>
            <Button isLoading={isRemoving} loadingText="Quitando logo…" onClick={() => void handleRemove()}>
              Confirmar cambio
            </Button>
          </div>
        )}
        isOpen={isRemoveOpen}
        onClose={() => { if (!isRemoving) setIsRemoveOpen(false) }}
        title="Usar el logo oficial de respaldo"
      >
        <p>El logo actual dejará de mostrarse en la tienda. El encabezado y el pie de página volverán a usar automáticamente el logo oficial.</p>
      </Modal>
    </section>
  )
}
