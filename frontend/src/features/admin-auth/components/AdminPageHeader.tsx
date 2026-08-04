import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'

interface IAdminPageHeaderProps {
  actions?: ReactNode
  currentLabel: string
  description: string
  sectionLabel: string
  title: string
  titleId: string
}

export function AdminPageHeader({
  actions,
  currentLabel,
  description,
  sectionLabel,
  title,
  titleId,
}: IAdminPageHeaderProps) {
  return (
    <>
      <nav aria-label="Ruta actual" className="admin-breadcrumb">
        <Link to={routes.admin}>Panel</Link>
        <span aria-hidden="true">/</span>
        <strong>{currentLabel}</strong>
      </nav>
      <div className="admin-page-heading">
        <div>
          <p className="admin-page__eyebrow">{sectionLabel}</p>
          <h1 id={titleId}>{title}</h1>
          <p className="admin-page__intro">{description}</p>
        </div>
        {actions ? <div className="admin-page-heading__actions">{actions}</div> : null}
      </div>
    </>
  )
}
