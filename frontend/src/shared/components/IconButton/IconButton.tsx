import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

type IconButtonVariantType = 'primary' | 'secondary' | 'ghost'

interface IIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  children: ReactNode
  variant?: IconButtonVariantType
}

export function IconButton({
  children,
  className,
  type = 'button',
  variant = 'ghost',
  ...props
}: IIconButtonProps) {
  return (
    <button
      className={mergeClassNames('ui-icon-button', `ui-icon-button--${variant}`, className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
}
