# FRONTEND-SDD.md

## 1. Objetivo

La aplicación pública se conectará al Backend durante la Fase 8. La Fase 8.5
incorporará únicamente el acceso, sesión y protección de rutas administrativas.
Los módulos del Panel y sus endpoints protegidos se implementarán juntos en la
Fase 9; no se crearán clientes Axios hacia rutas administrativas inexistentes o
sin autorización.

## 2. Arquitectura Frontend

## 3. Routing

- `/pedido/:orderNumber` mostrará una confirmación recuperada desde la API y protegida por la sesión anónima del navegador.
- `/recuperar-pedido` mostrará el formulario alternativo de número de pedido y celular.
- El número de pedido será un identificador de navegación, no una credencial. Nunca se incluirán tokens en rutas ni query strings.

## 4. Layouts

## 5. Aplicación Pública

### Landing

- La Landing no tendrá Hero y comenzará con un único `h1` dentro de la sección de categorías.
- Mostrar las categorías de Arte y Decoraciones en dos grupos visibles, con una explicación breve que diferencie productos sin terminar de piezas terminadas.
- Después de las categorías, mostrar destacados de Arte y destacados de Decoraciones; luego Beneficios, Testimonios, Preguntas frecuentes y CTA final.
- No incluir las secciones Inspiración, Galería ni Nosotros.
- En móvil, las categorías tendrán imágenes de 160 px y conservarán desplazamiento táctil, flechas visibles cuando exista overflow y nombres legibles fuera de la imagen.

- La navegación pública incluirá accesos directos a Categorías, Productos y Contacto.
  El estado activo se derivará de la ruta, query o hash,
  sin modificar la URL automáticamente durante el scroll.

### Catálogo

- Componer el catálogo con filtros de categorías y un grid de productos.
- Mostrar inmediatamente un hero compacto, búsqueda, categorías y ordenamiento sin
  bloquear la página mientras se obtienen los datos.
- Durante la carga, conservar la estructura completa y representar el grid mediante
  cards skeleton: 8 en desktop, 4 en tablet y 2 en mobile.
- Reemplazar los skeletons por las cards reales con una aparición breve de opacidad y
  desplazamiento vertical progresivo, respetando `prefers-reduced-motion`.
- Resolver los estados vacío y error dentro del área del grid, con acciones para
  limpiar los filtros o reintentar sin ocultar el hero ni los controles.
- Mantener el filtro seleccionado en la URL mediante `/categoria/:slug`.
- Permitir filtrar por área mediante `/productos?area=arte` o `/productos?area=decoraciones` sin perder búsqueda ni ordenamiento.
- Incluir búsqueda y ordenamiento sin perder la categoría activa.
- Adaptar la carga progresiva al viewport: 8 productos en desktop, 6 en tamaños medianos y 4 en pantallas pequeñas.
- La acción explícita para ver más cargará otro bloque del tamaño correspondiente al viewport.
- Conservar los productos ya visibles si el viewport cambia de tamaño.
- Mantener el ancho habitual de las cards cuando una búsqueda o filtro devuelva pocos productos.
- Reiniciar la cantidad visible al cambiar la categoría, la búsqueda o el ordenamiento.

### Categorías

- Mostrar una opción "Todos" por cada área y únicamente categorías activas.
- Representar cada categoría mediante un único botón con imagen circular, nombre y cantidad de productos.
- Utilizar una imagen cuadrada WebP específica por categoría, con un mínimo de
  560 × 560 px y el sujeto principal preparado para el recorte circular.
- Evitar escalar la imagen raster durante el hover; comunicar la interacción
  mediante elevación y superficie para conservar su nitidez.
- Mostrar el nombre y la cantidad debajo de la imagen para mejorar su lectura.
- Utilizar `aria-pressed` para comunicar la selección.
- Resaltar el botón seleccionado mediante superficie blanca, borde circular, halo y check.
- En el catálogo, mostrar sobre el grid el texto "Estás viendo: {categoryName}".
- Para "Todos", mostrar "Todos los productos".
- Utilizar desplazamiento horizontal con la barra nativa oculta, conservando gesto
  táctil, rueda horizontal y trackpad.
- Mostrar flechas de navegación a ambos lados en todos los tamaños cuando existan
  categorías fuera del área visible; mantenerlas en móvil como señal de continuidad.
