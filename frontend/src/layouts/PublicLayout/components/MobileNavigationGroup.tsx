import { Minus, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { isCatalogMenuGroup } from '@/features/catalog'
import type { CatalogMenuNodeType } from '@/features/catalog'

interface IMobileNavigationGroupProps {
  expandedGroupIds: string[]
  id: string
  isLinkActive: (href: string) => boolean
  items: CatalogMenuNodeType[]
  label: string
  onNavigate: (href: string) => void
  onToggle: (groupId: string) => void
}

export function MobileNavigationGroup({
  expandedGroupIds,
  id,
  isLinkActive,
  items,
  label,
  onNavigate,
  onToggle,
}: IMobileNavigationGroupProps) {
  const isExpanded = expandedGroupIds.includes(id)
  const ToggleIcon = isExpanded ? Minus : Plus
  const submenuId = `${id}-submenu`

  return (
    <div className="landing-mobile-menu__group">
      <button
        aria-controls={submenuId}
        aria-expanded={isExpanded}
        className="landing-mobile-menu__group-toggle"
        onClick={() => onToggle(id)}
        type="button"
      >
        <ToggleIcon aria-hidden="true" size={20} strokeWidth={2} />
        {label}
      </button>

      <div className="landing-mobile-menu__submenu" hidden={!isExpanded} id={submenuId}>
        {items.map((item) =>
          isCatalogMenuGroup(item) ? (
            <MobileNavigationGroup
              expandedGroupIds={expandedGroupIds}
              id={item.id}
              isLinkActive={isLinkActive}
              items={item.items}
              key={item.id}
              label={item.label}
              onNavigate={onNavigate}
              onToggle={onToggle}
            />
          ) : (
            <Link
              aria-current={isLinkActive(item.href) ? 'page' : undefined}
              key={item.href}
              onClick={() => onNavigate(item.href)}
              to={item.href}
            >
              {item.label}
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
