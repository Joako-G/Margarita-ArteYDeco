import type { ReactNode } from 'react'

import { Typography } from '@/shared/components'

interface ILegalSectionProps {
  children: ReactNode
  id?: string
  title: string
  variant?: 'default' | 'disclosure'
}

export function LegalSection({ children, id, title, variant = 'default' }: ILegalSectionProps) {
  return (
    <section className={`legal-section legal-section--${variant}`} id={id}>
      <Typography as="h2" className="legal-section__title" variant="h3">
        {title}
      </Typography>
      {children}
    </section>
  )
}
