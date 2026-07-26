import type { InputHTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ISwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'role' | 'type'> {
  label: string
}

export function Switch({ className, label, ...props }: ISwitchProps) {
  return (
    <label className={mergeClassNames('ui-switch', className)}>
      <input className="ui-switch__input" role="switch" type="checkbox" {...props} />
      <span aria-hidden="true" className="ui-switch__track" />
      <span>{label}</span>
    </label>
  )
}
