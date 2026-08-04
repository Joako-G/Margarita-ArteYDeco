export function getAdminCustomerErrorMessage(code: string | null | undefined): string {
  switch (code) {
    case 'CUSTOMER_PHONE_CONFLICT':
      return 'Ya existe otro cliente con ese celular.'
    case 'CUSTOMER_PHONE_INVALID':
      return 'Revisá el celular e incluí el código de área.'
    case 'CUSTOMER_UPDATE_CONFLICT':
      return 'Los datos cambiaron mientras editabas. Recargá la página e intentá nuevamente.'
    default:
      return 'No pudimos guardar los cambios. Intentá nuevamente.'
  }
}
