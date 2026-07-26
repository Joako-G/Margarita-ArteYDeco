import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { Spinner } from '@/shared/components/Spinner'
import { mergeClassNames } from '@/shared/utils/class-names'

type ButtonVariantType = 'primary' | 'secondary' | 'ghost'
type ButtonSizeType = 'small' | 'medium' | 'large'

interface IButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  isLoading?: boolean
  loadingText?: string
  size?: ButtonSizeType
  variant?: ButtonVariantType
}

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  loadingText = 'Cargando…',
  size = 'medium',
  type = 'button',
  variant = 'primary',
  ...props
}: IButtonProps) {
  return (
    <button
      className={mergeClassNames(
        'ui-button',
        `ui-button--${variant}`,
        size !== 'medium' && `ui-button--${size}`,
        className,
      )}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading && (
        <Spinner className="ui-button__spinner" isDecorative label={loadingText} size="small" />
      )}
      <span>{isLoading ? loadingText : children}</span>
    </button>
  )
}
