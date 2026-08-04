# ROADMAP.md

# Margarita Arte & Deco

## Development Roadmap

Versión: 1.0

---

# Objetivo

Este documento define el orden oficial de desarrollo del proyecto.

Cada fase debe completarse al 100% antes de comenzar la siguiente.

No se deben implementar funcionalidades de fases futuras sin haber finalizado la actual.

Todo el desarrollo debe respetar:

- AGENTS.md
- DECISIONS.md
- CONVENTIONS.md
- DESIGN-SYSTEM.md

---

# FASE 0 — Inicialización del Proyecto

## Objetivo

Preparar toda la infraestructura del proyecto.

## Tareas

- Crear proyecto React + TypeScript + Vite
- Configurar ESLint
- Configurar Prettier
- Configurar alias (@)
- Configurar React Router
- Configurar TanStack Query
- Configurar Zustand
- Configurar React Hook Form
- Configurar Axios
- Configurar Framer Motion
- Configurar variables de entorno
- Crear estructura Feature First
- Configurar rutas públicas y privadas
- Crear Layout Público
- Crear Layout Administrativo

## Resultado esperado

Proyecto completamente configurado y listo para comenzar.

---

# FASE 1 — Design System

## Objetivo

Construir toda la biblioteca visual reutilizable.

## Componentes Base

- Button
- IconButton
- Input
- TextArea
- Select
- Checkbox
- Radio
- Switch
- Badge
- Chip
- Card
- Container
- Section
- Divider
- Modal
- Drawer
- Accordion
- Tooltip
- Spinner
- Skeleton
- Empty State
- Floating Button
- Typography

## Resultado esperado

Todos los componentes reutilizables disponibles para el proyecto.

---

# FASE 2 — Mock Data

## Objetivo

Desarrollar todo el Frontend utilizando datos simulados.

## Crear

- categories.mock.ts
- products.mock.ts
- orders.mock.ts
- customers.mock.ts
- settings.mock.ts
- testimonials.mock.ts
- gallery.mock.ts
- faq.mock.ts

## Categorías Iniciales

- Moldes de Silicona
- Fibro Fácil
- Pinceles
- Sellos Bajo Relieve
- Sellos
- Láminas Termotransferibles
- Láminas UV
- Accesorios
- Deco

## Resultado esperado

Toda la Landing funciona sin Backend.

Cambiar a la API deberá implicar únicamente reemplazar el origen de los datos.

---

# FASE 2.5 — Landing Comercial

## Objetivo

Construir toda la experiencia pública del sitio.

## Secciones

- Header
- Hero
- Beneficios
- Categorías
- Filtros circulares con imagen
- Indicador de categoría seleccionada
- Productos Destacados
- Inspiración
- Galería
- Nosotros
- Testimonios
- FAQ
- CTA Final
- Footer

## Requisitos

- Responsive
- SEO
- Accesibilidad
- Animaciones
- Lazy Loading

## Resultado esperado

Landing completamente funcional utilizando datos simulados.

---

# FASE 3 — Catálogo de Productos

## Objetivo

Construir el catálogo completo.

## Funcionalidades

- Grid de productos
- Cards reutilizables
- Filtro circular por categorías
- Estado seleccionado sincronizado con la URL
- Selector de cantidad por producto
- Buscador
- Ordenamiento
- Estados
- Badges
- Productos destacados
- Productos nuevos
- Productos en oferta (diferido a Fase 13 — Promociones)
- Disponibilidad según stock
- Estado visual Sin stock

## Resultado esperado

Catálogo completamente funcional.

---

# FASE 4 — Carrito de Compras

## Objetivo

Construir el flujo completo del carrito.

## Funcionalidades

- Drawer lateral
- Agregar productos
- Eliminar productos
- Modificar cantidades
- Respetar el stock disponible
- Informar cambios de disponibilidad
- Confirmación sin interrumpir la compra
- Persistencia con Zustand Persist
- Subtotal
- Descuento
- Total
- Vaciar carrito

## Resultado esperado

Carrito completamente funcional.

---

# FASE 5 — Checkout

## Objetivo

Construir el flujo de compra.

## Funcionalidades

Formulario:

- Nombre
- Apellido
- Teléfono
- Observaciones

Métodos de pago

- Transferencia
- Efectivo

Resumen

Descuento por transferencia

Confirmación

Número de pedido y próximos pasos

Datos bancarios y envío de comprobante por WhatsApp

Confirmación bancaria visible sin depender de WhatsApp

Retiro exclusivo en el local, dirección, horarios y acceso a Google Maps

Creación del pedido

Validación final y descuento atómico de stock

## Resultado esperado

Flujo completo utilizando datos simulados.

La confirmación simulada valida la experiencia visual, pero no implementa persistencia de producción. La sesión anónima, la ruta recuperable y el formulario seguro se implementarán entre las Fases 6, 7 y 8.

---

# FASE 6 — Base de Datos

## Objetivo

Diseñar toda la base de datos antes del Backend.

## Estado

Completada el 29 de julio de 2026.

El modelo fue materializado en cuatro migraciones versionadas y seeds idempotentes.
Se validaron sobre PostgreSQL las relaciones, constraints, índices, RLS,
privilegios mínimos, Storage privado, auditoría, sesiones anónimas, transacciones
de pedidos, contención de stock, cancelación idempotente y purga sin eliminación
del historial.

## Diseñar

- Usuarios
- Productos
- Categorías
- Pedidos
- Detalle de pedidos
- Clientes
- Configuración
- Storage
- Auditoría
- Movimientos de inventario
- Sesiones anónimas de compra
- Relación Guest Session Orders

## Definir

- Relaciones
- Índices
- Constraints
- Foreign Keys
- RLS
- Buckets
- Seeds
- Hash único de credenciales anónimas
- Expiración y revocación de sesiones
- Índices para `token_hash`, `expires_at`, `order_number` y relaciones de sesión
- Snapshot normalizado del celular utilizado en la compra
- Política de purga de sesiones sin eliminar pedidos

## Resultado esperado

Modelo de datos completamente validado.

---

# FASE 6.1 — Áreas del catálogo

## Objetivo

Extender el modelo validado para distinguir Arte de Decoraciones antes de desplegarlo en Supabase.

## Implementar

- `catalog_area` obligatorio en Categories.
- Clasificación y orden independiente de categorías por área.
- Seeds idempotentes con categorías de Decoraciones específicas.
- Contratos de Backend y administración preparados para filtrar por área.
- Landing sin Hero, Inspiración, Galería ni Nosotros.
- Categorías de Arte y Decoraciones como primer contenido.
- Experiencia móvil ampliada y accesible.