- Deshabilitar la flecha correspondiente al alcanzar el inicio o el final, con un
  área interactiva mínima de 44 × 44 px.
- En la Landing, seleccionar una categoría navegará a `/categoria/:slug`.
- En el catálogo, seleccionar otra categoría actualizará la URL y los productos sin recargar la aplicación.

### Producto

- Mostrar únicamente productos activos.
- Si la URL de imagen de un producto no existe o no puede cargarse, mostrar el
  asset local `product-placeholder.webp` sin ocultar el nombre del producto ni
  presentar el placeholder como una fotografía real.
- El fallback visual no reemplaza la validación administrativa y de Backend que
  exige una imagen propia antes de activar el producto.
- Mostrar el stock disponible en el detalle del producto y cuando aporte valor en sus cards.
- Mostrar "Sin stock" y deshabilitar la compra cuando `stock_quantity` sea cero.
- Permitir agregar al carrito únicamente productos activos con stock suficiente.
- No permitir cantidades superiores al stock conocido.
- El estado del Frontend es informativo; el Backend debe validar actividad y stock nuevamente al crear el pedido.
- Cada ProductCard tendrá selector de cantidad y botón Agregar al carrito.
- Mostrar el badge "Nuevo" durante los primeros 30 días desde `created_at`.
- Reservar el badge "Oferta" para la funcionalidad de promociones; no inferir ofertas a partir del precio ni usar porcentajes hardcodeados.
- La cantidad inicial será 1.
- Deshabilitar disminuir en 1 y aumentar al alcanzar el stock.
- Si el producto ya está en el carrito, sumar la cantidad sin superar el stock.
- Después de agregar, mostrar confirmación breve y permitir continuar comprando.

### Carrito

- Mostrar la cantidad seleccionada y el máximo disponible.
- Impedir incrementos por encima del stock conocido.
- Informar y solicitar corrección si el stock cambió desde que se agregó el producto.
- Conservar el carrito no implica reservar unidades.
- Abrir el carrito mediante Drawer desde el icono del header; no abrirlo automáticamente después de cada agregado.
- Permitir editar cantidades, eliminar productos y vaciar el carrito.
- Mostrar subtotal, descuento estimado cuando corresponda y total.
- Incluir una acción principal "Continuar compra".

### Checkout

Flujo:

1. Revisar productos y cantidades.
2. Completar nombre, apellido y celular.
3. Elegir Efectivo o Transferencia.
4. Mostrar descuento y total actualizado.
5. Confirmar el pedido.
6. Asociar el pedido a la sesión anónima devuelta por el Backend.
7. Navegar a `/pedido/:orderNumber`.
8. Mostrar número de pedido y próximos pasos.

- Mantener visible el resumen antes de confirmar.
- Validar los datos con React Hook Form y Zod.
- Si se elige transferencia, mostrar el descuento antes de confirmar.
- No mostrar los datos bancarios como sustituto de la creación del pedido.
- Después de crear correctamente un pedido por transferencia, mostrar número de pedido, importe final, alias, CBU, banco y acciones para copiar.
- Incluir "Enviar comprobante por WhatsApp" con un mensaje predefinido que contenga nombre y número de pedido. El cliente adjuntará el archivo manualmente.
- Los datos bancarios deberán permanecer visibles en la confirmación aunque WhatsApp no pueda abrirse.
- Informar antes de confirmar que el pedido se retira exclusivamente en el local.
- Mostrar la dirección y los horarios configurados del local antes de confirmar.
- En la confirmación, mostrar dirección, horarios y el botón "Ver ubicación" enlazado a Google Maps.
- Abrir el mapa en una pestaña nueva con `rel="noopener noreferrer"`.
- Para efectivo, informar que el pago se realiza al retirar.
- No solicitar dirección al cliente.
- La confirmación no dependerá del estado local de `CheckoutPage`; se consultará mediante TanStack Query desde la ruta del pedido.
- Limpiar el carrito únicamente después de que el Backend confirme la creación correcta.
- El Frontend nunca leerá, almacenará ni enviará manualmente el token de la sesión anónima.

### Consulta y recuperación pública de pedidos

