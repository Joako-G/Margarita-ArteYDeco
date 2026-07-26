import { useEffect, useRef } from 'react'
import type { MouseEvent, SyntheticEvent } from 'react'

interface IUseDialogOptions {
  isOpen: boolean
  onClose: () => void
}

export function useDialog({ isOpen, onClose }: IUseDialogOptions) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (isOpen && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement
      dialog.showModal()
      return
    }

    if (!isOpen && dialog.open) {
      dialog.close()
      returnFocusRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    return () => returnFocusRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault()
    onClose()
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return {
    dialogRef,
    handleBackdropClick,
    handleCancel,
  }
}
