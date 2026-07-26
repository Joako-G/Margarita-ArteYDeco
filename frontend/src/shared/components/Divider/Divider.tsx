import type { HTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

type DividerOrientationType = 'horizontal' | 'vertical'

interface IDividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: DividerOrientationType
}

export function Divider({ className, orientation = 'horizontal', ...props }: IDividerProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={mergeClassNames(
        'ui-divider',
        orientation === 'vertical' && 'ui-divider--vertical',
        className,
      )}
      {...props}
    />
  )
}
