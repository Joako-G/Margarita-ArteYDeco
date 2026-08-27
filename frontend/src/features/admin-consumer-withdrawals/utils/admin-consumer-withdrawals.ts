import type {
  IAdminConsumerWithdrawalEvent,
  IAdminConsumerWithdrawalFilters,
  IAdminConsumerWithdrawalDetail,
} from '../types/admin-consumer-withdrawals'

export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

export function getArgentinaDateTimeLocal(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    timeZone: ARGENTINA_TIME_ZONE,
    year: 'numeric',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`
}

export function argentinaDateTimeLocalToIso(value: string): string {
  return new Date(`${value}:00-03:00`).toISOString()
}

export const DEFAULT_ADMIN_CONSUMER_WITHDRAWAL_FILTERS: IAdminConsumerWithdrawalFilters = {
  compliance: 'all', linkage: 'all', page: 1, pageSize: 10, sort: 'newest', status: 'all',
}

export const REQUEST_STATUS_LABELS = {
  applicable: 'Corresponde', closed: 'Finalizada', not_applicable: 'No corresponde', received: 'Nueva', under_review: 'En revisión', verification_pending: 'Falta identificar la compra',
} as const

export const RETURN_STATUS_LABELS = { inspected: 'Producto revisado', not_required: 'No requiere', pending: 'Pendiente', received: 'Producto recibido' } as const
export const REFUND_STATUS_LABELS = { failed: 'Con problema', manual_review: 'Revisión manual', not_required: 'No requiere', pending: 'Pendiente', processing: 'En proceso', succeeded: 'Dinero devuelto' } as const

export const WITHDRAWAL_ACTION_LABELS: Record<string, string> = {
  close: 'Finalizar caso', completeVerification: 'Confirmar datos de la compra',
  confirmManualRefund: 'Confirmar dinero devuelto', determineApplicable: 'Continuar con la cancelación o devolución',
  correctManualRefund: 'Rectificar importe registrado',
  determineNotApplicable: 'Indicar que no corresponde', inspectReturn: 'Revisar productos y actualizar stock',
  markRefundFailed: 'Registrar un problema con el reintegro', markRefundManualReview: 'Revisar el reintegro manualmente',
  markRefundProcessing: 'Marcar reintegro en proceso', receiveReturn: 'Confirmar que recibimos el producto',
  requestVerification: 'Pedir datos para verificar la compra', startReview: 'Comenzar revisión',
}

const WITHDRAWAL_EVENT_COPY: Record<string, { description: string; title: string }> = {
  acknowledgement_issued: { description: 'El sistema generó el código para consultar el estado.', title: 'Código de seguimiento generado' },
  contingency_request_registered: { description: 'La solicitud recibida por WhatsApp quedó cargada en el sistema.', title: 'Solicitud de WhatsApp registrada' },
  order_linked: { description: 'La solicitud quedó relacionada con un pedido.', title: 'Pedido identificado' },
  refund_amount_corrected: { description: 'Se corrigió el desglose del reintegro sin borrar el registro anterior.', title: 'Importe del reintegro rectificado' },
  refund_confirmed_manual: { description: 'Se confirmó que el dinero fue devuelto.', title: 'Dinero devuelto' },
  refund_manual_review_required: { description: 'El reintegro necesita una revisión manual.', title: 'Reintegro pendiente de revisión' },
  refund_processing: { description: 'Se comenzó a gestionar la devolución del dinero.', title: 'Reintegro en proceso' },
  return_inspected: { description: 'Se clasificaron las unidades recibidas y las aptas volvieron al stock.', title: 'Stock de la devolución resuelto' },
  return_received: { description: 'El negocio confirmó que recibió el producto.', title: 'Producto recibido' },
  stock_reentered: { description: 'Se registró una reposición auditada de unidades aptas.', title: 'Stock repuesto' },
  review_started: { description: 'La administración comenzó a revisar el caso.', title: 'Revisión iniciada' },
  verification_requested: { description: 'Se solicitaron datos para confirmar la compra.', title: 'Verificación solicitada' },
  withdrawal_closed: { description: 'No quedan pasos pendientes en esta solicitud.', title: 'Caso finalizado' },
  withdrawal_determined_applicable: { description: 'La solicitud continuará con los pasos de cancelación, devolución o reintegro que correspondan.', title: 'La solicitud corresponde' },
  withdrawal_determined_not_applicable: { description: 'Se registró el motivo y la explicación para la persona.', title: 'La solicitud no corresponde' },
  withdrawal_submitted: { description: 'La persona envió la solicitud de arrepentimiento.', title: 'Solicitud recibida' },
}

export function getAdminConsumerWithdrawalEventCopy(event: IAdminConsumerWithdrawalEvent) {
  const copy = WITHDRAWAL_EVENT_COPY[event.type]
  const technicalDescription = event.type.replaceAll('_', ' ')

  return {
    description: event.description === technicalDescription
      ? copy?.description ?? 'Se registró un cambio en el caso.'
      : `${event.actorLabel === 'Sistema' ? 'Detalle del sistema' : 'Nota del negocio'}: ${event.description}`,
    title: copy?.title ?? 'Caso actualizado',
  }
}

export function getAdminConsumerWithdrawalActionCopy(action: string | null) {
  switch (action) {
    case 'requestVerification':
      return {
        confirmLabel: 'Registrar pedido de datos',
        description: 'Usá esta opción cuando todavía necesites confirmar el pedido o la identidad de la persona.',
        noteLabel: 'Datos que necesitás confirmar',
        notePlaceholder: 'Ej.: Solicitar número de pedido y nombre de quien realizó la compra',
        title: 'Pedir datos para verificar la compra',
      }
    case 'startReview':
      return {
        confirmLabel: 'Comenzar revisión',
        description: 'Indica que ya contás con información suficiente para revisar si la solicitud corresponde.',
        noteLabel: 'Qué información verificaste',
        notePlaceholder: 'Ej.: Confirmé el pedido, el celular y la fecha de compra',
        title: 'Comenzar la revisión del caso',
      }
    case 'determineApplicable':
      return {
        confirmLabel: 'Continuar con la solicitud',
        description: 'El sistema cancelará el pedido si todavía no fue entregado y mostrará si falta devolver el producto o el dinero.',
        noteLabel: 'Motivo de la decisión',
        notePlaceholder: 'Ej.: Compra y plazo verificados; corresponde continuar con la cancelación',
        title: 'Continuar con la cancelación o devolución',
      }
    case 'determineNotApplicable':
      return {
        confirmLabel: 'Guardar decisión',
        description: 'Explicá por qué no corresponde. La persona verá únicamente la explicación pública.',
        noteLabel: 'Motivo para el negocio',
        notePlaceholder: 'Ej.: El caso fue revisado con la documentación disponible',
        publicExplanationPlaceholder: 'Ej.: Revisamos tu solicitud y no corresponde por… Si necesitás que la revisemos nuevamente, comunicate por WhatsApp.',
        title: 'Indicar que la solicitud no corresponde',
      }
    case 'receiveReturn':
      return {
        confirmLabel: 'Confirmar producto recibido',
        description: 'Confirmá esta acción solamente cuando el producto ya esté nuevamente en el negocio.',
        noteLabel: 'Cómo recibiste el producto',
        notePlaceholder: 'Ej.: Recibido en el local el 21/08, entregado por la persona compradora',
        title: 'Confirmar recepción del producto',
      }
    case 'inspectReturn':
      return {
        confirmLabel: 'Registrar inspección y actualizar stock',
        description: 'Clasificá todas las unidades recibidas. El sistema sumará al stock únicamente las aptas para volver a venderse.',
        noteLabel: 'Resultado de la revisión',
        notePlaceholder: 'Ej.: Productos completos; una unidad presenta una rotura y no vuelve al stock',
        title: 'Revisar productos y resolver el stock',
      }
    case 'markRefundProcessing':
      return {
        confirmLabel: 'Registrar reintegro en proceso',
        description: 'Usá esta opción cuando comenzaste a gestionar la devolución, pero el dinero todavía no fue entregado.',
        noteLabel: 'Cómo se está gestionando',
        notePlaceholder: 'Ej.: Transferencia preparada; falta confirmar la acreditación',
        title: 'Registrar reintegro en proceso',
      }
    case 'markRefundManualReview':
      return {
        confirmLabel: 'Enviar a revisión manual',
        description: 'Usá esta opción si apareció un problema o necesitás comprobar el reintegro antes de continuar.',
        noteLabel: 'Qué necesitás revisar',
        notePlaceholder: 'Ej.: La transferencia fue rechazada; verificar los datos con la persona',
        title: 'Revisar el reintegro manualmente',
      }
    case 'confirmManualRefund':
      return {
        confirmLabel: 'Confirmar dinero devuelto',
        description: 'Confirmá solamente después de entregar o transferir el importe completo indicado en el resumen.',
        noteLabel: 'Detalle para el negocio',
        notePlaceholder: 'Ej.: Transferencia realizada y comprobante verificado',
        referencePlaceholder: 'Ej.: operación 845219 o recibo de caja 17',
        returnShippingPlaceholder: 'Ej.: 2500',
        title: 'Confirmar que devolviste el dinero',
      }
    case 'correctManualRefund':
      return {
        confirmLabel: 'Guardar rectificación',
        description: 'Usá esta opción únicamente para corregir un importe que quedó mal registrado. El valor anterior seguirá visible en el historial.',
        noteLabel: 'Motivo de la rectificación',
        notePlaceholder: 'Ej.: Se cargó por error el total de la compra como gasto de devolución',
        returnShippingPlaceholder: 'Ej.: 2500',
        title: 'Rectificar el importe registrado',
      }
    case 'close':
      return {
        confirmLabel: 'Finalizar caso',
        description: 'Finalizá el caso cuando no quede ninguna devolución, reintegro o revisión pendiente.',
        noteLabel: 'Resumen del cierre',
        notePlaceholder: 'Ej.: Pedido cancelado y reintegro confirmado con la persona',
        title: 'Finalizar la solicitud',
      }
    default:
      return {
        confirmLabel: 'Guardar cambio',
        description: 'Guardaremos este cambio en el historial del caso.',
        noteLabel: 'Motivo o detalle',
        notePlaceholder: 'Ej.: Detalle breve de lo que verificaste o realizaste',
        title: action === null ? 'Confirmar cambio' : WITHDRAWAL_ACTION_LABELS[action] ?? 'Confirmar cambio',
      }
  }
}

export function calculateAdminConsumerWithdrawalRefundTotal(
  contractAmount: number,
  originalShippingAmount: number,
  returnShippingAmount: number,
) {
  return Math.round((contractAmount + originalShippingAmount + returnShippingAmount) * 100) / 100
}

export function getAdminConsumerWithdrawalGuidance(request: IAdminConsumerWithdrawalDetail) {
  if (request.order === null) {
    return {
      description: 'Confirmá cuál es la compra antes de decidir si la solicitud corresponde.',
      recommendedAction: 'requestVerification',
      title: 'Identificá el pedido',
    }
  }
  if (request.requestStatus === 'received' || request.requestStatus === 'verification_pending') {
    return {
      description: 'Ya hay un pedido asociado. Comenzá la revisión para evaluar la solicitud.',
      recommendedAction: 'startReview',
      title: 'Revisá la compra y las fechas',
    }
  }
  if (request.requestStatus === 'under_review') {
    return {
      description: 'Verificá identidad, fechas y posibles excepciones. Luego indicá si corresponde continuar.',
      recommendedAction: null,
      title: 'Tomá una decisión sobre la solicitud',
    }
  }
  if (request.requestStatus === 'not_applicable') {
    return {
      description: 'La decisión y la explicación para la persona ya quedaron registradas.',
      recommendedAction: null,
      title: 'No quedan acciones pendientes',
    }
  }
  if (request.requestStatus === 'closed') {
    return {
      description: 'El caso está finalizado y conserva todo su historial.',
      recommendedAction: null,
      title: 'Caso finalizado',
    }
  }
  if (request.return.status === 'pending') {
    return {
      description: 'Coordiná la entrega con la persona y confirmá cuando el producto esté en el negocio.',
      recommendedAction: 'receiveReturn',
      title: 'Recibí el producto devuelto',
    }
  }
  if (request.return.status === 'received') {
    return {
      description: 'Clasificá todas las unidades recibidas. Al guardar, únicamente las aptas volverán al stock.',
      recommendedAction: 'inspectReturn',
      title: 'Resolvé el stock de la devolución',
    }
  }
  if (!['not_required', 'succeeded'].includes(request.refund.status)) {
    return {
      description: request.refund.status === 'pending'
        ? 'Iniciá el reintegro y confirmalo únicamente después de devolver el dinero.'
        : 'Confirmá el reintegro cuando el dinero ya haya sido entregado o transferido.',
      recommendedAction: request.refund.status === 'pending'
        ? 'markRefundProcessing'
        : 'confirmManualRefund',
      title: 'Devolvé el dinero',
    }
  }
  return {
    description: 'La devolución y el reintegro están completos. Finalizá el caso.',
    recommendedAction: 'close',
    title: 'Cerrá la solicitud',
  }
}

export function getAdminConsumerWithdrawalProgress(request: IAdminConsumerWithdrawalDetail) {
  const isDecisionRegistered = ['applicable', 'closed', 'not_applicable'].includes(
    request.requestStatus,
  )
  const isReviewStarted = isDecisionRegistered || request.requestStatus === 'under_review'

  return [
    { done: request.order !== null, label: 'Pedido identificado' },
    { done: isReviewStarted, label: 'Revisión iniciada' },
    { done: isDecisionRegistered, label: 'Decisión registrada' },
    {
      done: isDecisionRegistered && ['inspected', 'not_required'].includes(request.return.status),
      label: 'Devolución resuelta',
    },
    {
      done: isDecisionRegistered && ['not_required', 'succeeded'].includes(request.refund.status),
      label: 'Dinero resuelto',
    },
    {
      done: ['closed', 'not_applicable'].includes(request.requestStatus),
      label: 'Caso finalizado',
    },
  ] as const
}

export function getAdminConsumerWithdrawalActionErrorMessage(code: string | null): string {
  switch (code) {
    case 'WITHDRAWAL_UPDATE_CONFLICT':
      return 'El caso cambió mientras lo revisabas. Actualizá el detalle y volvé a intentar.'
    case 'WITHDRAWAL_ACTION_NOT_ALLOWED':
      return 'Esta acción ya no está disponible para el estado actual del caso.'
    case 'WITHDRAWAL_RETURN_ITEMS_REQUIRED':
      return 'Clasificá todos los productos recibidos antes de continuar.'
    case 'WITHDRAWAL_RETURN_QUANTITIES_INVALID':
      return 'Las unidades aptas y no aptas deben sumar exactamente la cantidad vendida de cada producto.'
    case 'WITHDRAWAL_RETURN_STOCK_UNRESOLVED':
      return 'Todavía falta resolver qué unidades vuelven al stock. Registrá la inspección antes de finalizar el caso.'
    case 'WITHDRAWAL_REFUND_TOTAL_MISMATCH':
      return 'El total cambió o no coincide con el desglose. Actualizá el caso y revisá los importes antes de confirmar.'
    case 'WITHDRAWAL_REFUND_CORRECTION_REQUIRED':
      return 'Completá el importe correcto y explicá por qué necesitás rectificarlo.'
    case 'ADMIN_FORBIDDEN':
      return 'Tu sesión no tiene permiso para gestionar este caso. Volvé a iniciar sesión.'
    case 'INVALID_CSRF_TOKEN':
      return 'No pudimos validar la seguridad de la sesión. Intentá nuevamente o volvé a iniciar sesión.'
    case 'ORIGIN_NOT_ALLOWED':
      return 'Abrí el panel desde la dirección configurada para Administración e intentá nuevamente.'
    case 'DATA_SOURCE_UNAVAILABLE':
      return 'No pudimos guardar el cambio por un problema interno. El caso no fue modificado; intentá nuevamente después de revisar el servidor.'
    default:
      return 'No pudimos registrar la acción. El caso no fue modificado; intentá nuevamente.'
  }
}

export function parseAdminConsumerWithdrawalFilters(params: URLSearchParams): IAdminConsumerWithdrawalFilters {
  const page = Number(params.get('page'))
  const pageSize = Number(params.get('pageSize'))
  const status = params.get('status')
  const linkage = params.get('linkage')
  const compliance = params.get('compliance')
  const sort = params.get('sort')
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: [10, 20, 50].includes(pageSize) ? pageSize : 10,
    ...(params.get('search')?.trim() ? { search: params.get('search')?.trim() } : {}),
    status: ['received', 'verification_pending', 'under_review', 'applicable', 'not_applicable', 'closed'].includes(status ?? '') ? status as IAdminConsumerWithdrawalFilters['status'] : 'all',
    linkage: ['linked', 'unlinked'].includes(linkage ?? '') ? linkage as IAdminConsumerWithdrawalFilters['linkage'] : 'all',
    compliance: ['attention', 'on_time'].includes(compliance ?? '') ? compliance as IAdminConsumerWithdrawalFilters['compliance'] : 'all',
    sort: ['newest', 'oldest', 'urgent'].includes(sort ?? '') ? sort as IAdminConsumerWithdrawalFilters['sort'] : 'newest',
  }
}

export function buildAdminConsumerWithdrawalSearchParams(filters: IAdminConsumerWithdrawalFilters) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status !== 'all') params.set('status', filters.status)
  if (filters.linkage !== 'all') params.set('linkage', filters.linkage)
  if (filters.compliance !== 'all') params.set('compliance', filters.compliance)
  if (filters.sort !== 'newest') params.set('sort', filters.sort)
  if (filters.page !== 1) params.set('page', String(filters.page))
  if (filters.pageSize !== 10) params.set('pageSize', String(filters.pageSize))
  return params
}

export function formatConsumerWithdrawalDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(value))
}
