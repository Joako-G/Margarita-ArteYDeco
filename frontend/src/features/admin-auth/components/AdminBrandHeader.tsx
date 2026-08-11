import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import logo from '@/assets/images/logo-header-optimized.webp'

interface IAdminBrandHeaderProps {
  actions?: ReactNode
  brandDestination: string
  contextLabel?: string
  leadingAction?: ReactNode
}

export function AdminBrandHeader({
  actions,
  brandDestination,
  contextLabel,
  leadingAction,
}: IAdminBrandHeaderProps) {
  return (
    <header className="admin-brand-header">
      <div className="admin-brand-header__inner">
        <div className="admin-brand-header__identity">
          {leadingAction}
          <Link
            aria-label="Ir al inicio de Margaritas Arte & Deco"
            className="admin-brand-header__brand"
            to={brandDestination}
          >
            <img
              alt="Margaritas Arte & Deco"
              className="admin-brand-header__logo"
              decoding="async"
              height="544"
              src={logo}
              width="1097"
            />
          </Link>
          {contextLabel ? (
            <span className="admin-brand-header__context">{contextLabel}</span>
          ) : null}
        </div>
        {actions ? <div className="admin-brand-header__actions">{actions}</div> : null}
      </div>
    </header>
  )
}
