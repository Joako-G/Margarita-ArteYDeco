import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Check, CircleAlert, CircleCheck, Clock3 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'

import { routes } from '@/config/routes'
import { useRefreshAdminSessionOnUnauthorized } from '@/features/admin-auth'
import { AdminPageHeader } from '@/features/admin-auth/components/AdminPageHeader'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_DETAILS } from '@/features/admin-orders'
import {
  adminConsumerWithdrawalActionSchema,
  adminConsumerWithdrawalLinkSchema,
  calculateAdminConsumerWithdrawalRefundTotal,
  formatConsumerWithdrawalDate,
  getAdminConsumerWithdrawalActionCopy,
  getAdminConsumerWithdrawalActionErrorMessage,
  getAdminConsumerWithdrawalEventCopy,
  getAdminConsumerWithdrawalGuidance,
  getAdminConsumerWithdrawalProgress,
  REFUND_STATUS_LABELS,
  REQUEST_STATUS_LABELS,
  RETURN_STATUS_LABELS,
  WITHDRAWAL_ACTION_LABELS,
  useAdminConsumerWithdrawal,
  useAdminConsumerWithdrawalAction,
  useAdminConsumerWithdrawalCandidates,
  useAdminConsumerWithdrawalLink,
} from '@/features/admin-consumer-withdrawals'
import type { AdminConsumerWithdrawalActionFormType, AdminConsumerWithdrawalLinkFormType, IAdminConsumerWithdrawalDetail } from '@/features/admin-consumer-withdrawals'
import { Badge, Button, Checkbox, EmptyState, Input, Modal, Skeleton, TextArea } from '@/shared/components'
import { getApiErrorCode, getApiErrorStatus } from '@/shared/services/api/errors'
import { formatPrice } from '@/shared/utils/format-price'
import { ORDER_STATUS_DETAILS } from '@/shared/utils/order-status'
import { buildWhatsAppUrl } from '@/shared/utils/whatsapp'

import '@/features/admin-consumer-withdrawals/admin-consumer-withdrawals.css'

const DEADLINE_STATUS_DETAILS = {
  apparently_in_time: { label: 'Dentro del plazo estimado', variant: 'success' },
  review_required: { label: 'Requiere revisión', variant: 'warning' },
  unknown: { label: 'Sin cálculo automático', variant: 'neutral' },
} as const

function AdminDateValue({ emptyText, value }: { emptyText: string; value: string | null }) {
  return value ? (
    <time dateTime={value}>{formatConsumerWithdrawalDate(value)}</time>
  ) : emptyText
}

