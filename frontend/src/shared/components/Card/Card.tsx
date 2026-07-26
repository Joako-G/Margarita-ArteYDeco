import type { HTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ICardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  isInteractive?: boolean
}

export function Card({ children, className, isInteractive = false, ...props }: ICardProps) {
  return (
    <div
      className={mergeClassNames('ui-card', isInteractive && 'ui-card--interactive', className)}
      {...props}
    >
      {children}
    </div>
  )
}
