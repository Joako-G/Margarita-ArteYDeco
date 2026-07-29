import { CircleAlert } from 'lucide-react'

interface IFieldMessageProps {
  error?: string
  helpText?: string
  id: string
}

export function FieldMessage({ error, helpText, id }: IFieldMessageProps) {
  return (
    <p
      aria-live={error ? 'polite' : undefined}
      className={error ? 'ui-field__error' : 'ui-field__help'}
      id={id}
    >
      {error ? (
        <CircleAlert
          aria-hidden="true"
          className="ui-field__error-icon"
          size={16}
          strokeWidth={2}
        />
      ) : null}
      <span>{error ?? helpText}</span>
    </p>
  )
}