## Estado

Completada el 31 de julio de 2026.

Se validaron 8 categorías de Arte, 4 de Decoraciones y 29 productos mediante
PostgreSQL embebido. El seed permaneció idempotente, el constraint rechazó áreas
inválidas y el trigger bloqueó la reclasificación de categorías con productos.
La Landing y el catálogo se verificaron con lint, build, pruebas automatizadas y
navegación responsive. El despliegue sobre Supabase remoto continúa siendo una
operación de infraestructura independiente.

---

# FASE 7 — Backend API Pública

## Objetivo

Construir la API REST necesaria para la aplicación pública, sin crear ni montar
rutas administrativas.

## Estado

Completada el 2 de agosto de 2026.

El primer incremento implementa la base ejecutable y segura del Backend y los
módulos públicos de solo lectura para Health, Categories, Products y Settings.
Incluye validación Zod, capas Controller/Service/Repository, consultas sin N+1,
URLs privadas firmadas por lote con caché, CORS explícito, headers de seguridad,
rate limiting, logging con redacción y respuestas de error centralizadas.

El 2 de agosto de 2026 se validó este incremento contra el proyecto Supabase
remoto: 12 categorías públicas con sus imágenes, 14 productos activos, Settings
y el logo de marca respondieron correctamente. Ocho imágenes de producto se
resolvieron desde Storage y seis productos sin objeto disponible devolvieron
`imageUrl: null` según el contrato de respaldo.

El incremento 7.2 se implementó localmente el 2 de agosto de 2026. Incluye la
creación transaccional de pedidos mediante `create_order_with_stock`, Guest
Session anónima de 30 días con credencial opaca de 256 bits y hash persistido,
cookie `__Host-` segura, bootstrap y validación CSRF con HMAC, validación estricta
de `Origin`, rate limiting de escritura, normalización de celular y DTO público
mínimo con `Cache-Control: no-store`. La suite cubre emisión y reutilización de
sesión, credenciales no expuestas, CSRF, Origin, validación del body, fallo de la
RPC y fallo posterior a la confirmación de la transacción.

No se ejecutó automáticamente una creación contra Supabase remoto porque esa
prueba genera historial comercial y descuenta stock real. El procedimiento
manual y explícito está documentado en `backend/README.md`.

El incremento 7.3 se implementó el 2 de agosto de 2026. Incorpora consultas
aisladas por Guest Session, recuperación genérica por pedido y celular,
rotación y revocación atómicas, huellas HMAC persistentes, bloqueo antiabuso,
señal CAPTCHA adaptativa y purga diaria mediante Supabase Cron. La migración fue
aplicada y sus privilegios, RLS, RPC y tarea programada se verificaron en el
proyecto remoto; las pruebas transaccionales terminaron en rollback.

Cloudflare Turnstile fue aprobado e integrado en el Backend como proveedor
adaptativo. Siteverify valida acción y hostname y falla de forma cerrada sin
contabilizar caídas del proveedor como intentos del comprador. El widget visual
se incorporará al formulario durante la Fase 8.

La Fase 7 no incluye Supabase Auth, validación de JWT, autorización administrativa
ni endpoints `/api/admin`. La infraestructura de acceso administrativo pertenece
a la Fase 8.5 y los casos de uso, endpoints y pantallas de administración se
implementarán juntos en la Fase 9, siempre detrás de esa protección.

## Módulos públicos

- Health
- Consulta pública de productos
- Consulta pública de categorías
- Configuración pública del negocio
- Resolución segura de imágenes desde Storage
- Creación de pedidos y validación transaccional de stock
- Métodos de pago y estados iniciales del pedido
- Sesiones anónimas
- Consulta pública de pedidos
- Recuperación pública de pedidos
- CSRF, CORS, rate limiting y Turnstile adaptativo

## Arquitectura

- Controllers
- Services
- Repositories
- DTO
- Validators
- Middlewares

## Sesión anónima y seguridad pública

- Crear o reutilizar una sesión anónima al confirmar un pedido.
- Generar tokens mediante CSPRNG con al menos 256 bits de entropía.
- Persistir únicamente el hash del token.
- Entregar la credencial en cookie host-only con prefijo `__Host-`, `HttpOnly`, `Secure`, `Path=/` y `SameSite=Lax`.
- Asociar pedidos y sesiones dentro del flujo transaccional.
- Implementar expiración máxima de 30 días, rotación, revocación y limpieza.
- Implementar `GET /api/public/orders/recent`.
- Implementar `GET /api/public/orders/:orderNumber`.
- Implementar `POST /api/public/orders/recover`.
- Implementar `DELETE /api/public/guest-session`.
- Recuperar únicamente mediante coincidencia completa de número de pedido y celular normalizado.
- Aplicar respuestas indistinguibles, comparación segura, `Cache-Control: no-store` y DTO público mínimo.
- Configurar CORS con orígenes explícitos, requests con credenciales, validación de `Origin` y protección CSRF.
- Implementar rate limiting por IP y huella HMAC de pedido/celular.
- Solicitar CAPTCHA de forma adaptativa después de intentos sospechosos.
- Probar aislamiento entre sesiones, enumeración, expiración, rotación, revocación y fuerza bruta.

## Resultado esperado

API pública completamente funcional, sin rutas administrativas expuestas.

---

# FASE 8 — Integración Frontend + Backend

## Objetivo

Reemplazar Mock Data por la API.

## Punto de continuación — 2 de agosto de 2026

La Fase 7 está completada y la API pública ya fue validada contra Supabase. El
Frontend todavía utiliza Mock Data para catálogo, checkout y configuración,
aunque ya dispone de Axios, TanStack Query, `VITE_API_URL` y la estructura visual
necesaria.

El siguiente trabajo debe comenzar con el **incremento 8.1: integración pública
de solo lectura**:

1. Configurar el cliente Axios compartido con `withCredentials: true` y conservar
   el recorrido obligatorio Frontend → Backend; el Frontend no accederá a
   Supabase.
2. Integrar `GET /api/public/categories`, `GET /api/public/products` y
   `GET /api/public/settings` mediante servicios y consultas TanStack Query.
3. Adaptar los DTO del Backend a los tipos de dominio del Frontend y reemplazar
   los mocks de productos, categorías y Settings en Landing, catálogo, header y
   footer.
4. Conservar el fallback local de producto cuando `imageUrl` sea `null` o la
   imagen remota falle, e implementar estados de carga, vacío y error sin romper
   el layout.
