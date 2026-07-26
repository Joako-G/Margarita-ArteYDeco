import { cloneElement, useId, useState } from 'react'
import type { FocusEvent, KeyboardEvent, ReactElement } from 'react'

interface ITooltipProps {
  children: ReactElement<{ 'aria-describedby'?: string }>
  content: string
}

export function Tooltip({ children, content }: ITooltipProps) {
  const tooltipId = useId()
  const [isVisible, setIsVisible] = useState(false)

  function handleBlur(event: FocusEvent<HTMLSpanElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsVisible(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === 'Escape') {
      setIsVisible(false)
    }
  }

  const describedBy = [children.props['aria-describedby'], isVisible ? tooltipId : undefined]
    .filter(Boolean)
    .join(' ')
  const trigger = cloneElement(children, {
    'aria-describedby': describedBy || undefined,
  })

  return (
    <span
      className="ui-tooltip"
      onBlur={handleBlur}
      onFocus={() => setIsVisible(true)}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {trigger}
      {isVisible && (
        <span className="ui-tooltip__content" id={tooltipId} role="tooltip">
          {content}
        </span>
      )}
    </span>
  )
}
