import { CircleAlert } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useAdminSession } from '@/features/admin-auth'
import { Button, Spinner } from '@/shared/components'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-auth/admin-auth.css'

export function ProtectedRoute() {
  const location = useLocation()
  const session = useAdminSession()

  if (session.isPending) {
    return (
      <main className="admin-session-state" aria-label="Validando acceso administrativo">
        <Spinner label="Validando sesión…" />
        <p>Validando tu acceso…</p>
      </main>
    )
  }

  if (session.isError) {
    if (getApiErrorStatus(session.error) === 401) {
      return (
        <Navigate
          replace
          state={{ from: `${location.pathname}${location.search}${location.hash}` }}
          to={routes.adminLogin}
        />
      )
    }

    return (
      <main className="admin-session-state" aria-labelledby="admin-session-error-title">
        <CircleAlert aria-hidden="true" size={30} />
        <h1 id="admin-session-error-title">No pudimos validar tu sesión</h1>
        <p>Revisá que el backend esté disponible e intentá nuevamente.</p>
        <Button onClick={() => void session.refetch()} variant="secondary">
          Reintentar
        </Button>
      </main>
    )
  }

  return <Outlet />
}
