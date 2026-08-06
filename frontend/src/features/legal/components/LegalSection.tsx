import type { ReactNode } from 'react'

import { Typography } from '@/shared/components'

interface ILegalSectionProps {
  children: ReactNode
  title: string
}

export function LegalSection({ children, title }: ILegalSectionProps) {
  return (
    <section className="legal-section">
      <Typography as="h2" variant="h3">
        {title}
      </Typography>
      {children}
    </section>
  )
}
