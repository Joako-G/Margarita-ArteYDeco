import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'

import type { IAdminCustomer } from '../types/admin-customers'

interface IAdminCustomerTableProps {
  customers: readonly IAdminCustomer[]
}

export function AdminCustomerTable({ customers }: IAdminCustomerTableProps) {
  return (
    <div aria-label="Listado de clientes" className="admin-customer-table" role="region">
      <table>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th scope="col">Celular</th>
            <th scope="col">Pedidos</th>
            <th scope="col">Acciones</th>
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
              <td data-label="Acciones">
                <Link
                  aria-label={`Ver detalle de ${customer.firstName} ${customer.lastName}`}
                  className="admin-customer-table__detail"
                  to={routes.adminCustomerDetail(customer.id)}
                >
                  <Eye aria-hidden="true" size={17} />
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
