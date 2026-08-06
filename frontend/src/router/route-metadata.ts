export interface IRouteMetadata {
  description: string
  robots: 'index, follow' | 'noindex, nofollow'
  title: string
}

const BRAND_NAME = 'Margaritas Arte & Deco'
const DEFAULT_DESCRIPTION =
  'Materiales, herramientas y accesorios para manualidades, decoración y proyectos creativos.'

const ADMIN_TITLES: Array<[pathPrefix: string, label: string]> = [
  ['/admin/configuracion', 'Configuración'],
  ['/admin/categorias', 'Categorías'],
  ['/admin/productos', 'Productos'],
  ['/admin/clientes', 'Clientes'],
  ['/admin/pedidos', 'Pedidos'],
  ['/admin/perfil', 'Mi perfil'],
]

export function getRouteMetadata(pathname: string): IRouteMetadata {
  if (pathname === '/') {
    return {
      description: DEFAULT_DESCRIPTION,
      robots: 'index, follow',
      title: `${BRAND_NAME} | Arte, materiales y decoración`,
    }
  }

  if (pathname === '/productos' || pathname.startsWith('/categoria/')) {
    return {
      description:
        'Explorá materiales para crear y decoraciones artesanales listas para regalar o transformar tus espacios.',
      robots: 'index, follow',
      title: `Productos | ${BRAND_NAME}`,
    }
  }

  if (pathname === '/checkout') {
    return {
      description: DEFAULT_DESCRIPTION,
      robots: 'noindex, nofollow',
      title: `Finalizar compra | ${BRAND_NAME}`,
    }
  }

  if (pathname === '/recuperar-pedido') {
    return {
      description: DEFAULT_DESCRIPTION,
      robots: 'noindex, nofollow',
      title: `Recuperar pedido | ${BRAND_NAME}`,
    }
  }

  if (pathname.startsWith('/pedido/')) {
    return {
      description: DEFAULT_DESCRIPTION,
      robots: 'noindex, nofollow',
      title: `Estado del pedido | ${BRAND_NAME}`,
    }
  }

  if (pathname === '/politica-de-privacidad') {
    return {
      description: `Conocé cómo ${BRAND_NAME} recopila, utiliza y protege los datos personales de quienes compran en nuestro sitio.`,
      robots: 'index, follow',
      title: `Política de Privacidad | ${BRAND_NAME}`,
    }
  }

  if (pathname === '/terminos-y-condiciones') {
    return {
      description: `Conocé las condiciones para utilizar el sitio y enviar pedidos a ${BRAND_NAME}.`,
      robots: 'index, follow',
      title: `Términos y Condiciones | ${BRAND_NAME}`,
    }
  }

  if (pathname === '/admin/login') {
    return {
      description: DEFAULT_DESCRIPTION,
      robots: 'noindex, nofollow',
      title: `Acceso administrativo | ${BRAND_NAME}`,
    }
  }

  if (pathname.startsWith('/admin')) {
    const section = ADMIN_TITLES.find(([pathPrefix]) => pathname.startsWith(pathPrefix))

    return {
      description: DEFAULT_DESCRIPTION,
      robots: 'noindex, nofollow',
      title: `${section?.[1] ?? 'Dashboard'} | ${BRAND_NAME}`,
    }
  }

  return {
    description: DEFAULT_DESCRIPTION,
    robots: 'noindex, nofollow',
    title: `Página no encontrada | ${BRAND_NAME}`,
  }
}
