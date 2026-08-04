import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'

import { routes } from '@/config/routes'
import {
  AdminAccountMenu,
  AdminMobileAccount,
} from '@/features/admin-auth/components/AdminAccountMenu'
import { AdminBrandHeader } from '@/features/admin-auth/components/AdminBrandHeader'
import {
  ADMIN_MOBILE_PANEL_ID,
  AdminMobileNavigation,
} from '@/features/admin-auth/components/AdminMobileNavigation'
import {
  AdminManagementNavigation,
  AdminNavigation,
} from '@/features/admin-auth/components/AdminNavigation'
import { useAdminLogout, useAdminSession } from '@/features/admin-auth'
import { Drawer, IconButton } from '@/shared/components'

import type { AdminMobilePanelType } from '@/features/admin-auth/components/AdminMobileNavigation'

import '@/features/admin-auth/admin-auth.css'

export function AdminLayout() {
  const navigate = useNavigate()
  const session = useAdminSession()
  const logout = useAdminLogout()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [mobilePanel, setMobilePanel] = useState<AdminMobilePanelType>(null)

  useEffect(() => {
    const mobileNavigationQuery = window.matchMedia('(min-width: 30rem)')
    const desktopNavigationQuery = window.matchMedia('(min-width: 80rem)')

    function handleViewportChange() {
      if (mobileNavigationQuery.matches) {
        setMobilePanel(null)
      }

      if (desktopNavigationQuery.matches) {
        setIsSidebarOpen(false)
      }
    }

    mobileNavigationQuery.addEventListener('change', handleViewportChange)
    desktopNavigationQuery.addEventListener('change', handleViewportChange)

    return () => {
      mobileNavigationQuery.removeEventListener('change', handleViewportChange)
      desktopNavigationQuery.removeEventListener('change', handleViewportChange)
    }
  }, [])

  async function handleLogout() {
    setIsSidebarOpen(false)
    setMobilePanel(null)

    try {
      await logout.mutateAsync()
    } finally {
      navigate(routes.adminLogin, { replace: true })
    }
  }

  const headerNavigation = (
    <IconButton
      aria-label="Abrir navegación administrativa"
      className="admin-header__menu-button"
      onClick={() => setIsSidebarOpen(true)}
      variant="ghost"
    >
      <Menu aria-hidden="true" size={22} />
    </IconButton>
  )

  const headerActions = (
    <AdminAccountMenu
      isLoggingOut={logout.isPending}
      onLogout={() => void handleLogout()}
      profile={session.data?.profile}
    />
  )

  return (
    <div className="admin-shell">
      <AdminBrandHeader
        actions={headerActions}
        brandDestination={routes.admin}
        leadingAction={headerNavigation}
      />

      <div className="admin-shell__body">
        <aside className="admin-sidebar">
          <AdminNavigation />
        </aside>
        <div className="admin-shell__content">
          {logout.isError ? (
            <p className="admin-shell__notice" role="status">
              La sesión local se cerró. El servidor no pudo confirmar la revocación remota.
            </p>
          ) : null}
          <Outlet />
        </div>
      </div>

      <AdminMobileNavigation activePanel={mobilePanel} onSelectPanel={setMobilePanel} />

      <Drawer
        className="admin-sidebar-drawer"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        side="left"
        title="Panel administrativo"
      >
        <div className="admin-sidebar-drawer__body">
          <AdminNavigation onNavigate={() => setIsSidebarOpen(false)} />
        </div>
      </Drawer>

      <Drawer
        className="admin-mobile-sheet"
        id={ADMIN_MOBILE_PANEL_ID}
        isModal={false}
        isOpen={mobilePanel !== null}
        onClose={() => setMobilePanel(null)}
        side="bottom"
        title={mobilePanel === 'management' ? 'Gestión' : 'Cuenta'}
      >
        {mobilePanel === 'management' ? (
          <AdminManagementNavigation onNavigate={() => setMobilePanel(null)} />
        ) : (
          <AdminMobileAccount
            isLoggingOut={logout.isPending}
            onLogout={() => void handleLogout()}
            onNavigate={() => setMobilePanel(null)}
            profile={session.data?.profile}
          />
        )}
      </Drawer>
    </div>
  )
}
