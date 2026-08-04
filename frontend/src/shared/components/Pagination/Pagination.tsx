import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '../Button'

interface IPaginationProps {
  ariaLabel: string
  hasNextPage: boolean
  hasPreviousPage: boolean
  onPageChange: (page: number) => void
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export function Pagination({
  ariaLabel,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  page,
  pageSize,
  totalItems,
  totalPages,
}: IPaginationProps) {
  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalItems)

  return (
    <nav aria-label={ariaLabel} className="ui-pagination">
      <p>
        Mostrando <strong>{firstItem}–{lastItem}</strong> de <strong>{totalItems}</strong>
      </p>
      <div>
        <Button
          aria-label="Ir a la página anterior"
          disabled={!hasPreviousPage}
          onClick={() => onPageChange(page - 1)}
          size="small"
          variant="secondary"
        >
          <ChevronLeft aria-hidden="true" size={18} />
          Anterior
        </Button>
        <span aria-live="polite">Página {page} de {totalPages}</span>
        <Button
          aria-label="Ir a la página siguiente"
          disabled={!hasNextPage}
          onClick={() => onPageChange(page + 1)}
          size="small"
          variant="secondary"
        >
          Siguiente
          <ChevronRight aria-hidden="true" size={18} />
        </Button>
      </div>
    </nav>
  )
}
