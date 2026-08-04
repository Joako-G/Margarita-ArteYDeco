import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Settings } from 'lucide-react'

import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  AdminSettingsForm,
  AdminSettingsLogoForm,
  getAdminSettingsErrorMessage,
  normalizeSettingsDigits,
  useAdminSettings,
  useAdminSettingsLogo,
  useUpdateAdminSettings,
} from '@/features/admin-settings'
import type { AdminSettingsFormType } from '@/features/admin-settings'
import { Button, Skeleton } from '@/shared/components'
import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-settings/admin-settings.css'

type FeedbackType = { message: string; type: 'error' | 'success' } | null

function AdminSettingsSkeleton() {
  return (
    <main aria-label="Cargando configuración" className="admin-page admin-settings" role="status">
      <Skeleton className="admin-settings__skeleton-title" />
      <Skeleton className="admin-settings__skeleton-logo" />
      <Skeleton className="admin-settings__skeleton-panel" />
      <Skeleton className="admin-settings__skeleton-panel" />
    </main>
  )
}

export function AdminSettingsPage() {
  const settings = useAdminSettings()
  const updateSettings = useUpdateAdminSettings()
  const logoMutation = useAdminSettingsLogo()
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  useRefreshAdminSessionOnUnauthorized(settings.error ?? updateSettings.error ?? logoMutation.error)

  useEffect(() => {
    document.title = 'Configuración | Margarita Arte & Deco'
    return () => { document.title = 'Margarita Arte & Deco' }
  }, [])

  async function handleUpdate(values: AdminSettingsFormType) {
    if (!settings.data) return
    setFeedback(null)
    try {
      await updateSettings.mutateAsync({
        address: values.address.trim(),
        bankName: values.bankName.trim(),
        businessHours: values.businessHours.trim(),
        businessName: values.businessName.trim(),
        expectedUpdatedAt: settings.data.updatedAt,
        facebook: values.facebook.trim() || null,
        instagram: values.instagram.trim() || null,
        lowStockThreshold: Number(values.lowStockThreshold),
        mapsUrl: values.mapsUrl.trim(),
        transferAlias: values.transferAlias.trim(),
        transferCbu: normalizeSettingsDigits(values.transferCbu),
        transferDiscount: Number(values.transferDiscount),
        whatsapp: normalizeSettingsDigits(values.whatsapp),
      })
      setFeedback({ message: 'Configuración actualizada. Los nuevos datos ya son la referencia del negocio.', type: 'success' })
    } catch (error) {
      setFeedback({ message: getAdminSettingsErrorMessage(getApiErrorCode(error)), type: 'error' })
    }
  }

  async function handleReplaceLogo(image: File) {
    if (!settings.data) return false
    setFeedback(null)
    try {
      await logoMutation.mutateAsync({
        action: 'replace',
        expectedUpdatedAt: settings.data.updatedAt,
        image,
      })
      setFeedback({ message: 'Logo actualizado en la tienda pública.', type: 'success' })
      return true
    } catch (error) {
      setFeedback({ message: getAdminSettingsErrorMessage(getApiErrorCode(error)), type: 'error' })
      return false
    }
  }

  async function handleRemoveLogo() {
    if (!settings.data) return false
    setFeedback(null)
    try {
      await logoMutation.mutateAsync({
        action: 'remove',
        expectedUpdatedAt: settings.data.updatedAt,
      })
      setFeedback({ message: 'La tienda volvió a utilizar el logo oficial de respaldo.', type: 'success' })
      return true
    } catch (error) {
      setFeedback({ message: getAdminSettingsErrorMessage(getApiErrorCode(error)), type: 'error' })
      return false
    }
  }

  if (settings.isPending) return <AdminSettingsSkeleton />
  if (settings.isError && getApiErrorStatus(settings.error) !== 401) {
    return (
      <main className="admin-page admin-settings">
        <div className="admin-settings__load-error" role="alert">
          <CircleAlert aria-hidden="true" size={32} />
          <h1>No pudimos cargar la configuración</h1>
          <p>Los datos actuales siguen vigentes. Intentá nuevamente.</p>
          <Button onClick={() => void settings.refetch()}>Reintentar</Button>
        </div>
      </main>
    )
  }

  return settings.data ? (
    <main aria-labelledby="admin-settings-title" className="admin-page admin-settings">
      <AdminPageHeader
        currentLabel="Configuración"
        description="Administrá la información operativa que utiliza la tienda, el checkout y el trabajo diario del Panel."
        sectionLabel="Negocio"
        title="Configuración"
        titleId="admin-settings-title"
      />

      <div className="admin-settings__scope-note">
        <Settings aria-hidden="true" size={22} />
        <p>Los cambios afectan futuras compras y comunicaciones. Los pedidos anteriores conservan sus importes y snapshots históricos.</p>
      </div>

      {feedback ? (
        <div className={`admin-settings__feedback admin-settings__feedback--${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.type === 'success'
            ? <CircleCheck aria-hidden="true" size={22} />
            : <CircleAlert aria-hidden="true" size={22} />}
          <p>{feedback.message}</p>
        </div>
      ) : null}

      <AdminSettingsLogoForm
        isBlocked={updateSettings.isPending}
        isRemoving={logoMutation.isPending && logoMutation.variables.action === 'remove'}
        isReplacing={logoMutation.isPending && logoMutation.variables.action === 'replace'}
        key={`logo-${settings.data.updatedAt}`}
        onRemove={handleRemoveLogo}
        onReplace={handleReplaceLogo}
        settings={settings.data}
      />

      <AdminSettingsForm
        isBlocked={logoMutation.isPending}
        isSubmitting={updateSettings.isPending}
        key={`form-${settings.data.updatedAt}`}
        onSubmit={handleUpdate}
        settings={settings.data}
      />
    </main>
  ) : null
}
