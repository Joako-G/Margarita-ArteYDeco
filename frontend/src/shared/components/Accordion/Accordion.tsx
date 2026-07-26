import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

import { mergeClassNames } from '@/shared/utils/class-names'

interface IAccordionItem {
  content: ReactNode
  id: string
  title: string
}

interface IAccordionProps {
  allowMultiple?: boolean
  className?: string
  items: IAccordionItem[]
}

export function Accordion({ allowMultiple = false, className, items }: IAccordionProps) {
  const generatedId = useId()
  const [openItems, setOpenItems] = useState<string[]>([])

  function handleToggle(itemId: string) {
    setOpenItems((currentItems) => {
      const isOpen = currentItems.includes(itemId)

      if (isOpen) {
        return currentItems.filter((currentId) => currentId !== itemId)
      }

      return allowMultiple ? [...currentItems, itemId] : [itemId]
    })
  }

  return (
    <div className={mergeClassNames('ui-accordion', className)}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.id)
        const triggerId = `${generatedId}-${item.id}-trigger`
        const panelId = `${generatedId}-${item.id}-panel`

        return (
          <article className="ui-accordion__item" key={item.id}>
            <h3 className="ui-accordion__heading">
              <button
                aria-controls={panelId}
                aria-expanded={isOpen}
                className="ui-accordion__trigger"
                id={triggerId}
                onClick={() => handleToggle(item.id)}
                type="button"
              >
                <span>{item.title}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="ui-accordion__icon"
                  size={24}
                  strokeWidth={2}
                />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  animate={{ opacity: 1 }}
                  aria-labelledby={triggerId}
                  className="ui-accordion__panel"
                  exit={{ opacity: 0 }}
                  id={panelId}
                  initial={{ opacity: 0 }}
                  role="region"
                  transition={{ duration: 0.2 }}
                >
                  {item.content}
                </motion.div>
              )}
            </AnimatePresence>
          </article>
        )
      })}
    </div>
  )
}
