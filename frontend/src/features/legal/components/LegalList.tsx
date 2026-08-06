interface ILegalListProps {
  items: string[]
}

export function LegalList({ items }: ILegalListProps) {
  return (
    <ul className="legal-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
