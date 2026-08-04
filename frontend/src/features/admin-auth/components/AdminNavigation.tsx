import { Boxes, ClipboardList, LayoutDashboard, Settings, Shapes, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { routes } from '@/config/routes'

interface IAdminNavigationProps {
  onNavigate?: () => void
}

function AdminManagementItems({ onNavigate }: IAdminNavigationProps) {
  return (
    <>
      <p className="admin-navigation__label">Gestión</p>
      <NavLink
        className={({ isActive }) =>
          `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`
        }
        onClick={onNavigate}
        to={routes.adminProducts}
      >
        <Boxes aria-hidden="true" size={19} />
        Productos
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`
        }
        onClick={onNavigate}
        to={routes.adminCategories}
      >
        <Shapes aria-hidden="true" size={19} />
        Categorías
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`
        }
        onClick={onNavigate}
        to={routes.adminOrders}
      >
        <ClipboardList aria-hidden="true" size={19} />
        Pedidos
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`
        }
        onClick={onNavigate}
        to={routes.adminCustomers}
      >
        <Users aria-hidden="true" size={19} />
        Clientes
      </NavLink>
      <NavLink
        className={({ isActive }) =>
          `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`
        }
        onClick={onNavigate}
        to={routes.adminSettings}
      >
        <Settings aria-hidden="true" size={19} />
        Configuración
      </NavLink>
    </>
  )
}

export function AdminNavigation({ onNavigate }: IAdminNavigationProps) {
  return (
    <nav aria-label="Navegación administrativa" className="admin-navigation">
      <p className="admin-navigation__label">Panel</p>
      <NavLink
        className={({ isActive }) =>
          `admin-navigation__item${isActive ? ' admin-navigation__item--active' : ''}`
        }
        end
        onClick={onNavigate}
        to={routes.admin}
      >
        <LayoutDashboard aria-hidden="true" size={19} />
        Dashboard
      </NavLink>

      <AdminManagementItems onNavigate={onNavigate} />
    </nav>
  )
}

export function AdminManagementNavigation({ onNavigate }: IAdminNavigationProps) {
  return (
    <nav aria-label="Secciones de gestión" className="admin-navigation">
      <AdminManagementItems onNavigate={onNavigate} />
    </nav>
  )
}