- Utilizar la cookie `HttpOnly` administrada por el Backend mediante requests Axios con credenciales.
- Mostrar "Ver mi último pedido" cuando una consulta válida confirme que existe un pedido reciente asociado al navegador.
- Permitir "Recuperar otro pedido" aunque exista una sesión vigente.
- Si no existe una sesión válida, mostrar `/recuperar-pedido` con número de pedido y celular.
- El formulario utilizará React Hook Form y Zod.
- Normalizar visualmente el número de pedido y aceptar únicamente dígitos en el celular.
- Enviar la recuperación exclusivamente mediante el servicio Axios centralizado.
- Después de una recuperación correcta, invalidar las queries públicas de pedidos y navegar a `/pedido/:orderNumber`.
- Mostrar siempre un error genérico cuando los datos no coincidan; nunca identificar qué campo fue incorrecto.
- Ante HTTP `429`, mostrar el tiempo de espera indicado por el Backend sin reintentos automáticos.
- Mostrar el CAPTCHA únicamente cuando el Backend indique que es necesario.
- No realizar reintentos automáticos de recuperación, porque podrían consumir el límite de seguridad.
- Si la sesión expiró mientras se consulta una ruta de pedido, conservar el número visible como referencia y ofrecer "Recuperar pedido".
- Incluir "Olvidar pedidos de este dispositivo"; después de confirmar la acción, revocar la sesión, limpiar la pista local y eliminar las queries públicas del cache.
- `localStorage` podrá guardar únicamente `lastOrderNumber` como pista de navegación. No guardará tokens, datos personales, estados, importes, CBU, alias ni respuestas completas.
- El Backend seguirá siendo la fuente oficial de estado, pago, totales y datos bancarios.
- No mostrar pedidos de una sesión distinta aunque se conozca su número.
- No incluir número de pedido, celular, CBU, alias ni respuestas de recuperación en analítica, logs del navegador o herramientas de monitoreo.
- La consulta pública mostrará número, fecha, estado, productos, cantidades, importes, método de pago, retiro y datos de transferencia cuando correspondan.
- WhatsApp continuará siendo una acción manual para enviar el comprobante, no un mecanismo de recuperación.

## 6. Panel Administrativo

### Login

### Dashboard

- Mostrar productos activos, productos sin stock, productos con stock bajo según
  Settings, categorías, clientes registrados, pedidos en curso, pedidos retirados
  y ventas recientes.
- Consultar el resumen mediante TanStack Query y el servicio Axios administrativo.
- Resolver carga con skeleton, error con reintento y listas vacías sin ocultar el
  encabezado de la pantalla.
- En móvil utilizar una columna y conservar libre la barra inferior; desde tablet
  reordenar inventario y actividad reciente sin desbordamiento horizontal.

### Productos

- El listado inicial de `/admin/productos` será de solo lectura y consumirá
  `GET /api/admin/products` mediante Axios y TanStack Query.
- Permitirá buscar por nombre, filtrar por publicación y estado de stock, ordenar
  y elegir 10, 20 o 50 filas. Los filtros y la página se conservarán en la URL.
- Mostrará imagen, nombre, slug, categoría, área del catálogo, precio, stock,
  publicación, destacado y fecha de actualización sin exponer rutas privadas de
  Storage.
- En desktop utilizará una tabla semántica. Por debajo de 1024 px cada fila se
  reorganizará como ficha etiquetada sin scroll horizontal y conservará libre la
  navegación administrativa inferior.
- Resolverá carga con skeleton, actualización en segundo plano, error con
  reintento y vacíos diferenciados para catálogo vacío y filtros sin resultados.
- Consultar, crear y editar `stock_quantity`.
- Mostrar filtros de productos con stock y sin stock.
- Permitir ajustes manuales con un motivo obligatorio.
- Mostrar el historial de movimientos de inventario.
- El formulario de alta y edición incluirá categoría, imagen, nombre, descripción, precio, stock, estado activo y condición de destacado.
- Generar el slug a partir del nombre y permitir validar su unicidad.
- Mostrar vista previa de la imagen antes de guardar.

### Categorías

- El listado administrativo permitirá buscar, filtrar por área y publicación,
  ordenar y paginar. Los filtros y la página se conservarán en la URL.
- En desktop utilizará una tabla semántica y por debajo de 1024 px reorganizará
  cada fila como ficha etiquetada sin desbordamiento horizontal.
