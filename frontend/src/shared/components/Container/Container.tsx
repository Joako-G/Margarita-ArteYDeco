import type { HTMLAttributes, ReactNode } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface IContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Container({ children, className, ...props }: IContainerProps) {
  return (
    <div className={mergeClassNames('ui-container', className)} {...props}>
      {children}
    </div>
  )
}