function AdminConsumerWithdrawalContent({ request }: { request: IAdminConsumerWithdrawalDetail }) {
  const actionMutation = useAdminConsumerWithdrawalAction(request.id)
  const candidates = useAdminConsumerWithdrawalCandidates(request.id, request.order === null)
  const linkMutation = useAdminConsumerWithdrawalLink(request.id)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const form = useForm<AdminConsumerWithdrawalActionFormType>({ defaultValues: { hasReturnShippingExpense: false, note: '', publicExplanation: '', reference: '', refundAmountConfirmed: false, returnItems: [], returnShippingRefundAmount: '0' }, resolver: zodResolver(adminConsumerWithdrawalActionSchema) })
  const linkForm = useForm<AdminConsumerWithdrawalLinkFormType>({ defaultValues: { note: '', orderId: '' }, resolver: zodResolver(adminConsumerWithdrawalLinkSchema) })
  const needsPublicExplanation = selectedAction === 'determineNotApplicable'
  const needsRefundReference = selectedAction === 'confirmManualRefund'
  const isRefundAmountAction = needsRefundReference || selectedAction === 'correctManualRefund'
  const isCorrectingRefund = selectedAction === 'correctManualRefund'
  const isInspectingReturn = selectedAction === 'inspectReturn'
  const hasReturnShippingExpense = useWatch({ control: form.control, name: 'hasReturnShippingExpense' })
  const returnShippingInput = Number(useWatch({ control: form.control, name: 'returnShippingRefundAmount' }).replace(',', '.'))
  const returnShippingAmount = hasReturnShippingExpense && Number.isFinite(returnShippingInput)
    ? returnShippingInput
    : 0
  const refundTotalToConfirm = calculateAdminConsumerWithdrawalRefundTotal(
    request.refund.contractAmount,
    request.refund.originalShippingAmount,
    returnShippingAmount,
  )
  const actionCopy = getAdminConsumerWithdrawalActionCopy(selectedAction)
  const guidance = getAdminConsumerWithdrawalGuidance(request)
  const progress = getAdminConsumerWithdrawalProgress(request)
  const orderedActions = [...request.availableActions].sort((first, second) => {
    if (first === guidance.recommendedAction) return -1
    if (second === guidance.recommendedAction) return 1
    return 0
  })
  const orderStatus = request.order
    ? ORDER_STATUS_DETAILS[request.order.status as keyof typeof ORDER_STATUS_DETAILS]
    : null
  const paymentStatus = request.order ? PAYMENT_STATUS_DETAILS[request.order.paymentStatus] : null
  const returnItems = request.return.items ?? []
  const restockedUnits = returnItems.reduce(
    (total, item) => total + (item.restockableQuantity ?? 0),
    0,
  )
  const refundGuidance = request.return.status === 'inspected'
    ? `La inspección repuso ${restockedUnits} ${restockedUnits === 1 ? 'unidad apta' : 'unidades aptas'} en el stock. El reintegro económico se gestiona por separado.`
    : request.return.status === 'not_required' && request.refund.status === 'not_required'
      ? 'Este caso no requiere devolución física ni reintegro económico.'
      : request.return.status === 'not_required'
        ? 'No hace falta recibir productos. Gestioná únicamente el reintegro indicado.'
        : 'Coordiná la recepción del producto y el reintegro sin demoras. El stock se actualizará al registrar la inspección.'
  const deadline = request.deadline ?? {
    contractConcludedAt: null,
    fulfillmentAt: null,
    legalDeadlineAt: null,
    status: request.isDeadlineReviewRequired ? 'review_required' as const : 'unknown' as const,
  }
  const deadlineStatus = DEADLINE_STATUS_DETAILS[deadline.status]
  const fulfillmentLabel = request.order?.deliveryMethod === 'shipping'
    ? 'Entrega del pedido'
    : 'Retiro en el local'
  const fulfillmentEmptyText = request.order?.deliveryMethod === 'shipping'
    ? 'Todavía no entregado'
    : 'Todavía no retirado'

  async function handleAction(values: AdminConsumerWithdrawalActionFormType) {
    if (selectedAction === null) return
    if (needsPublicExplanation && values.publicExplanation.trim().length < 3) {
      form.setError('publicExplanation', { message: 'Ingresá una explicación pública comprensible.' })
      return
    }
    if (needsRefundReference && values.reference.trim().length < 2) {
      form.setError('reference', { message: 'Ingresá una referencia no sensible.' })
      return
    }
    const parsedReturnShippingAmount = Number(values.returnShippingRefundAmount.replace(',', '.'))
    const returnShippingRefundAmount = values.hasReturnShippingExpense ? parsedReturnShippingAmount : 0
    if (isRefundAmountAction && values.hasReturnShippingExpense
      && (!Number.isFinite(returnShippingRefundAmount) || returnShippingRefundAmount <= 0)) {
      form.setError('returnShippingRefundAmount', { message: 'Ingresá el gasto adicional o desmarcá la opción.' })
      return
    }
    if (isCorrectingRefund && returnShippingRefundAmount === request.refund.returnShippingAmount) {
      form.setError('returnShippingRefundAmount', { message: 'Ingresá un importe diferente al que figura actualmente.' })
      return
    }
    if (isRefundAmountAction && !values.refundAmountConfirmed) {
      form.setError('refundAmountConfirmed', { message: 'Confirmá el total que realmente devolviste.' })
      return
    }
    const confirmedTotalRefundAmount = calculateAdminConsumerWithdrawalRefundTotal(
      request.refund.contractAmount,
      request.refund.originalShippingAmount,
      returnShippingRefundAmount,
    )
    const returnItems = values.returnItems.map((item) => ({
      nonRestockableQuantity: Number(item.nonRestockableQuantity),
      orderItemId: item.orderItemId,
      restockableQuantity: Number(item.restockableQuantity),
    }))
    await actionMutation.mutateAsync({ action: selectedAction, expectedVersion: request.version, reason: values.note.trim(), ...(needsPublicExplanation ? { publicExplanation: values.publicExplanation.trim() } : {}), ...(needsRefundReference ? { reference: values.reference.trim() } : {}), ...(isInspectingReturn ? { returnItems } : {}), ...(isRefundAmountAction ? { confirmedTotalRefundAmount, returnShippingRefundAmount } : {}) })
    setFeedback('La acción quedó registrada en el historial.')
    setSelectedAction(null)
    form.reset()
  }

  function openAction(action: string) {
    const isCorrection = action === 'correctManualRefund'
    form.reset({
      hasReturnShippingExpense: isCorrection && request.refund.returnShippingAmount > 0,
      note: '',
      publicExplanation: '',
      reference: '',
      refundAmountConfirmed: false,
      returnItems: action === 'inspectReturn' ? returnItems.map((item) => ({
        nonRestockableQuantity: '',
        orderItemId: item.orderItemId,
        orderedQuantity: item.orderedQuantity,
        productName: item.productName,
        restockableQuantity: '',
      })) : [],
      returnShippingRefundAmount: isCorrection
        ? String(request.refund.returnShippingAmount)
        : '0',
    })
    setSelectedAction(action)
  }

  async function handleLinkOrder(values: AdminConsumerWithdrawalLinkFormType) {
    await linkMutation.mutateAsync({ expectedVersion: request.version, note: values.note.trim(), orderId: values.orderId })
    setFeedback('El pedido quedó asociado. Todavía no cambiamos su estado, el dinero ni el stock.')
  }

  return (
    <main aria-labelledby="admin-withdrawal-title" className="admin-page admin-withdrawal-detail">
      <AdminPageHeader actions={<Link className="ui-button ui-button--secondary" to={routes.adminConsumerWithdrawals}><ArrowLeft aria-hidden="true" size={18} />Volver</Link>} currentLabel={request.administrativeCode} description={`Presentada el ${formatConsumerWithdrawalDate(request.submittedAt)}`} sectionLabel="Arrepentimiento" title={`Solicitud ${request.administrativeCode}`} titleId="admin-withdrawal-title" />
      {feedback ? <div className="admin-withdrawals__feedback" role="status"><CircleCheck aria-hidden="true" /><p>{feedback}</p></div> : null}
      {actionMutation.isError ? <div className="admin-withdrawals__error" role="alert"><CircleAlert aria-hidden="true" /><p>{getAdminConsumerWithdrawalActionErrorMessage(getApiErrorCode(actionMutation.error))}</p></div> : null}
      <section className="admin-withdrawal-detail__summary" aria-labelledby="withdrawal-summary-title">
        <div><p>Situación actual</p><h2 id="withdrawal-summary-title">Estado del caso</h2></div>
        <div className="admin-withdrawal-detail__statuses"><div><span>Solicitud</span><Badge>{REQUEST_STATUS_LABELS[request.requestStatus]}</Badge></div><div><span>Devolución</span><Badge>{RETURN_STATUS_LABELS[request.return.status]}</Badge></div><div><span>Reintegro</span><Badge>{REFUND_STATUS_LABELS[request.refund.status]}</Badge></div></div>
        {request.isDeadlineReviewRequired ? <p className="admin-withdrawals__attention">Revisá manualmente la fecha de compra y entrega. Este aviso no rechaza la solicitud.</p> : null}
      </section>
      <section className="admin-withdrawals__panel admin-withdrawal-detail__next-step" aria-labelledby="withdrawal-next-step-title"><div><p>Siguiente paso recomendado</p><h2 id="withdrawal-next-step-title">{guidance.title}</h2><p>{guidance.description}</p></div>{request.phone ? <a className="ui-button ui-button--secondary" href={buildWhatsAppUrl(request.phone, `Hola, te contactamos de Margarita Arte & Deco por tu solicitud ${request.administrativeCode}.`)} rel="noreferrer" target="_blank">Coordinar por WhatsApp</a> : null}</section>
      <section className="admin-withdrawals__panel admin-withdrawal-detail__deadline" aria-labelledby="withdrawal-deadline-title">
        <div className="admin-withdrawal-detail__deadline-heading">
          <div>
            <p>Información para revisar</p>
            <h2 id="withdrawal-deadline-title">Plazo de arrepentimiento</h2>
          </div>
          <Badge variant={deadlineStatus.variant}>{deadlineStatus.label}</Badge>
        </div>
        <dl className="admin-withdrawal-detail__deadline-dates">
          <div>
            <dt>Compra confirmada</dt>
            <dd><AdminDateValue emptyText="Todavía no confirmada" value={deadline.contractConcludedAt} /></dd>
          </div>
          <div>
            <dt>{fulfillmentLabel}</dt>
            <dd><AdminDateValue emptyText={fulfillmentEmptyText} value={deadline.fulfillmentAt} /></dd>
          </div>
          <div>
            <dt>Solicitud presentada</dt>
            <dd><AdminDateValue emptyText="Sin fecha registrada" value={request.submittedAt} /></dd>
          </div>
          <div>
            <dt>Vencimiento estimado</dt>
            <dd><AdminDateValue emptyText="Requiere revisión manual" value={deadline.legalDeadlineAt} /></dd>
          </div>
        </dl>
        <p className="admin-withdrawal-detail__deadline-note">
          Estas fechas orientan la revisión administrativa. Nunca impiden que la persona presente su solicitud.
        </p>
      </section>
      <section className="admin-withdrawals__panel" aria-labelledby="withdrawal-progress-title"><p>Recorrido del caso</p><h2 id="withdrawal-progress-title">Qué falta para terminar</h2><ol className="admin-withdrawal-detail__progress">{progress.map((step, index) => <li className={step.done ? 'is-complete' : ''} key={step.label}><span aria-label={step.done ? `${step.label}: completado` : `${step.label}: pendiente`}>{step.done ? <Check aria-hidden="true" size={18} strokeWidth={2.5} /> : index + 1}</span><p>{step.label}</p></li>)}</ol></section>
      <div className="admin-withdrawal-detail__grid">
        <section className="admin-withdrawals__panel" aria-labelledby="withdrawal-identification-title"><p>Datos de la compra</p><h2 id="withdrawal-identification-title">Pedido y cliente</h2><dl><div><dt>Pedido</dt><dd>{request.order ? <Link to={routes.adminOrderDetail(request.order.id)}>{request.order.orderNumber}</Link> : 'Todavía no identificado'}</dd></div>{request.order && orderStatus ? <div><dt>Estado del pedido</dt><dd><Badge variant={orderStatus.variant}>{orderStatus.label}</Badge></dd></div> : null}{request.order && paymentStatus ? <div><dt>Estado del pago</dt><dd><Badge variant={paymentStatus.variant}>{paymentStatus.label}</Badge></dd></div> : null}{request.order ? <><div><dt>Medio de pago</dt><dd>{PAYMENT_METHOD_LABELS[request.order.paymentMethod]}</dd></div><div><dt>{request.order.paymentStatus === 'paid' ? 'Total cobrado' : 'Total del pedido'}</dt><dd>{formatPrice(request.order.total)}</dd></div></> : null}{request.phone ? <div><dt>Celular</dt><dd>{request.phone}</dd></div> : null}</dl>{request.comment ? <><h3>Comentario de la persona</h3><p className="admin-withdrawal-detail__comment">{request.comment}</p></> : null}</section>
        <section className="admin-withdrawals__panel" aria-labelledby="withdrawal-refund-title"><p>Dinero a devolver</p><h2 id="withdrawal-refund-title">Resumen del reintegro</h2><dl><div><dt>Total pagado</dt><dd>{formatPrice(request.refund.contractAmount)}</dd></div><div><dt>Envío de la compra</dt><dd>{formatPrice(request.refund.originalShippingAmount)}</dd></div><div><dt>Costo de devolución</dt><dd>{formatPrice(request.refund.returnShippingAmount)}</dd></div><div><dt>Total a devolver</dt><dd><strong>{formatPrice(request.refund.totalAmount)}</strong></dd></div></dl><p>{refundGuidance}</p></section>
      </div>
      {request.order === null ? <section className="admin-withdrawals__panel" aria-labelledby="withdrawal-candidates-title"><p>Datos de la compra</p><h2 id="withdrawal-candidates-title">Encontrar el pedido</h2><p>Antes de asociarlo, confirmá con la persona que sea su compra. Abrir WhatsApp no confirma datos ni cambia el caso.</p>{candidates.isPending ? <Skeleton /> : null}{candidates.data?.length ? <form className="admin-withdrawal-detail__candidate-form" noValidate onSubmit={linkForm.handleSubmit(handleLinkOrder)}><fieldset><legend>Pedidos posibles</legend>{candidates.data.map((candidate) => <label className="admin-withdrawal-detail__candidate" key={candidate.id}><input type="radio" value={candidate.id} {...linkForm.register('orderId')} /><span><strong>{candidate.orderNumber}</strong><small>{formatConsumerWithdrawalDate(candidate.createdAt)} · {candidate.itemSummary} · {formatPrice(candidate.total)}</small></span></label>)}</fieldset>{linkForm.formState.errors.orderId ? <p className="admin-withdrawals__attention" role="alert">{linkForm.formState.errors.orderId.message}</p> : null}<Input error={linkForm.formState.errors.note?.message} label="Cómo confirmaste la compra" {...linkForm.register('note')} /><Button isLoading={linkMutation.isPending} loadingText="Asociando…" type="submit">Asociar pedido</Button></form> : null}{candidates.data?.length === 0 ? <p>No encontramos pedidos con esos datos. Buscá la compra desde Pedidos antes de continuar.</p> : null}</section> : null}
      <section className="admin-withdrawals__panel" aria-labelledby="withdrawal-actions-title"><p>Acciones del caso</p><h2 id="withdrawal-actions-title">Elegí el paso que realizaste</h2><p>El botón recomendado indica el orden habitual. Registrá solamente acciones que ya realizaste fuera del sistema.</p>{orderedActions.length ? <div className="admin-withdrawal-detail__actions">{orderedActions.map((action) => { const isRecommended = action === guidance.recommendedAction; return <Button disabled={actionMutation.isPending} key={action} onClick={() => openAction(action)} variant={isRecommended ? 'primary' : 'secondary'}>{isRecommended ? 'Recomendado: ' : ''}{WITHDRAWAL_ACTION_LABELS[action] ?? action}</Button> })}</div> : <p>Este caso no tiene pasos pendientes por ahora.</p>}</section>
      <section className="admin-withdrawals__panel" aria-labelledby="withdrawal-timeline-title"><p>Seguimiento del caso</p><h2 id="withdrawal-timeline-title">Qué pasó hasta ahora</h2><ol className="admin-withdrawal-detail__timeline">{request.timeline.map((event) => {
        const eventCopy = getAdminConsumerWithdrawalEventCopy(event)
        return <li key={event.id}><Clock3 aria-hidden="true" size={18} /><div><strong>{eventCopy.title}</strong><p>{eventCopy.description}</p><span>{event.actorLabel} · {formatConsumerWithdrawalDate(event.createdAt)}</span></div></li>
      })}</ol></section>
      <Modal isOpen={selectedAction !== null} onClose={() => { if (!actionMutation.isPending) setSelectedAction(null) }} title={actionCopy.title}>
        <form className="admin-withdrawal-detail__modal-form" noValidate onSubmit={form.handleSubmit(handleAction)}>
          <p>{actionCopy.description}</p>
          {isRefundAmountAction ? <div className="admin-withdrawal-detail__refund-confirmation"><span>{isCorrectingRefund ? 'Total registrado actualmente' : 'Total pagado por la compra'}</span><strong>{formatPrice(isCorrectingRefund ? request.refund.totalAmount : request.refund.contractAmount + request.refund.originalShippingAmount)}</strong>{isCorrectingRefund ? <><span>Total después de la rectificación</span><strong>{formatPrice(refundTotalToConfirm)}</strong></> : null}<small>{request.refund.method ? `Medio original: ${PAYMENT_METHOD_LABELS[request.refund.method]}` : 'Verificá el medio de pago en el pedido.'}</small></div> : null}
          <TextArea error={form.formState.errors.note?.message} helpText="Solo lo verá la administración." label={actionCopy.noteLabel} placeholder={actionCopy.notePlaceholder} {...form.register('note')} />
          {needsPublicExplanation ? <TextArea error={form.formState.errors.publicExplanation?.message} helpText="La persona verá este mensaje cuando consulte su solicitud. Escribilo de forma clara y sin notas internas." label="Explicación para la persona" placeholder={actionCopy.publicExplanationPlaceholder} {...form.register('publicExplanation')} /> : null}
          {needsRefundReference ? <Input error={form.formState.errors.reference?.message} helpText="No ingreses CBU, alias ni datos bancarios completos." label="Referencia del reintegro" placeholder={actionCopy.referencePlaceholder} {...form.register('reference')} /> : null}
          {isInspectingReturn ? <fieldset className="admin-withdrawal-detail__return-items"><legend>Condición de las unidades recibidas</legend><p>Indicá cuántas unidades pueden volver a venderse. La suma de aptas y no aptas debe coincidir con lo vendido.</p>{returnItems.map((item, index) => <div className="admin-withdrawal-detail__return-item" key={item.orderItemId}><div><strong>{item.productName}</strong><span>{item.orderedQuantity} {item.orderedQuantity === 1 ? 'unidad recibida' : 'unidades recibidas'}</span></div><input type="hidden" {...form.register(`returnItems.${index}.orderItemId`)} /><input type="hidden" {...form.register(`returnItems.${index}.orderedQuantity`, { valueAsNumber: true })} /><input type="hidden" {...form.register(`returnItems.${index}.productName`)} /><div className="admin-withdrawal-detail__return-quantities"><Input error={form.formState.errors.returnItems?.[index]?.restockableQuantity?.message} inputMode="numeric" label="Unidades aptas para stock" max={item.orderedQuantity} min="0" type="number" {...form.register(`returnItems.${index}.restockableQuantity`)} /><Input error={form.formState.errors.returnItems?.[index]?.nonRestockableQuantity?.message} inputMode="numeric" label="Unidades no aptas" max={item.orderedQuantity} min="0" type="number" {...form.register(`returnItems.${index}.nonRestockableQuantity`)} /></div></div>)}</fieldset> : null}
          {isRefundAmountAction ? <fieldset className="admin-withdrawal-detail__refund-expense"><legend>Gastos adicionales</legend><Checkbox label="La persona pagó un gasto extra para devolver el producto" {...form.register('hasReturnShippingExpense')} /><p>No marques esta opción para ingresar el total de la compra. Ese importe ya está incluido arriba.</p>{hasReturnShippingExpense ? <Input error={form.formState.errors.returnShippingRefundAmount?.message} helpText="Ingresá únicamente el gasto extra acreditado por la devolución del producto." inputMode="decimal" label="Gasto extra de devolución pagado por la persona" min="0.01" placeholder={actionCopy.returnShippingPlaceholder} step="0.01" type="number" {...form.register('returnShippingRefundAmount')} /> : form.formState.errors.returnShippingRefundAmount ? <p className="admin-withdrawals__attention" role="alert">{form.formState.errors.returnShippingRefundAmount.message}</p> : null}</fieldset> : null}
          {isRefundAmountAction ? <div className="admin-withdrawal-detail__refund-total"><span>Total que quedará registrado</span><strong>{formatPrice(refundTotalToConfirm)}</strong><Checkbox label={`Confirmo que el dinero realmente devuelto fue ${formatPrice(refundTotalToConfirm)}`} {...form.register('refundAmountConfirmed')} />{form.formState.errors.refundAmountConfirmed ? <p className="admin-withdrawals__attention" role="alert">{form.formState.errors.refundAmountConfirmed.message}</p> : null}</div> : null}
          <div className="admin-withdrawal-detail__modal-actions"><Button disabled={actionMutation.isPending} onClick={() => setSelectedAction(null)} type="button" variant="ghost">Volver al caso</Button><Button isLoading={actionMutation.isPending} loadingText="Guardando…" type="submit">{actionCopy.confirmLabel}</Button></div>
        </form>
      </Modal>
    </main>
  )
}

export function AdminConsumerWithdrawalDetailPage() {
  const { requestId } = useParams()
  const request = useAdminConsumerWithdrawal(requestId)
  useRefreshAdminSessionOnUnauthorized(request.error)
  if (request.isPending) return <main className="admin-page admin-withdrawal-detail" aria-label="Cargando solicitud" role="status"><Skeleton /><Skeleton /><Skeleton /></main>
  if (request.isError && getApiErrorStatus(request.error) !== 401) return <main className="admin-page"><EmptyState action={<Button onClick={() => void request.refetch()}>Reintentar</Button>} description="No pudimos recuperar esta solicitud desde el backend local." icon={<CircleAlert />} title="Solicitud no disponible" /></main>
  return request.data ? <AdminConsumerWithdrawalContent request={request.data} /> : null
}
