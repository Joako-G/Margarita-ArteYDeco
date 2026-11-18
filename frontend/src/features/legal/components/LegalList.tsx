import type { ReactNode } from 'react'

interface ILegalListProps {
  items: ReactNode[]
}

export function LegalList({ items }: ILegalListProps) {
  return (
    <ul className="legal-list">
      {items.map((item, index) => (
        <li key={typeof item === 'string' ? item : index}>{item}</li>
      ))}
    </ul>
  )
}
