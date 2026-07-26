import type { HTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

type BadgeVariantType = 'neutral' | 'success' | 'warning' | 'error'

interface IBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode
  variant?: BadgeVariantType
}

export function Badge({ children, className, variant = 'neutral', ...props }: IBadgeProps) {
  return (
    <span className={mergeClassNames('ui-badge', `ui-badge--${variant}`, className)} {...props}>
      {children}
    </span>
  )
}
