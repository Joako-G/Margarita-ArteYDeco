import type { InputHTMLAttributes } from 'react'
import { Check } from 'lucide-react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ICheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Checkbox({ className, label, ...props }: ICheckboxProps) {
  return (
    <label className={mergeClassNames('ui-selection-control', className)}>
      <input className="ui-selection-control__input" type="checkbox" {...props} />
      <span aria-hidden="true" className="ui-selection-control__visual">
        <Check size={16} strokeWidth={2} />
      </span>
      <span>{label}</span>
    </label>
  )
}