5. Validar la integración con ambos servidores locales, pruebas, lint y build.

### Incremento 8.1 completado — 2 de agosto de 2026

La integración pública de solo lectura quedó implementada y validada. El cliente
Axios compartido utiliza `withCredentials: true`; catálogo y Settings consumen
exclusivamente `GET /api/public/categories`, `GET /api/public/products` y
`GET /api/public/settings` mediante TanStack Query. Los adaptadores mantienen los
DTO del Backend fuera de los componentes y conservan los tipos de dominio del
Frontend.

Landing, catálogo, Header y Footer ya utilizan datos reales. La interfaz incluye
estados de carga, vacío y error; el logo conserva el respaldo local oficial; y
productos o categorías con una URL ausente o fallida mantienen el layout mediante
el recurso local de respaldo. El carrito recibe las existencias devueltas por la
API a través de la sincronización ya existente, sin convertirlo todavía en una
reserva de stock.

La validación local se realizó con Backend y Vite activos: 12 categorías, 14
productos y Settings se renderizaron desde Supabase a través de la API. Se
comprobaron la Landing y el catálogo en desktop y móvil, la permanencia del filtro
en la URL, productos sin stock, fallbacks de imagen y ausencia de errores de
consola. Frontend: 15 pruebas, lint y build correctos. Backend: 52 pruebas, lint y
build correctos.

### Incremento 8.2 completado — 2 de agosto de 2026

La sincronización del carrito y el stock quedó centralizada en el `PublicLayout`,
por lo que se ejecuta al iniciar la aplicación, al refrescar el catálogo y al
entrar directamente a cualquier ruta pública, incluido `/checkout`. La
reconciliación actualiza los datos persistidos de cada producto, corrige cantidades
fuera del rango válido y elimina productos inactivos, ausentes o sin stock.

Cada ajuste se conserva como un cambio de disponibilidad independiente y se
comunica dentro del Drawer. El cliente debe confirmar esos cambios antes de
continuar. Mientras la API todavía se consulta, falla o existen cambios sin
confirmar, tanto la acción "Continuar compra" como la ruta de checkout permanecen
bloqueadas. Reintentar la consulta no descarta el carrito y agregar productos
continúa sin reservar unidades.

La lógica de reconciliación cubre productos vigentes, reducción de stock,
agotados, productos no disponibles y cantidades persistidas inválidas. La suite
del Frontend finalizó con 19 pruebas, lint y build correctos. La validación con la
API real confirmó el flujo Catálogo → Carrito → Checkout, entrada directa y
recarga de `/checkout`, Drawer responsive sin desbordamiento y ausencia de errores
de consola.

El próximo punto de continuación es el **incremento 8.3: checkout y creación real
de pedidos con CSRF**. Debe reemplazar el inventario y la transacción mock del
checkout por `POST /api/orders`, obtener el token desde
`GET /api/public/csrf-token`, enviar cookies y encabezado CSRF, consumir Settings
reales antes de confirmar y tratar de forma diferenciada cambios de stock,
validación, CSRF y fallos temporales. El carrito se limpiará únicamente después de
la confirmación exitosa del Backend.

### Incremento 8.3 completado — 2 de agosto de 2026

El checkout dejó de crear pedidos, números e inventario en memoria. Antes de cada
escritura obtiene un token nuevo mediante `GET /api/public/csrf-token` y crea el
pedido exclusivamente con `POST /api/orders`, usando el cliente Axios compartido
con cookies y el encabezado `X-CSRF-Token`. Un rechazo CSRF previo a la creación
se reintenta una sola vez con un token renovado; ningún token ni DTO de pedido se
persiste en el Frontend.

Dirección, horarios y descuento se cargan desde Settings antes de habilitar la
confirmación. El Backend continúa siendo la autoridad para actividad, stock,
precios, descuento y totales. La interfaz diferencia cambios de disponibilidad,
validación, CSRF, rate limiting, fallos temporales y el caso posterior al commit
en el que la confirmación no puede recuperarse. Este último bloquea el reenvío
para evitar pedidos duplicados. El carrito solo se limpia al recibir la
confirmación exitosa y el catálogo se invalida para reconciliar el stock.

La confirmación renderiza los productos e importes devueltos por la API, datos
bancarios únicamente para transferencia, enlace de comprobante, dirección,
horarios y mapa sin depender de mocks. La validación local comprobó el checkout
con Settings y catálogo reales, el descuento vigente y los errores accesibles del
formulario sin crear un pedido comercial. Frontend: 18 pruebas, lint y build
correctos. Backend: 52 pruebas, lint y build correctos.

El próximo punto de continuación es el **incremento 8.4: consulta y recuperación
pública de pedidos**. Debe incorporar `/pedido/:orderNumber`, recuperación del
último pedido mediante la Guest Session, `/recuperar-pedido`, cierre de sesión
anónima y Turnstile adaptativo, sin persistir credenciales ni datos personales.

### Incremento 8.4 completado — 2 de agosto de 2026

La confirmación dejó de depender del estado local de `CheckoutPage`. Después de
crear un pedido, el Frontend conserva únicamente `lastOrderNumber` como pista no
sensible, limpia el carrito, invalida catálogo y pedidos públicos, y navega a
`/pedido/:orderNumber`. La ruta consulta nuevamente el DTO oficial mediante
TanStack Query y Axios con credenciales; recargar o reabrir la URL conserva el
acceso mientras la Guest Session del Backend continúe vigente.

Se incorporaron `GET /api/public/orders/recent`,
`GET /api/public/orders/:orderNumber`, `POST /api/public/orders/recover` y
`DELETE /api/public/guest-session`. “Ver mi último pedido” aparece únicamente
cuando la API confirma un pedido reciente asociado al navegador. La vista de
detalle muestra estado, fecha, productos, importes, pago, retiro y datos
bancarios condicionales, y permite recuperar otro pedido u olvidar el acceso del
dispositivo sin eliminar historial comercial.

`/recuperar-pedido` utiliza React Hook Form y Zod, normaliza el número y el
celular, mantiene indistinguibles los datos incorrectos, no reintenta mutaciones
automáticamente, comunica `Retry-After` y muestra Cloudflare Turnstile solo ante
la señal adaptativa `captchaRequired`. Recuperación y revocación obtienen CSRF
sin leer ni persistir la cookie `HttpOnly`; una recuperación correcta invalida
las queries y navega al detalle autorizado.

