import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Eye, RotateCcw } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import {
  adminConsumerWithdrawalFiltersSchema,
  adminConsumerWithdrawalContingencySchema,
  argentinaDateTimeLocalToIso,
  buildAdminConsumerWithdrawalSearchParams,
  DEFAULT_ADMIN_CONSUMER_WITHDRAWAL_FILTERS,
  formatConsumerWithdrawalDate,
  getArgentinaDateTimeLocal,
  parseAdminConsumerWithdrawalFilters,
  REQUEST_STATUS_LABELS,
  useAdminConsumerWithdrawals,
  useCreateAdminConsumerWithdrawalContingency,
} from '@/features/admin-consumer-withdrawals'
import type { AdminConsumerWithdrawalContingencyFormType, AdminConsumerWithdrawalFiltersFormType, IAdminConsumerWithdrawalFilters } from '@/features/admin-consumer-withdrawals'
import { normalizePhone } from '@/features/checkout/utils/checkout-links'
import { Badge, Button, Checkbox, EmptyState, Input, Modal, Pagination, Select, Skeleton, TextArea } from '@/shared/components'
import { getApiErrorStatus } from '@/shared/services/api/errors'

import '@/features/admin-consumer-withdrawals/admin-consumer-withdrawals.css'

function statusVariant(status: string): 'error' | 'neutral' | 'success' | 'warning' {
  if (status === 'applicable' || status === 'closed') return 'success'
  if (status === 'not_applicable') return 'error'
  if (status === 'under_review' || status === 'verification_pending') return 'warning'
  return 'neutral'
}

