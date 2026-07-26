import type { ReactNode } from 'react'

interface IEmptyStateProps {
  action?: ReactNode
  description: string
  icon: ReactNode
  title: string
}

export function EmptyState({ action, description, icon, title }: IEmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <span aria-hidden="true" className="ui-empty-state__icon">
        {icon}
      </span>
      <h2 className="ui-empty-state__title">{title}</h2>
      <p className="ui-empty-state__description">{description}</p>
      {action}
    </div>
  )
}
