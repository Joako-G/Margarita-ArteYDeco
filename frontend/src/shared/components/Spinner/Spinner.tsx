import type { HTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

type SpinnerSizeType = 'small' | 'medium' | 'large'

interface ISpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  isDecorative?: boolean
  label?: string
  size?: SpinnerSizeType
}

export function Spinner({
  className,
  isDecorative = false,
  label = 'Cargando…',
  size = 'medium',
  ...props
}: ISpinnerProps) {
  return (
    <span
      aria-hidden={isDecorative || undefined}
      aria-label={isDecorative ? undefined : label}
      className={mergeClassNames(
        'ui-spinner',
        size !== 'medium' && `ui-spinner--${size}`,
        className,
      )}
      role={isDecorative ? undefined : 'status'}
      {...props}
    />
  )
}
