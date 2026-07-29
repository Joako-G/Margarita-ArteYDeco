import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

import { FieldMessage } from '@/shared/components/FieldMessage'
import { mergeClassNames } from '@/shared/utils/class-names'

interface IInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  helpText?: string
  label: string
}

export function Input({ className, error, helpText, id, label, ...props }: IInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const descriptionId = `${inputId}-description`
  const hasDescription = Boolean(error || helpText)

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        className={mergeClassNames('ui-field__control', className)}
        id={inputId}
        {...props}
      />
      {hasDescription ? (
        <FieldMessage error={error} helpText={helpText} id={descriptionId} />
      ) : null}
    </div>
  )
}