- Permitirá crear, editar, ordenar, activar, desactivar y dar de baja lógicamente
  categorías, con confirmación explícita para la acción destructiva.
- El formulario reutilizable gestionará área, nombre, imagen, descripción, orden
  visual y publicación mediante React Hook Form y Zod.
- Una categoría nueva se creará inactiva, cargará su imagen privada y solo después
  solicitará la activación. Si falla la imagen conservará un estado seguro y
  ofrecerá feedback recuperable.
- Las acciones rápidas mostrarán el total de productos asociados y bloquearán la
  baja o el cambio de área cuando las reglas de negocio lo impidan.

### Pedidos

- El listado permitirá buscar por pedido o cliente, filtrar por estado operativo,
  método y estado de pago, ordenar y paginar. Los filtros se conservarán en la URL.
- En desktop utilizará una tabla semántica y por debajo de 1024 px reorganizará
  cada fila como ficha etiquetada sin scroll horizontal.
- El detalle mostrará cliente, celular, productos, cantidades, importes, descuento,
  método, estado de pago, observaciones y datos de retiro.
- Mostrará únicamente la siguiente acción válida para el método y estado vigente.
  Confirmar pago y retiro requerirá confirmación explícita.
- La cancelación utilizará un formulario con motivo obligatorio. Si el pedido está
  pagado, exigirá confirmar que el reintegro se gestionará manualmente.
- Mostrar claramente cuándo una cancelación restauró stock y actualizar Dashboard,
  pedidos y productos mediante TanStack Query.
- Incluir "Contactar cliente" para todos los pedidos.
- Incluir "Avisar que está listo" únicamente cuando el pedido esté `ready`.
- Incluir "Recordar transferencia" únicamente para transferencias con pago pendiente.
- Ofrecer un compositor con mensajes predefinidos y editables antes de abrir WhatsApp.
- El uso de WhatsApp no deberá cambiar estados ni asumir que el mensaje fue enviado o leído.

### Clientes

- El listado administrativo utilizará TanStack Query y filtros de búsqueda, orden
  y paginación serializados en la URL.
- En escritorio mostrará una tabla semántica y por debajo de 1024 px fichas con la
  misma información y acciones, sin desplazamiento horizontal.
- El detalle incluirá un formulario React Hook Form + Zod para nombre, apellido,
  celular y notas, junto con el historial paginado de pedidos de solo lectura.
- La baja lógica exigirá una confirmación explícita que explique la conservación
  del historial y la posible reactivación mediante una compra futura.
- Carga, vacío, error, éxito, conflicto de concurrencia y eliminación tendrán
  estados accesibles. Las mutaciones invalidarán clientes y Dashboard.

### Configuración

- `/admin/configuracion` consultará el singleton mediante TanStack Query y
  utilizará React Hook Form + Zod para toda la edición operativa.
- El formulario agrupará negocio y contacto, retiro, transferencia, inventario y
  redes; mostrará cambios pendientes, éxito, error y conflictos de concurrencia.
- La URL de Google Maps podrá abrirse en una pestaña nueva para comprobar la
  ubicación antes de guardar.
- El logo tendrá vista previa, validación de tipo y tamaño, reemplazo explícito y
  confirmación antes de volver al respaldo local oficial.
- Las mutaciones invalidarán Settings público, Settings administrativo, Dashboard
  y productos para actualizar logo, descuento y umbral de stock bajo.

- El DTO público de configuración expondrá `logoUrl`, nunca `logoPath`.
- Header y Footer utilizarán la misma `logoUrl` resuelta por el Backend.
- Mientras `logoUrl` no exista, esté vencida o la imagen no pueda cargarse, se
  utilizará `frontend/src/assets/images/logo-header.png` como respaldo.
- El cambio de origen no modificará las dimensiones, proporciones ni el texto
  alternativo del logo.

## 7. Componentes Compartidos

## 8. Gestión de Estado

- Zustand Persist continuará reservado al carrito y a pistas locales no sensibles.
- Los pedidos públicos serán estado remoto administrado por TanStack Query.
- No persistir el DTO de confirmación completo en stores ni `localStorage`.

## 9. Consumo de API

