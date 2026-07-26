import type { HTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ISkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  label?: string
}

export function Skeleton({ className, label = 'Cargando contenido', ...props }: ISkeletonProps) {
  return (
    <span
      aria-label={label}
      className={mergeClassNames('ui-skeleton', className)}
      role="status"
      {...props}
    />
  )
}
