import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ISelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode
  error?: string
  helpText?: string
  label: string
}

export function Select({
  children,
  className,
  error,
  helpText,
  id,
  label,
  ...props
}: ISelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const descriptionId = `${selectId}-description`
  const hasDescription = Boolean(error || helpText)

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={selectId}>
        {label}
      </label>
      <select
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        className={mergeClassNames('ui-field__control', className)}
        id={selectId}
        {...props}
      >
        {children}
      </select>
      {hasDescription && (
        <p
          aria-live={error ? 'polite' : undefined}
          className={error ? 'ui-field__error' : 'ui-field__help'}
          id={descriptionId}
        >
          {error ?? helpText}
        </p>
      )}
    </div>
  )
}