- Axios se configurará con `withCredentials: true` para los endpoints públicos que utilizan la cookie anónima.
- Las queries de pedidos tendrán tiempo de frescura corto y no se persistirán fuera de memoria.
- No reintentar automáticamente respuestas `401`, `403`, `404` ni `429` de consulta o recuperación pública.
- Al revocar la sesión, cancelar e invalidar todas las queries públicas de pedidos.

## 10. Formularios

- El formulario de recuperación validará número de pedido y celular con React Hook Form y Zod.
- El celular será numérico, se normalizará antes de enviarse y nunca se utilizará como único factor de recuperación.
- Los errores del formulario no revelarán si existe el pedido ni si el celular coincide.

## 11. Estados Globales

Loading

Error

Empty

Success

La consulta pública contemplará además:

- SessionExpired
- RecoveryRequired
- RateLimited
- CaptchaRequired
- SessionRevoked

## 12. Responsive

- Los layouts no producirán desbordamiento horizontal desde 390 px y mantendrán
  controles táctiles de al menos 44 px.
- Header y Footer pertenecen al `PublicLayout`; sus estilos se cargarán en todas
  las rutas públicas y no dependerán del CSS exclusivo de la Landing.
- Los filtros horizontales de categorías conservarán su desplazamiento interno
  sin ampliar el ancho del documento.

## 13. Accesibilidad

- Cada cambio de ruta llevará el foco programáticamente al contenido principal,
  salvo cuando la navegación incluya un fragmento.
- Se conservarán un único `h1`, regiones con nombre, texto alternativo o imágenes
  decorativas vacías y contraste mínimo WCAG AA.
- Los estados de carga y error de rutas serán perceptibles y permitirán reintentar
  o regresar al inicio sin depender del puntero.

## 14. Performance

- Las rutas públicas secundarias y todas las rutas administrativas usarán lazy
  loading; la ruta solicitada podrá iniciar su precarga antes de montar el Router.
- El carrito se descargará únicamente al abrirlo. Los formularios, Zod y Axios no
  formarán parte de la carga inicial de la Landing si la ruta no los necesita.
- Las imágenes bajo el primer viewport usarán carga nativa diferida, dimensiones
  explícitas y decodificación asíncrona. La imagen LCP tendrá `fetchpriority=high`,
  preload y variantes responsive WebP.
- Las fuentes remotas no bloquearán el primer render y los orígenes externos
  críticos usarán `preconnect`.
- Cada ruta pública indexable actualizará título, descripción, Open Graph,
  canonical y robots. Checkout, pedidos, recuperación y administración serán
  `noindex, nofollow`.

## 15. Flujo de Navegación

- Acceso administrativo: `/admin` sin sesión → `/admin/login` conservando el destino interno solicitado.
- Login correcto: `/admin/login` → destino administrativo solicitado o `/admin`.
- Sesión administrativa vigente: recargar `/admin` restaura el perfil desde el Backend sin leer tokens.
- Sesión administrativa vencida o revocada: cualquier ruta privada → `/admin/login`.
- Cierre de sesión: revocación en Backend, limpieza de caché de sesión y redirección a `/admin/login`.
- Perfil administrativo: menú de cuenta → `/admin/perfil`; nombre actualizado →
  refresco inmediato de sesión; contraseña actualizada → `/admin/login` con
  confirmación y sin conservar datos de los formularios.
- Después de crear un pedido: `/checkout` → `/pedido/:orderNumber`.
- Desde "Ver mi último pedido": cualquier ruta pública → último `/pedido/:orderNumber` autorizado.
- Sin sesión: `/pedido/:orderNumber` → estado de recuperación → `/recuperar-pedido`.
- Recuperación correcta: `/recuperar-pedido` → `/pedido/:orderNumber`.
- "Olvidar pedidos de este dispositivo": confirmación → revocación → catálogo.

## 16. Definition of Done

- Cambiar de ruta, recargar o reabrir el navegador no deberá perder una confirmación mientras la sesión anónima siga vigente.
- Un navegador no podrá consultar pedidos asociados exclusivamente a otra sesión.
- La recuperación deberá funcionar con coincidencia completa y responder de forma indistinguible ante datos inválidos.
- La interfaz deberá manejar expiración, revocación, CAPTCHA y rate limiting sin filtrar información.
- Ninguna credencial ni dato personal se persistirá en `localStorage`.