La validación local comprobó recuperación, validación accesible, conservación de
la referencia y sesión ausente contra la API real sin crear pedidos ni registrar
intentos de recuperación inválidos. Frontend: 23 pruebas, lint y build correctos.
Backend: 52 pruebas, lint y build correctos.

El próximo punto de continuación es la **Fase 8.5: infraestructura de seguridad
administrativa**. Debe implementar solamente autenticación, sesión, perfil y
autorización del administrador; los CRUD y casos de uso administrativos
permanecen reservados para la Fase 9.

No se deben crear rutas administrativas funcionales ni CRUD antes de completar la
Fase 8.5.

La variante nueva del Hero quedó implementada de forma reversible y su decisión
final está pendiente de aprobación del cliente. No debe eliminarse la variante
anterior ni actualizarse la especificación definitiva de la Landing hasta recibir
esa confirmación; esta decisión visual no bloquea el incremento 8.1.

## Tareas

- Productos
- Categorías
- Carrito
- Checkout
- Configuración
- Pedidos
- Ruta `/pedido/:orderNumber`
- Ruta `/recuperar-pedido`
- Acción "Ver mi último pedido"
- Acción "Recuperar otro pedido"
- Acción "Olvidar pedidos de este dispositivo"
- Formulario React Hook Form + Zod con número de pedido y celular numérico
- Consultas TanStack Query con Axios y `withCredentials`
- Estados de sesión expirada, recuperación requerida, rate limiting y CAPTCHA
- `localStorage` limitado a `lastOrderNumber`, sin tokens ni datos personales

## Resultado esperado

La aplicación pública utiliza exclusivamente la API.

---

# FASE 8.5 — Infraestructura de Seguridad

## Objetivo

Implementar toda la infraestructura de autenticación y autorización antes de desarrollar el Panel Administrativo.

Esta fase corresponde exclusivamente a la sesión autenticada del administrador. La sesión anónima y de solo lectura del comprador deberá quedar implementada en las Fases 6, 7 y 8 y no utilizará Supabase Auth.

Esta fase implementará únicamente la infraestructura transversal de seguridad y
los endpoints estrictamente necesarios para autenticación, sesión y perfil del
administrador. No implementará todavía CRUD de productos, categorías, pedidos,
clientes, inventario, Settings ni Storage administrativo.

## Funcionalidades

### Frontend

- Página de Login
- Protección de rutas privadas
- Persistencia de sesión
- Cierre de sesión
- Manejo de expiración de sesión
- Redirecciones automáticas
- Estados de autenticación
- Middleware de rutas

### Backend

- Autenticación mediante Supabase Auth
- Validación de JWT
- Middleware de autenticación
- Middleware de autorización
- Protección de endpoints privados
- Manejo centralizado de errores de autenticación

### Roles

Administrador

En la Fase 8.5 se validará únicamente la identidad y el rol que habilitarán estas
capacidades; su implementación funcional corresponde a la Fase 9.

- Acceso completo al Panel Administrativo
- Gestión de productos
- Gestión de categorías
- Gestión de pedidos
- Gestión de clientes
- Configuración del negocio

Usuario Público

- Acceso únicamente a la Landing
- Catálogo
- Carrito
- Checkout
- Confirmaciones de pedidos asociados a su sesión anónima
- Recuperación segura mediante número de pedido y celular

## Seguridad

- Nunca exponer rutas administrativas sin autenticación.
- Nunca confiar en la validación del Frontend.
- Todas las rutas privadas deberán validar el JWT en el Backend.
- Las sesiones deberán persistirse de forma segura.
- El Panel Administrativo solo será accesible mediante `/admin` o `/admin/login`.

## Resultado esperado

Toda la infraestructura de autenticación y autorización implementada y validada, lista para soportar el Panel Administrativo.

## Implementación incremental completada

- [x] **8.5.1 — Contrato y dominio:** proveedor aislado de Supabase Auth, perfil administrador y errores indistinguibles.
- [x] **8.5.2 — Backend seguro:** login, sesión, renovación, logout y perfil; cookies `HttpOnly`; validación JWT, rol, Origin, CSRF y rate limiting.
- [x] **8.5.3 — Acceso administrativo:** formulario React Hook Form + Zod, Axios, TanStack Query y estados accesibles.
- [x] **8.5.4 — Ciclo de sesión:** rutas protegidas, restauración al recargar, redirección segura y cierre de sesión.
- [x] **8.5.5 — Validación transversal:** pruebas automatizadas, lint, builds y revisión de asesores de Supabase.

La Fase 8.5 no incorpora CRUD ni navegación hacia módulos de gestión. Esa superficie comienza en la Fase 9.

---

# FASE 9 — API y Panel Administrativo

## Objetivo

Construir conjuntamente los casos de uso, endpoints protegidos y pantallas del
BackOffice sobre la infraestructura de seguridad de la Fase 8.5.

## Módulos

- Dashboard
- Productos
- Categorías
- Pedidos
- Clientes
- Configuración
- Perfil

## Funcionalidades

- Routes, Controllers, Services, Repositories, DTO y schemas administrativos
- Todos los endpoints bajo `/api/admin` con autenticación y autorización obligatorias
- CRUD Productos
- Gestión y ajustes de stock
- Historial de movimientos de inventario
- CRUD Categorías
- Gestión de Pedidos
- Verificación manual de pagos
- Confirmación de retiro en el local
- Botones manuales de WhatsApp con mensajes predefinidos
- Gestión de Clientes
- Configuración del Negocio
- Gestión de dirección, horarios y ubicación de retiro
- Subida de Imágenes

## Implementación incremental

- [x] **9.1 — Dashboard administrativo de solo lectura**
  - [x] **9.1.1 — Contrato y métricas:** productos activos, productos sin stock,
    productos con stock bajo según Settings, categorías, clientes, pedidos en
    curso, pedidos retirados y ventas recientes.
  - [x] **9.1.2 — Backend protegido:** repositorio, servicio, controlador y
    `GET /api/admin/dashboard` detrás de autenticación y rol administrador.
  - [x] **9.1.3 — Pruebas backend:** autorización, contrato privado, agregaciones
    y ausencia de datos personales innecesarios.
  - [x] **9.1.4 — Interfaz:** TanStack Query, carga, error, estados vacíos y
    composición responsive para escritorio, tablet y móvil.
  - [x] **9.1.5 — Validación transversal:** consulta real en Supabase, pruebas,
    lint, builds y verificación visual responsive.
