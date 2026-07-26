import type { HTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

type TypographyVariantType = 'hero' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption'

type TypographyElementType = 'h1' | 'h2' | 'h3' | 'p' | 'span'

interface ITypographyProps extends HTMLAttributes<HTMLElement> {
  as?: TypographyElementType
  children: ReactNode
  variant?: TypographyVariantType
}

const DEFAULT_ELEMENTS: Record<TypographyVariantType, TypographyElementType> = {
  hero: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  small: 'p',
  caption: 'span',
}

export function Typography({
  as,
  children,
  className,
  variant = 'body',
  ...props
}: ITypographyProps) {
  const Component = as ?? DEFAULT_ELEMENTS[variant]

  return (
    <Component
      className={mergeClassNames('ui-typography', `ui-typography--${variant}`, className)}
      {...props}
    >
      {children}
    </Component>
  )
}
