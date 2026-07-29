import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

import { useCartStore } from '../stores/cart.store'
import './cart-toast.css'

const TOAST_DURATION = 4000

export function CartToast() {
  const dismissSuccessMessage = useCartStore((state) => state.dismissSuccessMessage)
  const successMessage = useCartStore((state) => state.successMessage)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!successMessage) return

    const timeoutId = window.setTimeout(dismissSuccessMessage, TOAST_DURATION)

    return () => window.clearTimeout(timeoutId)
  }, [dismissSuccessMessage, successMessage])

  return (
    <AnimatePresence initial={false}>
      {successMessage ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className="cart-toast"
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          role="status"
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <CheckCircle2 aria-hidden="true" size={20} strokeWidth={2} />
          <span>{successMessage}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
