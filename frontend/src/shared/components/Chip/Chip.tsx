import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { X } from 'lucide-react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface IChipBaseProps {
  children: ReactNode
  isSelected?: boolean
}

interface IInteractiveChipProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>, IChipBaseProps {
  onRemove?: () => void
  removeLabel?: string
}

interface IStaticChipProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, IChipBaseProps {
  onRemove?: never
  removeLabel?: never
}

type ChipPropsType = IInteractiveChipProps | IStaticChipProps

export function Chip({
  children,
  className,
  isSelected = false,
  onClick,
  onRemove,
  removeLabel = 'Quitar filtro',
  ...props
}: ChipPropsType) {
  const isInteractive = Boolean(onClick || onRemove)
  const chipClassName = mergeClassNames('ui-chip', isSelected && 'ui-chip--selected', className)

  if (!isInteractive) {
    return (
      <span className={chipClassName} {...(props as HTMLAttributes<HTMLSpanElement>)}>
        {children}
      </span>
    )
  }

  return (
    <button
      aria-label={onRemove ? removeLabel : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      className={chipClassName}
      onClick={onRemove ?? onClick}
      type="button"
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
      {onRemove && <X aria-hidden="true" size={16} strokeWidth={2} />}
    </button>
  )
}
