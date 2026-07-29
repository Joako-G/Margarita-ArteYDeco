import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/shared/components'

interface ICopyValueButtonProps {
  label: string
  value: string
}

export function CopyValueButton({ label, value }: ICopyValueButtonProps) {
  const [copyStatus, setCopyStatus] = useState<'copied' | 'error' | 'idle'>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  const isCopied = copyStatus === 'copied'
  const buttonLabel =
    copyStatus === 'error' ? 'Copiá el dato manualmente' : isCopied ? 'Copiado' : label

  return (
    <Button
      aria-label={`${label}: ${value}`}
      className="checkout-confirmation__copy"
      onClick={handleCopy}
      size="small"
      variant="secondary"
    >
      {isCopied ? (
        <Check aria-hidden="true" size={16} strokeWidth={2} />
      ) : (
        <Copy aria-hidden="true" size={16} strokeWidth={2} />
      )}
      {buttonLabel}
    </Button>
  )
}
