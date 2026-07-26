import type { InputHTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface IRadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function Radio({ className, label, ...props }: IRadioProps) {
  return (
    <label
      className={mergeClassNames('ui-selection-control', 'ui-selection-control--radio', className)}
    >
      <input className="ui-selection-control__input" type="radio" {...props} />
      <span aria-hidden="true" className="ui-selection-control__visual" />
      <span>{label}</span>
    </label>
  )
}
