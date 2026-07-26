import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface IFloatingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  children: ReactNode
}

export function FloatingButton({
  children,
  className,
  type = 'button',
  ...props
}: IFloatingButtonProps) {
  return (
    <button className={mergeClassNames('ui-floating-button', className)} type={type} {...props}>
      {children}
    </button>
  )
}
