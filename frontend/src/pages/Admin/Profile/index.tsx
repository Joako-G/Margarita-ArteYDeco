import { useEffect } from 'react'
import { CircleAlert, ShieldCheck } from 'lucide-react'

import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import {
  AdminProfileEmailForm,
  AdminProfileNameForm,
  AdminProfilePasswordForm,
} from '@/features/admin-profile/components/AdminProfileForms'
import { useAdminProfile } from '@/features/admin-profile'
import { Button, Skeleton } from '@/shared/components'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-profile/admin-profile.css'

function AdminProfileSkeleton() {
  return (
    <main aria-label="Cargando perfil" className="admin-page admin-profile" role="status">
      <Skeleton className="admin-profile__skeleton-title" />
      <Skeleton className="admin-profile__skeleton-summary" />
      <Skeleton className="admin-profile__skeleton-panel" />
      <Skeleton className="admin-profile__skeleton-panel" />
    </main>
  )
}

export function AdminProfilePage() {
  const profile = useAdminProfile()
  useRefreshAdminSessionOnUnauthorized(profile.error)

  useEffect(() => {
    document.title = 'Mi perfil | Margaritas Arte & Deco'
    return () => { document.title = 'Margaritas Arte & Deco' }
  }, [])

  if (profile.isPending) return <AdminProfileSkeleton />

  if (profile.isError && getApiErrorStatus(profile.error) !== 401) {
    return (
      <main className="admin-page admin-profile">
        <div className="admin-profile__load-error" role="alert">
          <CircleAlert aria-hidden="true" size={32} />
          <h1>No pudimos cargar tu perfil</h1>
          <p>Tu sesión sigue protegida. Intentá nuevamente.</p>
          <Button onClick={() => void profile.refetch()}>Reintentar</Button>
        </div>
      </main>
    )
  }

  return profile.data ? (
    <main aria-labelledby="admin-profile-title" className="admin-page admin-profile">
      <AdminPageHeader
        currentLabel="Mi perfil"
        description="Actualizá tu nombre, el correo con el que ingresás y tu contraseña."
        sectionLabel="Cuenta"
        title="Mi perfil"
        titleId="admin-profile-title"
      />

      <section className="admin-profile__summary" aria-label="Resumen de la cuenta">
        <span aria-hidden="true" className="admin-profile__avatar">
          {profile.data.fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
        </span>
        <div>
          <strong>{profile.data.fullName}</strong>
          <span>{profile.data.email}</span>
        </div>
        <p><ShieldCheck aria-hidden="true" size={18} /> Administrador activo</p>
      </section>

      <div className="admin-profile__grid">
        <AdminProfileNameForm key={`name-${profile.data.updatedAt}`} profile={profile.data} />
        <AdminProfileEmailForm key={`email-${profile.data.email}`} profile={profile.data} />
        <AdminProfilePasswordForm />
      </div>
    </main>
  ) : null
}