- [x] **9.2 — Gestión de Productos:** listado paginado, filtros, alta, edición,
  imágenes, activación, baja lógica, ajustes de stock e historial.
  - [x] **9.2.1 — Listado administrativo de solo lectura.**
    - [x] **9.2.1.1 — Contrato:** filtros por nombre, publicación y stock;
      orden estable y paginación acotada.
    - [x] **9.2.1.2 — Backend protegido:** repositorio, servicio, controlador y
      `GET /api/admin/products` con rol administrador y `Cache-Control: no-store`.
    - [x] **9.2.1.3 — Pruebas backend:** autenticación, validación de filtros,
      contrato privado, paginación y resolución de imágenes.
    - [x] **9.2.1.4 — Interfaz:** ruta `/admin/productos`, filtros persistidos en
      la URL, tabla responsive, estados de carga, error y vacío, y paginación.
    - [x] **9.2.1.5 — Validación transversal:** consulta real en Supabase,
      pruebas, lint, builds y revisión visual en desktop, tablet y móvil.
  - [x] **9.2.2 — Alta, edición e imágenes de productos.**
    - [x] **9.2.2.1 — Contrato y esquema:** imagen opcional sincronizada mediante
      migración, validaciones compartidas y categorías agrupadas por área.
    - [x] **9.2.2.2 — Alta:** creación protegida con slug derivado, precio y stock
      inicial validados, y movimiento inicial registrado por la base de datos.
    - [x] **9.2.2.3 — Edición:** formulario reutilizable, control de concurrencia
      optimista y actualización de datos comerciales sin modificar stock.
    - [x] **9.2.2.4 — Imágenes:** carga, reemplazo y retiro en Storage privado;
      JPG, PNG o WebP de hasta 5 MB, firma real validada y respaldo visual local.
    - [x] **9.2.2.5 — Validación:** pruebas backend y frontend, lint, builds,
      consulta real de Supabase y revisión visual responsive.
  - [x] **9.2.3 — Ajustes de stock e historial de movimientos.**
    - [x] **9.2.3.1 — Contrato y base de datos:** verificación de la RPC atómica,
      invariantes de stock, auditoría y privilegios exclusivos de `service_role`.
    - [x] **9.2.3.2 — Backend protegido:** historial paginado y ajuste manual con
      autor autenticado, motivo obligatorio, Origin, CSRF y errores de dominio.
    - [x] **9.2.3.3 — Pruebas backend:** autorización, validación, dirección del
      delta, paginación, producto inexistente y rechazo de stock negativo.
    - [x] **9.2.3.4 — Interfaz:** confirmación en dos pasos, stock proyectado,
      bloqueo ante cambios comerciales sin guardar e historial responsive.
    - [x] **9.2.3.5 — Validación:** pruebas, lint, builds y revisión visual en
      escritorio y móvil sin modificar inventario comercial.
  - [x] **9.2.4 — Activación, destacado y baja lógica.**
    - [x] **9.2.4.1 — Reglas y persistencia:** reutilización de `is_active`,
      `is_featured` y `deleted_at`, sin migraciones ni cambios de stock o imagen.
    - [x] **9.2.4.2 — Backend protegido:** endpoints dedicados, concurrencia
      optimista, validación de categoría, auditoría, Origin y CSRF.
    - [x] **9.2.4.3 — Pruebas backend:** publicación, categoría inactiva,
      destacado, baja lógica, preservación de recursos y contrato HTTP.
    - [x] **9.2.4.4 — Interfaz:** acciones rápidas accesibles, feedback seguro y
      confirmación destructiva explícita en tabla y tarjetas responsive.
    - [x] **9.2.4.5 — Validación:** pruebas, lint, builds, verificación remota de
      Supabase y revisión visual a 1440 px y 390 px sin datos comerciales.
  - [x] **9.2.5 — Validación transversal del módulo.**
    - [x] **9.2.5.1 — Contratos y seguridad:** revisión conjunta de listado,
      formulario, imágenes, inventario y ciclo de vida detrás de sesión, rol,
      Origin, CSRF y control de concurrencia.
    - [x] **9.2.5.2 — Persistencia:** verificación remota de columnas,
      restricciones, RLS, triggers, Storage privado y privilegios de la RPC de
      stock sin escribir datos comerciales.
    - [x] **9.2.5.3 — Calidad automatizada:** pruebas, lint, tipos y builds de
      Backend y Frontend, incluyendo contratos TypeScript estrictos en las
      pruebas administrativas.
    - [x] **9.2.5.4 — Acceso y responsive:** conservación de la validación visual
      1440/390 del incremento anterior y nueva comprobación del guard de acceso,
      sin errores de consola ni exposición de la pantalla sin sesión.
- [x] **9.3 — Gestión de Categorías:** listado paginado por área, alta, edición,
  imágenes, publicación, orden visual y baja lógica protegida.
  - [x] **9.3.1 — Contrato y persistencia:** reutilización de `catalog_area`,
    `display_order`, `is_active`, `deleted_at`, restricciones, triggers y Storage
    privado sin migraciones nuevas.
  - [x] **9.3.2 — Backend protegido:** listado, detalle, alta, edición y orden con
    validación estricta, concurrencia optimista, auditoría, Origin y CSRF.
  - [x] **9.3.3 — Imágenes y ciclo de vida:** carga y reemplazo de imagen,
    activación condicionada a una imagen real y baja lógica rechazada cuando
    existan productos asociados.
  - [x] **9.3.4 — Interfaz:** filtros en URL, tabla y fichas responsive, formulario
    reutilizable, acciones rápidas, estados completos y confirmación destructiva.
  - [x] **9.3.5 — Validación transversal:** pruebas, lint, tipos, builds, consulta
    remota de Supabase y revisión visual sin modificar categorías comerciales.
- [x] **9.4 — Gestión de Pedidos y verificación manual de pagos:** listado,
  detalle, flujo operativo, cancelación atómica y contacto manual con clientes.
  - [x] **9.4.1 — Contrato y persistencia:** reutilización de `orders`,
    `order_items`, `inventory_movements` y Settings, con RPC transaccionales
    reforzadas para concurrencia y reintegro sin modificar pedidos comerciales.
  - [x] **9.4.2 — Consulta administrativa:** listado paginado con búsqueda,
    filtros y orden estable, más detalle completo con snapshots históricos.
  - [x] **9.4.3 — Estados y pagos:** transiciones válidas por método, verificación
    manual de transferencia o efectivo y retiro únicamente con pago confirmado.
  - [x] **9.4.4 — Cancelación y stock:** motivo obligatorio, confirmación reforzada
    para pedidos pagados y reposición idempotente mediante RPC.
  - [x] **9.4.5 — Interfaz y contacto:** tabla/fichas responsive, detalle operativo,
    estados completos y enlaces editables de WhatsApp sin efectos automáticos.
  - [x] **9.4.6 — Validación transversal:** pruebas, lint, tipos, builds, consulta
    remota de Supabase y revisión de acceso/responsive sin mutar ventas reales.
