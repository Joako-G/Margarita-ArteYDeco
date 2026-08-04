import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'

import type { IAdminCustomer } from '../types/admin-customers'

interface IAdminCustomerTableProps {
  customers: readonly IAdminCustomer[]
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function AdminCustomerTable({ customers }: IAdminCustomerTableProps) {
  return (
    <div aria-label="Listado de clientes" className="admin-customer-table" role="region">
      <table>
        <caption className="sr-only">Clientes activos del comercio</caption>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Celular</th>
            <th scope="col">Pedidos</th>
            <th scope="col">Cliente desde</th>
            <th scope="col">Actualizado</th>
            <th scope="col"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td data-label="Cliente">
                <strong>{customer.firstName} {customer.lastName}</strong>
              </td>
              <td data-label="Celular">{customer.phone}</td>
              <td data-label="Pedidos">
                <span className="admin-customer-table__numeric">{customer.orderCount}</span>
              </td>
              <td data-label="Cliente desde">
                <time dateTime={customer.createdAt}>{formatDate(customer.createdAt)}</time>
              </td>
              <td data-label="Actualizado">
                <time dateTime={customer.updatedAt}>{formatDate(customer.updatedAt)}</time>
              </td>
              <td data-label="Acciones">
                <Link
                  aria-label={`Ver detalle de ${customer.firstName} ${customer.lastName}`}
                  className="admin-customer-table__detail"
                  to={routes.adminCustomerDetail(customer.id)}
                >
                  <Eye aria-hidden="true" size={17} />
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
