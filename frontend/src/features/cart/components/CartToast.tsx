import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

import { useCartStore } from '../stores/cart.store'
import './cart-toast.css'

const TOAST_DURATION = 4000

export function CartToast() {
  const dismissSuccessMessage = useCartStore((state) => state.dismissSuccessMessage)
  const successMessage = useCartStore((state) => state.successMessage)

  useEffect(() => {
    if (!successMessage) return

    const timeoutId = window.setTimeout(dismissSuccessMessage, TOAST_DURATION)

    return () => window.clearTimeout(timeoutId)
  }, [dismissSuccessMessage, successMessage])

  return successMessage ? (
    <div aria-live="polite" className="cart-toast" role="status">
      <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2} />
      <span>{successMessage}</span>
    </div>
  ) : null
}