- [x] **9.5 — Gestión de Clientes.**
  - [x] **9.5.1 — Contrato y persistencia:** reutilización de `customers` y
    `orders`, baja lógica y conservación de snapshots históricos sin migraciones.
  - [x] **9.5.2 — Backend protegido:** listado, detalle, edición y baja bajo sesión
    y rol administrador; escrituras con Origin, CSRF y concurrencia optimista.
  - [x] **9.5.3 — Consulta administrativa:** búsqueda, orden y paginación en URL,
    más detalle con historial de pedidos paginado y sin totales agregados sensibles.
  - [x] **9.5.4 — Edición y baja lógica:** formulario validado, celular normalizado,
    unicidad segura y confirmación explícita sin eliminar pedidos ni snapshots.
  - [x] **9.5.5 — Interfaz responsive:** tabla semántica, fichas móviles y estados
    de carga, vacío, error, éxito y conflicto accesibles.
  - [x] **9.5.6 — Validación transversal:** pruebas, lint, tipos, builds, consulta
    remota de Supabase y revisión de acceso/responsive sin mutar clientes reales.
- [x] **9.6 — Configuración del Negocio.**
  - [x] **9.6.1 — Contrato y persistencia:** reutilización del singleton `settings`,
    sus restricciones, `updated_at` y el bucket privado sin migraciones nuevas.
  - [x] **9.6.2 — Backend protegido:** consulta, edición, reemplazo y retiro del logo
    bajo sesión y rol administrador; escrituras con Origin, CSRF y concurrencia.
  - [x] **9.6.3 — Operación comercial:** edición validada de negocio, contacto,
    retiro, transferencia, descuento, stock bajo y redes sociales.
  - [x] **9.6.4 — Identidad visual:** vista previa, JPG/PNG/WebP de hasta 5 MB,
    Storage privado y restauración automática del logo oficial de respaldo.
  - [x] **9.6.5 — Interfaz responsive:** formulario por secciones, ubicación
    comprobable y estados de carga, error, éxito, cambios pendientes y conflicto.
  - [x] **9.6.6 — Validación transversal:** pruebas, lint, tipos, builds, consulta
    remota de Supabase y revisión de acceso/responsive sin mutar Settings reales.
- [x] **9.7 — Perfil administrativo.**
  - [x] **9.7.1 — Contrato y seguridad:** perfil privado con nombre, correo, rol y
    versiones; credenciales y tokens siempre fuera del JSON y de `localStorage`.
  - [x] **9.7.2 — Nombre completo:** edición validada con concurrencia optimista y
    actualización inmediata del encabezado y menú de cuenta.
  - [x] **9.7.3 — Correo de acceso:** contraseña actual obligatoria, confirmación
    nativa de Supabase y sincronización transaccional con `profiles` al confirmarse.
  - [x] **9.7.4 — Contraseña:** mínimo de 12 caracteres, confirmación local,
    contraseña actual y cierre global de sesiones después del cambio.
  - [x] **9.7.5 — Interfaz responsive:** ruta `/admin/perfil`, acceso desde la cuenta
    y estados accesibles de carga, error, éxito, conflicto y confirmación pendiente.
  - [x] **9.7.6 — Validación transversal:** pruebas, lint, tipos, builds, migración
    remota y revisión protegida sin utilizar ni modificar credenciales reales.

### Incremento 9.2.3 completado — 2 de agosto de 2026

Los ajustes manuales utilizan la función transaccional `adjust_product_stock` ya
existente. El Backend toma el perfil administrador desde la sesión, traduce la
operación a un delta firmado y devuelve errores seguros para producto ausente,
permisos inválidos o stock insuficiente. El historial es de solo lectura,
append-only, paginado y conserva las referencias a pedidos o administradores.

La edición de productos incorpora un flujo de revisión antes de confirmar, muestra
el stock resultante y exige un motivo. Para evitar conflictos o pérdida de datos,
el ajuste se deshabilita mientras existan cambios comerciales sin guardar. En
escritorio el historial utiliza tabla y, por debajo de 1024 px, tarjetas sin
desbordamiento horizontal.

La validación finalizó con 87 pruebas de Backend y 38 de Frontend, lint y builds
correctos en ambos proyectos. La revisión visual comprobó 1440 px y 390 px sin
errores de consola. La función, `search_path` y permisos remotos fueron verificados
sin ejecutar ajustes contra stock comercial.

### Incremento 9.2.4 completado — 2 de agosto de 2026

El listado de productos incorpora controles rápidos para publicación y destacado.
Cada escritura utiliza `updated_at` como control de concurrencia y el Backend
vuelve a validar la categoría antes de activar un producto. Activar, desactivar o
destacar no modifica stock, imagen, precio ni historial.

La eliminación es exclusivamente lógica mediante `deleted_at`. Requiere una
confirmación que identifica el producto y explica que stock, imagen e historial
de ventas se conservan para una futura restauración. No se elimina ningún objeto
de Storage ni se expone una operación de borrado físico.

La validación finalizó con 95 pruebas de Backend y 41 de Frontend, lint, tipos y
builds correctos. Supabase confirmó las columnas y privilegios existentes, por lo
que no fue necesaria una migración. La revisión visual comprobó 1440 px y 390 px,
sin desbordamiento horizontal ni errores de consola y sin alterar productos reales.

### Incremento 9.2.5 completado — 3 de agosto de 2026

La revisión transversal confirmó que todas las rutas del módulo permanecen bajo
autenticación y rol administrador, que cada escritura exige Origin y CSRF, y que
la edición comercial, las imágenes, el inventario y las acciones de ciclo de vida
aplican el control de concurrencia correspondiente sin introducir borrado físico.

Supabase confirmó en modo de solo lectura las columnas y restricciones de
`products`, RLS habilitado, los triggers de stock inicial y `updated_at`, el bucket
privado `products` limitado a 5 MB y la función `adjust_product_stock` con
`search_path` seguro y ejecución exclusiva de `service_role`. No fue necesaria
ninguna migración ni se modificaron productos, imágenes o existencias.

