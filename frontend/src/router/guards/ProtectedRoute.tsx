import { Navigate, Outlet } from 'react-router-dom'

import { routes } from '@/config/routes'

// La autenticación se implementará en la Fase 8.5. Hasta entonces, el área admin permanece cerrada.
export function ProtectedRoute() {
  const isAuthenticated = false

  return isAuthenticated ? <Outlet /> : <Navigate replace to={routes.adminLogin} />
}
