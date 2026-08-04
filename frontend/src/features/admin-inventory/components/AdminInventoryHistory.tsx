import { ChevronLeft, ChevronRight, History } from 'lucide-react'

import { Badge, Button } from '@/shared/components'

import type { IAdminInventoryHistory } from '../types/admin-inventory'
import {
  formatInventoryDate,
  formatQuantityDelta,
  getInventoryMovementLabel,
} from '../utils/admin-inventory-formatters'

interface IAdminInventoryHistoryProps {
  history: IAdminInventoryHistory
  onPageChange: (page: number) => void
}

function getMovementVariant(quantityDelta: number): 'error' | 'success' {
  return quantityDelta > 0 ? 'success' : 'error'
}

function getReference(
  movement: IAdminInventoryHistory['movements'][number],
): string {
  return movement.orderNumber ?? movement.actorName ?? '—'
}

export function AdminInventoryHistory({ history, onPageChange }: IAdminInventoryHistoryProps) {
  const { movements, pagination } = history

  return (
    <section aria-labelledby="inventory-history-title" className="admin-inventory__panel">
      <div className="admin-inventory__heading">
        <div>
          <p>Auditoría</p>
          <h2 id="inventory-history-title">Historial de movimientos</h2>
        </div>
        <span>{pagination.totalItems} movimiento{pagination.totalItems === 1 ? '' : 's'}</span>
      </div>

      {movements.length === 0 ? (
        <div className="admin-inventory__empty">
          <History aria-hidden="true" size={26} />
          <div>
            <strong>Todavía no hay movimientos</strong>
            <p>El primer ajuste de stock aparecerá acá.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="admin-inventory__table-wrap">
            <table className="admin-inventory__table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Movimiento</th>
                  <th scope="col">Cambio</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Referencia</th>
                  <th scope="col">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatInventoryDate(movement.createdAt)}</td>
                    <td>{getInventoryMovementLabel(movement.movementType)}</td>
                    <td>
                      <Badge variant={getMovementVariant(movement.quantityDelta)}>
                        {formatQuantityDelta(movement.quantityDelta)}
                      </Badge>
                    </td>
                    <td>{movement.stockBefore} → {movement.stockAfter}</td>
                    <td>{getReference(movement)}</td>
                    <td>{movement.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-inventory__cards">
            {movements.map((movement) => (
              <article className="admin-inventory__movement-card" key={movement.id}>
                <div>
                  <strong>{getInventoryMovementLabel(movement.movementType)}</strong>
                  <Badge variant={getMovementVariant(movement.quantityDelta)}>
                    {formatQuantityDelta(movement.quantityDelta)}
                  </Badge>
                </div>
                <dl>
                  <div><dt>Fecha</dt><dd>{formatInventoryDate(movement.createdAt)}</dd></div>
                  <div><dt>Stock</dt><dd>{movement.stockBefore} → {movement.stockAfter}</dd></div>
                  <div><dt>Referencia</dt><dd>{getReference(movement)}</dd></div>
                  <div><dt>Motivo</dt><dd>{movement.reason ?? '—'}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </>
      )}

      {pagination.totalPages > 1 ? (
        <nav aria-label="Paginación del historial de inventario" className="admin-inventory__pagination">
          <Button
            aria-label="Ir a la página anterior del historial"
            disabled={!pagination.hasPreviousPage}
            onClick={() => onPageChange(pagination.page - 1)}
            size="small"
            variant="secondary"
          >
            <ChevronLeft aria-hidden="true" size={18} />
            Anterior
          </Button>
          <span aria-live="polite">Página {pagination.page} de {pagination.totalPages}</span>
          <Button
            aria-label="Ir a la página siguiente del historial"
            disabled={!pagination.hasNextPage}
            onClick={() => onPageChange(pagination.page + 1)}
            size="small"
            variant="secondary"
          >
            Siguiente
            <ChevronRight aria-hidden="true" size={18} />
          </Button>
        </nav>
      ) : null}
    </section>
  )
}