La validación detectó y corrigió contratos TypeScript imprecisos en los helpers de
las pruebas API: el origen administrativo ahora es una constante no opcional y
los fixtures de producto ya no dependen de accesos de arreglo potencialmente
ausentes. El cierre finalizó con 95 pruebas de Backend y 41 de Frontend, lint,
typecheck y builds correctos. El acceso local volvió a confirmar que
`/admin/productos` no expone contenido sin sesión y no produjo errores de consola.
La revisión visual 1440/390 del incremento 9.2.4 continúa vigente porque esta fase
no modificó la interfaz.

### Incremento 9.3 completado — 3 de agosto de 2026

El módulo administrativo incorpora listado paginado con filtros persistidos en la
URL, tabla semántica y fichas responsive, formulario reutilizable de alta y
edición, acciones rápidas de publicación y baja lógica con confirmación. El alta
se ejecuta en dos pasos seguros: la categoría nace inactiva, recibe la imagen y
solo entonces puede publicarse.

El Backend expone listado, detalle, alta, edición, imagen, publicación y baja bajo
sesión y rol administrador. Todas las escrituras validan Origin y CSRF; edición,
publicación y baja utilizan concurrencia optimista. Se bloquean el cambio de área
y la baja cuando existen productos asociados, y la eliminación conserva la imagen
privada.

Supabase confirmó en modo de solo lectura que `categories`, sus restricciones,
índices, triggers, RLS y el bucket privado existente cubren el incremento, por lo
que no se aplicaron migraciones ni se modificaron datos comerciales. El cierre
finalizó con 107 pruebas de Backend y 47 de Frontend, lint y builds correctos. La
ruta `/admin/categorias` redirige a login sin sesión, sin errores de consola, y el
acceso a 390 px no presenta desbordamiento horizontal.

### Incremento 9.4 completado — 3 de agosto de 2026

El Panel incorpora listado paginado con filtros recuperables en la URL, tabla y
fichas responsive y un detalle operativo con snapshots del cliente y productos,
importes, retiro, observaciones y la única acción siguiente permitida. La
verificación de transferencias y efectivo es manual y cada cambio requiere una
confirmación visible.

La cancelación utiliza un formulario con motivo obligatorio y confirmación
reforzada cuando existe un pago. El Backend ejecuta `cancel_order_with_stock`,
restaura las unidades una sola vez y conserva el pedido como historial terminal.
Los mensajes de WhatsApp son editables, se abren mediante `wa.me` y nunca modifican
el pedido ni afirman que fueron enviados.

Supabase confirmó las tablas, restricciones, índices, triggers y RLS. La migración
`202608030010_admin_order_concurrency.sql` reforzó `transition_order_status` y
`cancel_order_with_stock`: ambas validan la versión esperada bajo bloqueo de fila,
usan `search_path` seguro y sólo permiten ejecución a `service_role`; la
cancelación valida además la confirmación de reintegro dentro de la transacción.
No se alteró la venta existente. El cierre finalizó con 119 pruebas de Backend y
53 de Frontend, lint y builds correctos. El listado y el detalle no se exponen sin
sesión; a 390 px el acceso protegido no produjo desbordamiento ni errores de
consola.

### Incremento 9.5 completado — 3 de agosto de 2026

El Panel incorpora un directorio paginado con búsqueda, orden recuperable desde la
URL, tabla semántica y fichas responsive. El detalle permite editar nombre,
apellido, celular y notas, y consultar el historial paginado de pedidos mediante
sus snapshots inmutables, con acceso directo al detalle operativo de cada venta.

El Backend expone listado, detalle, edición y baja lógica bajo sesión y rol
administrador. Todas las escrituras validan Origin y CSRF; la edición y la baja
usan `updated_at` para detectar concurrencia, normalizan el celular y nunca exponen
`phone_normalized`. La baja conserva pedidos e historial; una compra posterior con
el mismo celular reactiva el registro maestro sin modificar snapshots anteriores.

Supabase confirmó en modo de solo lectura las columnas, restricciones, índices,
trigger de actualización, relaciones, RLS y permisos existentes. No fue necesaria
una migración ni se modificaron clientes o pedidos reales. El cierre finalizó con
130 pruebas de Backend y 58 de Frontend, lint, typecheck y builds correctos. Las
rutas de clientes redirigen a login sin sesión y, a 390 px, el acceso protegido no
presentó desbordamiento horizontal ni errores de consola.

### Incremento 9.6 completado — 3 de agosto de 2026

El Panel incorpora la edición centralizada del nombre del negocio, WhatsApp,
dirección, horarios, ubicación, banco, alias, CBU, descuento por transferencia,
umbral de stock bajo y redes sociales. Los datos se agrupan por contexto operativo,
la ubicación puede comprobarse antes de guardar y las mutaciones actualizan las
consultas públicas y administrativas relacionadas.

El Backend expone consulta, edición, reemplazo y retiro del logo bajo sesión y rol
administrador. Todas las escrituras validan Origin y CSRF y utilizan `updated_at`
para detectar concurrencia. El contrato privado incluye los datos bancarios
necesarios para administrar el negocio, mientras el endpoint público continúa sin
exponerlos. La auditoría omite valores personales y bancarios.

El logo acepta únicamente JPG, PNG o WebP válidos de hasta 5 MB. Se guarda bajo
`brand/` en el bucket privado `settings`, la Base de Datos conserva solo la ruta y
el Backend resuelve una URL firmada. El reemplazo limpia el archivo nuevo si la
persistencia falla y retira el anterior después del cambio; quitarlo restaura el
respaldo local oficial en Header y Footer.

Supabase confirmó en modo de solo lectura el singleton, restricciones, trigger,
RLS y bucket privado limitado a 5 MB. No fue necesaria una migración ni se
modificó la configuración real. El cierre finalizó con 142 pruebas de Backend y
62 de Frontend, lint, typecheck y builds correctos. La ruta protegida redirige a
login sin sesión y, a 390 px, no presenta desbordamiento ni errores de consola.

### Incremento 9.7 completado — 3 de agosto de 2026

El Panel incorpora `/admin/perfil` con acciones separadas para editar el nombre
visible, solicitar un cambio del correo de acceso y actualizar la contraseña. El
nombre utiliza `updated_at` para detectar ediciones concurrentes y actualiza la
sesión en caché sin recargar. Correo y contraseña requieren la contraseña actual;
ninguna credencial ni token se expone al Frontend o se persiste localmente.

