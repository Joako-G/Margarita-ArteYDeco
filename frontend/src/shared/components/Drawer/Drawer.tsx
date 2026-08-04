import { useId } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

import { IconButton } from '@/shared/components/IconButton'
import { useDialog } from '@/shared/hooks/useDialog'
import { mergeClassNames } from '@/shared/utils/class-names'

type DrawerSideType = 'bottom' | 'left' | 'right'

interface IDrawerProps {
  children: ReactNode
  className?: string
  id?: string
  isModal?: boolean
  isOpen: boolean
  onClose: () => void
  side?: DrawerSideType
  title: string
}

export function Drawer({
  children,
  className,
  id,
  isModal = true,
  isOpen,
  onClose,
  side = 'right',
  title,
}: IDrawerProps) {
  const titleId = useId()
  const { dialogRef, handleBackdropClick, handleCancel } = useDialog({
    isModal,
    isOpen,
    onClose,
  })

  return (
    <dialog
      aria-labelledby={titleId}
      className={mergeClassNames(
        'ui-dialog',
        'ui-drawer',
        side === 'left' && 'ui-drawer--left',
        side === 'bottom' && 'ui-drawer--bottom',
        className,
      )}
      id={id}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      ref={dialogRef}
    >
      <div className="ui-dialog__content ui-drawer__content">
        <header className="ui-dialog__header">
          <h2 className="ui-dialog__title" id={titleId}>
            {title}
          </h2>
          <IconButton aria-label="Cerrar panel" onClick={onClose}>
            <X aria-hidden="true" size={24} strokeWidth={2} />
          </IconButton>
        </header>
        <div>{children}</div>
      </div>
    </dialog>
  )
}
