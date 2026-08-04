import { ArrowLeft } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'

import { routes } from '@/config/routes'
import { AdminBrandHeader } from '@/features/admin-auth/components/AdminBrandHeader'

import '@/features/admin-auth/admin-auth.css'

export function AuthLayout() {
  const actions = (
    <Link className="admin-brand-header__utility-link" to={routes.home}>
      <ArrowLeft aria-hidden="true" size={18} />
      Volver al sitio
    </Link>
  )

  return (
    <div className="admin-auth-shell">
      <AdminBrandHeader
        actions={actions}
        brandDestination={routes.home}
        contextLabel="Acceso administrativo"
      />
      <div className="admin-auth-shell__content">
        <Outlet />
      </div>
    </div>
  )
}