El correo utiliza el flujo de confirmación de Supabase Auth. La migración
`202608030011_sync_admin_profile_email_from_auth.sql` sincroniza `profiles.email`
únicamente cuando Auth confirma el nuevo valor. El cambio de contraseña exige al
menos 12 caracteres, revoca globalmente las sesiones renovables, limpia las
cookies `HttpOnly` y exige iniciar sesión nuevamente.

El cierre finalizó con 152 pruebas de Backend y 65 de Frontend, lint, typecheck y
builds correctos. El asesor remoto no detectó problemas atribuibles a la nueva
migración; se conserva como recomendación del proyecto habilitar la protección
contra contraseñas filtradas de Supabase Auth.

El siguiente punto de continuación es **FASE 10 — Optimización**.

## Resultado esperado

API y Panel Administrativo completamente funcionales. Ninguna ruta administrativa
existirá o se montará sin la protección implementada en la Fase 8.5.

---

# FASE 10 — Optimización

## Objetivo

Optimizar el proyecto.

## Tareas

- Code Splitting
- Lazy Loading
- Optimización de imágenes
- Lighthouse
- SEO
- Accesibilidad
- Rendimiento

### Incremento 10.1 completado — línea base y presupuesto

Se midieron los bundles y la carga pública antes de optimizar. La entrada mezclaba
rutas públicas y administrativas, cargaba Framer Motion sin una necesidad vigente
y adelantaba código de formularios que la Landing no utilizaba.

### Incremento 10.2 completado — división por rutas y demanda

Layouts y páginas públicas secundarias, autenticación y toda la administración se
dividen por ruta mediante `lazy`. El carrito se importa al abrirlo y la ruta Home
inicia en paralelo la precarga de su layout y contenido crítico. Se incorporaron
fallbacks accesibles de carga y error para fallos de chunks o navegación.

### Incremento 10.3 completado — imágenes y recursos críticos

La imagen LCP se convirtió en variantes WebP responsive de 480 y 800 px, se
descubre desde el HTML inicial y mantiene dimensiones explícitas. El logo local se
redujo y convirtió a WebP; las imágenes secundarias usan lazy loading nativo,
decodificación asíncrona y prioridad baja. Se retiraron diez recursos legados sin
referencias y el CSS de secciones bajo el primer viewport utiliza
`content-visibility` cuando corresponde.

### Incremento 10.4 completado — SEO y accesibilidad

La aplicación actualiza por ruta título, descripción, canonical, Open Graph y
directivas de robots. Solo Landing, catálogo y categorías son indexables; las rutas
transaccionales y administrativas son `noindex, nofollow`. Se agregó `robots.txt`,
gestión de foco al contenido principal, contraste AA y pruebas unitarias para la
política de metadatos.

### Incremento 10.5 completado — medición y correcciones responsive

Lighthouse sobre la compilación de producción alcanzó 91 en rendimiento, 100 en
accesibilidad, 96 en buenas prácticas y 100 en SEO. La variación entre ejecuciones
simuladas dejó rendimiento entre 89 y 91, con TBT de 0–10 ms y CLS de 0.001. El
único descuento estable de buenas prácticas corresponde al `401` esperado cuando
no existe Guest Session; se conserva porque forma parte del contrato de seguridad.

La validación a 390 px detectó y corrigió que Header y Footer dependían del CSS de
la Landing en rutas secundarias. Portada, catálogo y login administrativo quedaron
sin desbordamiento horizontal, con un único `h1`, imágenes etiquetadas y metadatos
correctos.

### Incremento 10.6 completado — cierre técnico

La carga inicial ya no incluye React Hook Form ni Zod. La entrada propia se mantiene
alrededor de 14 kB sin comprimir y los estilos de Home, catálogo, checkout, carrito
y cada área administrativa se emiten en chunks independientes. El cierre pasó 152
pruebas de Backend y 68 de Frontend, lint, typecheck y builds sin errores. El
siguiente punto de continuación es **FASE 11 — Testing**.

## Resultado esperado

Lighthouse superior a 90.

---

# FASE 11 — Testing

## Objetivo

Validar todo el sistema.

## Pruebas

- Funcionales
- Responsive
- Accesibilidad
- Checkout
- Panel Administrativo
- Gestión de pedidos
- Persistencia de confirmación al cambiar de ruta, recargar y reabrir el navegador
- Aislamiento de pedidos entre sesiones anónimas
- Recuperación con datos válidos e inválidos indistinguibles
- Expiración, rotación y revocación
- Rate limiting, bloqueo temporal y CAPTCHA adaptativo
- CSRF, CORS, cookies seguras y ausencia de tokens en URLs o logs

## Resultado esperado

Proyecto estable.

---

# FASE 12 — Deploy

## Objetivo

Publicar el sistema.

## Infraestructura

Frontend

- Vercel

Backend

- Railway

Base de Datos

- Supabase

Storage

- Supabase Storage

Seguridad de sesión anónima

- HTTPS obligatorio en Frontend y Backend
- Cookies `Secure`, `HttpOnly` y configuración SameSite validada en el entorno real
- CORS limitado a los dominios definitivos
- Protección CSRF y validación de `Origin`
- Headers `Cache-Control: no-store` y `Referrer-Policy: no-referrer` en consultas de pedidos
- Rate limiting persistente o distribuido, compatible con múltiples instancias
- Tarea programada para purgar sesiones expiradas o revocadas
- Verificación de que logs, analítica y observabilidad redacten tokens, cookies, celulares y datos bancarios
- Dominios personalizados same-site para Frontend y API siempre que sea posible, por ejemplo `www.dominio.com` y `api.dominio.com`
- Si se conservan dominios cross-site de Vercel y Railway, documentar y probar `SameSite=None`, CSRF, CORS y credenciales en el entorno definitivo
- Proveedor de CAPTCHA aprobado y validación del token exclusivamente en el Backend

## Resultado esperado

Sistema en producción.

---

# FASE 13 — Mejoras Futuras

## Próximas funcionalidades

- Mercado Pago
- Cupones
- Promociones
- Wishlist
- Favoritos
- Estadísticas avanzadas
- Exportación de pedidos
- Emails automáticos
- Notificaciones
- Múltiples administradores
- Múltiples sucursales
- Integración con WhatsApp Business API

---

# Criterio de Finalización

Una fase solo podrá darse por terminada cuando:

- Cumpla el AGENTS.md
- Cumpla el DESIGN-SYSTEM.md
- Cumpla el CONVENTIONS.md
- No existan errores de TypeScript
- No existan warnings
- Sea responsive
- Sea accesible
- Esté documentada
- Sea reutilizable
- Haya sido validada funcionalmente
