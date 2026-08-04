import { LayoutDashboard, LayoutGrid, UserRound } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'

import { routes } from '@/config/routes'

export const ADMIN_MOBILE_PANEL_ID = 'admin-mobile-panel'

export type AdminMobilePanelType = 'account' | 'management' | null

interface IAdminMobileNavigationProps {
  activePanel: AdminMobilePanelType
  onSelectPanel: (panel: AdminMobilePanelType) => void
}

export function AdminMobileNavigation({ activePanel, onSelectPanel }: IAdminMobileNavigationProps) {
  const location = useLocation()
  const isManagementRoute = location.pathname.startsWith(`${routes.admin}/`)

  function handlePanelSelection(panel: Exclude<AdminMobilePanelType, null>) {
    onSelectPanel(activePanel === panel ? null : panel)
  }

  return (
    <nav aria-label="Navegación administrativa móvil" className="admin-mobile-navigation">
      <NavLink
        className={({ isActive }) =>
          `admin-mobile-navigation__item${isActive && activePanel === null ? ' admin-mobile-navigation__item--active' : ''}`
        }
        end
        onClick={() => onSelectPanel(null)}
        to={routes.admin}
      >
        <LayoutDashboard aria-hidden="true" size={21} />
        <span>Inicio</span>
      </NavLink>
      <button
        aria-controls={ADMIN_MOBILE_PANEL_ID}
        aria-expanded={activePanel === 'management'}
        className={`admin-mobile-navigation__item${activePanel === 'management' || (activePanel === null && isManagementRoute) ? ' admin-mobile-navigation__item--active' : ''}`}
        onClick={() => handlePanelSelection('management')}
        type="button"
      >
        <LayoutGrid aria-hidden="true" size={21} />
        <span>Gestión</span>
      </button>
      <button
        aria-controls={ADMIN_MOBILE_PANEL_ID}
        aria-expanded={activePanel === 'account'}
        className={`admin-mobile-navigation__item${activePanel === 'account' ? ' admin-mobile-navigation__item--active' : ''}`}
        onClick={() => handlePanelSelection('account')}
        type="button"
      >
        <UserRound aria-hidden="true" size={21} />
        <span>Cuenta</span>
      </button>
    </nav>
  )
}
