import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface ITextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
  helpText?: string
  label: string
}

export function TextArea({ className, error, helpText, id, label, ...props }: ITextAreaProps) {
  const generatedId = useId()
  const textAreaId = id ?? generatedId
  const descriptionId = `${textAreaId}-description`
  const hasDescription = Boolean(error || helpText)

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={textAreaId}>
        {label}
      </label>
      <textarea
        aria-describedby={hasDescription ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        className={mergeClassNames('ui-field__control', 'ui-field__textarea', className)}
        id={textAreaId}
        {...props}
      />
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
