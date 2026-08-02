import type { HTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ISkeletonProps extends HTMLAttributes<HTMLSpanElement> {
  isDecorative?: boolean
  label?: string
}

export function Skeleton({
  className,
  isDecorative = false,
  label = 'Cargando contenido',
  ...props
}: ISkeletonProps) {
  return (
    <span
      aria-hidden={isDecorative || undefined}
      aria-label={isDecorative ? undefined : label}
      className={mergeClassNames('ui-skeleton', className)}
      role={isDecorative ? undefined : 'status'}
      {...props}
    />
  )
}