export function AdminConsumerWithdrawalsPage() {
  const [isContingencyOpen, setIsContingencyOpen] = useState(false)
  const [contingencyCode, setContingencyCode] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseAdminConsumerWithdrawalFilters(searchParams), [searchParams])
  const requests = useAdminConsumerWithdrawals(filters)
  const createContingency = useCreateAdminConsumerWithdrawalContingency()
  useRefreshAdminSessionOnUnauthorized(requests.error)
  const form = useForm<AdminConsumerWithdrawalFiltersFormType>({
    defaultValues: { compliance: filters.compliance, linkage: filters.linkage, pageSize: String(filters.pageSize) as '10' | '20' | '50', search: filters.search ?? '', sort: filters.sort, status: filters.status },
    resolver: zodResolver(adminConsumerWithdrawalFiltersSchema),
  })
  const contingencyForm = useForm<AdminConsumerWithdrawalContingencyFormType>({ defaultValues: { note: '', orderNumber: '', orderNumberUnavailable: false, phone: '', receivedAt: getArgentinaDateTimeLocal() }, resolver: zodResolver(adminConsumerWithdrawalContingencySchema) })
  const isOrderUnavailable = useWatch({ control: contingencyForm.control, name: 'orderNumberUnavailable' })
  useEffect(() => { form.reset({ compliance: filters.compliance, linkage: filters.linkage, pageSize: String(filters.pageSize) as '10' | '20' | '50', search: filters.search ?? '', sort: filters.sort, status: filters.status }) }, [filters, form])

  function updateFilters(next: IAdminConsumerWithdrawalFilters) { setSearchParams(buildAdminConsumerWithdrawalSearchParams(next)) }
  function handleApply(values: AdminConsumerWithdrawalFiltersFormType) {
    updateFilters({ ...values, page: 1, pageSize: Number(values.pageSize), ...(values.search ? { search: values.search } : {}) })
  }
  async function handleCreateContingency(values: AdminConsumerWithdrawalContingencyFormType) {
    const receipt = await createContingency.mutateAsync({ note: values.note.trim(), orderNumberUnavailable: values.orderNumberUnavailable, phone: normalizePhone(values.phone), receivedAt: argentinaDateTimeLocalToIso(values.receivedAt), ...(values.orderNumberUnavailable ? {} : { orderNumber: values.orderNumber.trim().toUpperCase() }) })
    setContingencyCode(receipt.requestCode)
    contingencyForm.reset()
  }

  function openContingency() {
    setContingencyCode(null)
    contingencyForm.reset({
      note: '',
      orderNumber: '',
      orderNumberUnavailable: false,
      phone: '',
      receivedAt: getArgentinaDateTimeLocal(),
    })
    setIsContingencyOpen(true)
  }

  const pagination = requests.data?.pagination
  return (
    <main aria-labelledby="admin-withdrawals-title" className="admin-page admin-withdrawals">
      <AdminPageHeader actions={<Button onClick={openContingency}>Cargar solicitud de WhatsApp</Button>} currentLabel="Arrepentimientos" description="Revisá las solicitudes y registrá cada devolución o reintegro." sectionLabel="Gestión" title="Arrepentimientos" titleId="admin-withdrawals-title" />
      <section aria-labelledby="withdrawal-filters-title" className="admin-withdrawals__panel">
        <div className="admin-withdrawals__heading"><div><p>Seguimiento</p><h2 id="withdrawal-filters-title">Encontrar solicitudes</h2></div></div>
        <form className="admin-withdrawals__filters" noValidate onSubmit={form.handleSubmit(handleApply)}>
          <Input label="Buscar" placeholder="Código o número de pedido" type="search" {...form.register('search')} />
          <Select label="Estado" {...form.register('status')}><option value="all">Todos</option>{Object.entries(REQUEST_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Select label="Pedido" {...form.register('linkage')}><option value="all">Todos</option><option value="linked">Pedido identificado</option><option value="unlinked">Falta identificar el pedido</option></Select>
          <Select label="Avisos" {...form.register('compliance')}><option value="all">Todos</option><option value="on_time">Sin avisos</option><option value="attention">Necesita revisión</option></Select>
          <Select label="Orden" {...form.register('sort')}><option value="urgent">Más urgentes</option><option value="newest">Más recientes</option><option value="oldest">Más antiguos</option></Select>
          <Select label="Por página" {...form.register('pageSize')}><option value="10">10</option><option value="20">20</option><option value="50">50</option></Select>
          <div className="admin-withdrawals__filter-actions"><Button onClick={() => updateFilters(DEFAULT_ADMIN_CONSUMER_WITHDRAWAL_FILTERS)} type="button" variant="ghost">Limpiar</Button><Button type="submit">Aplicar filtros</Button></div>
        </form>
      </section>
      <section aria-labelledby="withdrawal-list-title" className="admin-withdrawals__panel">
        <div className="admin-withdrawals__heading"><div><p>Resultados</p><h2 id="withdrawal-list-title">Solicitudes</h2></div>{pagination ? <span aria-live="polite">{pagination.totalItems} solicitudes</span> : null}</div>
        {requests.isPending ? <div aria-label="Cargando solicitudes" className="admin-withdrawals__skeleton" role="status"><Skeleton /><Skeleton /><Skeleton /></div> : null}
        {requests.isError && getApiErrorStatus(requests.error) !== 401 ? <div className="admin-withdrawals__error" role="alert"><CircleAlert aria-hidden="true" /><div><h2>No pudimos cargar las solicitudes</h2><p>Verificá que el backend local esté disponible.</p></div><Button onClick={() => void requests.refetch()} variant="secondary">Reintentar</Button></div> : null}
        {requests.data?.items.length ? <div className="admin-withdrawals__table" role="region" aria-label="Listado de arrepentimientos"><table><caption className="sr-only">Solicitudes de arrepentimiento</caption><thead><tr><th>Código</th><th>Fecha de solicitud</th><th>Estado</th><th>Pedido</th><th>Revisar antes de</th><th>Último cambio</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{requests.data.items.map((item) => <tr key={item.id}><td data-label="Código"><strong>{item.administrativeCode}</strong></td><td data-label="Fecha de solicitud">{formatConsumerWithdrawalDate(item.submittedAt)}</td><td data-label="Estado"><Badge variant={statusVariant(item.requestStatus)}>{REQUEST_STATUS_LABELS[item.requestStatus]}</Badge>{item.isDeadlineReviewRequired ? <span className="admin-withdrawals__attention">Revisar fechas</span> : null}</td><td data-label="Pedido">{item.order?.orderNumber ?? 'Todavía no identificado'}</td><td data-label="Revisar antes de">{item.firstReviewDueAt ? formatConsumerWithdrawalDate(item.firstReviewDueAt) : 'Sin fecha límite'}</td><td data-label="Último cambio">{formatConsumerWithdrawalDate(item.updatedAt)}</td><td data-label="Acciones"><Link className="admin-withdrawals__detail-link" to={routes.adminConsumerWithdrawalDetail(item.id)}><Eye aria-hidden="true" size={17} />Abrir solicitud</Link></td></tr>)}</tbody></table></div> : null}
        {requests.data?.items.length === 0 ? <EmptyState description="Las solicitudes aparecerán aquí cuando sean registradas." icon={<RotateCcw />} title="No hay solicitudes para estos filtros" /> : null}
        {pagination && pagination.totalPages > 1 ? <Pagination {...pagination} ariaLabel="Paginación de arrepentimientos" onPageChange={(page) => updateFilters({ ...filters, page })} /> : null}
      </section>
      <Modal isOpen={isContingencyOpen} onClose={() => { if (!createContingency.isPending) setIsContingencyOpen(false) }} title="Cargar solicitud recibida por WhatsApp">
        {contingencyCode ? <div className="admin-withdrawals__contingency-result" role="status"><strong>Solicitud guardada</strong><p>Compartí este código con la persona para que pueda consultar el estado:</p><code>{contingencyCode}</code><Button onClick={() => setIsContingencyOpen(false)}>Terminar</Button></div> : <form className="admin-withdrawal-detail__modal-form" noValidate onSubmit={contingencyForm.handleSubmit(handleCreateContingency)}><p>Completá estos datos tal como llegaron por WhatsApp. El sistema generará una constancia para la persona.</p><Input error={contingencyForm.formState.errors.receivedAt?.message} helpText="Horario de Argentina (Buenos Aires)." label="Cuándo recibiste la solicitud" max={getArgentinaDateTimeLocal()} type="datetime-local" {...contingencyForm.register('receivedAt')} /><Input error={contingencyForm.formState.errors.phone?.message} inputMode="numeric" label="Celular de la persona" placeholder="Ej.: 3516123456" {...contingencyForm.register('phone', { onChange: (event) => { event.target.value = normalizePhone(event.target.value) } })} /><Input disabled={isOrderUnavailable} error={contingencyForm.formState.errors.orderNumber?.message} label="Número de pedido" placeholder="Ej.: MAD-20260821-000002" {...contingencyForm.register('orderNumber')} /><Checkbox label="La persona no informó el número de pedido" {...contingencyForm.register('orderNumberUnavailable')} /><TextArea error={contingencyForm.formState.errors.note?.message} label="Detalle para el negocio" placeholder="Ej.: La persona pidió cancelar la compra por WhatsApp a las 18:30" {...contingencyForm.register('note')} />{createContingency.isError ? <p className="admin-withdrawals__attention" role="alert">No pudimos guardar la solicitud. Revisá los datos e intentá nuevamente.</p> : null}<div className="admin-withdrawal-detail__modal-actions"><Button onClick={() => setIsContingencyOpen(false)} type="button" variant="ghost">Volver al listado</Button><Button isLoading={createContingency.isPending} loadingText="Guardando…" type="submit">Guardar y generar código</Button></div></form>}
      </Modal>
    </main>
  )
}
