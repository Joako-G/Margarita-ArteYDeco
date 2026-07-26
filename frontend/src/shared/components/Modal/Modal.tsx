import { useId } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { IconButton } from '@/shared/components/IconButton'
import { useDialog } from '@/shared/hooks/useDialog'
import { mergeClassNames } from '@/shared/utils/class-names'

interface IModalProps {
  children: ReactNode
  className?: string
  footer?: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}

export function Modal({ children, className, footer, isOpen, onClose, title }: IModalProps) {
  const titleId = useId()
  const { dialogRef, handleBackdropClick, handleCancel } = useDialog({
    isOpen,
    onClose,
  })

  return (
    <dialog
      aria-labelledby={titleId}
      className={mergeClassNames('ui-dialog', 'ui-modal', className)}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      ref={dialogRef}
    >
      <div className="ui-dialog__content">
        <header className="ui-dialog__header">
          <h2 className="ui-dialog__title" id={titleId}>
            {title}
          </h2>
          <IconButton aria-label="Cerrar ventana" onClick={onClose}>
            <X aria-hidden="true" size={24} strokeWidth={2} />
          </IconButton>
        </header>
        <div>{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </dialog>
  )
}
