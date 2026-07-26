import type { HTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

type SectionBackgroundType = 'default' | 'muted'

interface ISectionProps extends HTMLAttributes<HTMLElement> {
  background?: SectionBackgroundType
  children: ReactNode
}

export function Section({ background = 'default', children, className, ...props }: ISectionProps) {
  return (
    <section
      className={mergeClassNames(
        'ui-section',
        background === 'muted' && 'ui-section--muted',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}
