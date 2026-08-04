# BACKEND-SDD.md

# Margarita Arte & Deco

## Backend Software Design Document

Versión: 1.0

---

# Objetivo

Este documento define la arquitectura oficial del Backend.

Todo desarrollo deberá respetar esta estructura.

No implementar lógica fuera de la capa correspondiente.

---

# Alcance por fase

- La Fase 7 implementa exclusivamente la API pública: catálogo, Settings público,
  creación y consulta de pedidos, sesiones anónimas, recuperación y sus controles
  de seguridad. No crea ni monta rutas `/api/admin`.
- La Fase 8.5 implementa Supabase Auth, validación JWT, autenticación, autorización
  y los endpoints estrictamente relacionados con sesión y perfil administrativo.
- La Fase 9 implementa los Routes, Controllers, Services, Repositories, DTO y
  schemas de cada caso de uso administrativo, junto con su interfaz, siempre
  detrás de los middlewares de la Fase 8.5.

No se implementarán endpoints administrativos anticipadamente para dejarlos sin
montar ni se expondrán temporalmente sin autenticación.

---

# Relación con las Reglas de Negocio

Toda la lógica implementada en el Backend deberá respetar las reglas definidas en `BUSINESS-RULES.md`.

Los Services serán los responsables de hacer cumplir dichas reglas.

Si existe un conflicto entre una decisión técnica y una regla de negocio, prevalecerá la regla de negocio.

Los Controllers, Repositories y Middlewares no deberán modificar ni reinterpretar las reglas de negocio.

---

# Tecnologías

Runtime

- Node.js

Lenguaje

- TypeScript

Framework

- Express

Base de Datos

- Supabase PostgreSQL

Autenticación

- Supabase Auth, incorporado en la Fase 8.5 para el área administrativa

Validaciones

- Zod

---

# Arquitectura

El Backend utilizará una arquitectura por capas.

```
Request

↓

Routes

↓

Middlewares

↓

Controllers

↓

Services

↓

Repositories

↓

Supabase

↓

Response
```

Cada capa tendrá una única responsabilidad.

---

# Responsabilidades

## Routes

Responsables de definir las rutas del sistema.

No contendrán lógica.

---

## Middlewares

Responsables de:

- autenticación
- autorización
- validación
- manejo de errores
- logging
- lectura segura de cookies
- validación de origen y protección CSRF
- rate limiting

Nunca acceder directamente a la Base de Datos.

---

## Controllers

Responsables de:

- recibir Requests
- validar parámetros básicos
- llamar Services
- devolver Responses

Nunca implementar reglas del negocio.

---

## Services

Toda la lógica del negocio vive aquí.

Ejemplos

- crear pedidos
- validar que los productos estén activos
- validar y actualizar stock
- aplicar descuentos
- actualizar estados
- crear, validar, rotar y revocar sesiones anónimas
- recuperar acceso público a pedidos

Los Services podrán utilizar múltiples Repositories.


---

# Business Services

Los Services representan el corazón del negocio.

Toda regla de negocio deberá implementarse dentro de un Service.

Cuando una operación involucre múltiples entidades o procesos, deberá existir un único Service responsable de coordinar toda la operación.

Los Controllers nunca deberán coordinar reglas de negocio.

Los Repositories nunca deberán conocer otras entidades.

---

## Ejemplos

Correcto

OrderService

- Crear un pedido.
- Validar el cliente.
- Validar los productos.
- Verificar que todos los productos estén activos.
- Verificar que las cantidades solicitadas no superen el stock disponible.
- Calcular subtotal.
- Aplicar descuentos.
- Calcular total.
- Crear el pedido.
- Crear los detalles del pedido.
- Descontar el stock y registrar los movimientos de inventario.
- Asociar el pedido a una sesión anónima vigente.
- Registrar la operación.

La creación del pedido, sus detalles, el descuento de stock, los movimientos de inventario y la relación Guest Session Orders deberán ejecutarse en una única transacción. Si una operación falla, ninguna modificación deberá persistirse.

El Backend deberá obtener precios, stock, actividad y descuento desde sus fuentes persistidas. Nunca aceptará totales, precios ni descuentos calculados por el cliente.

Antes de crear el pedido:

- Validar nombre, apellido y teléfono.
- Reutilizar el cliente existente por teléfono cuando corresponda.
- Validar el método de pago.
- Consolidar productos repetidos.
- Validar actividad y stock.
- Calcular subtotal, descuento y total.
- Crear snapshots del cliente y nombres de productos.

Estado inicial:

- Efectivo: pedido `pending`, pago `pending`.
- Transferencia: pedido `payment_pending`, pago `pending`.

El teléfono deberá normalizarse antes de buscar o crear el cliente.

Para enlaces manuales de WhatsApp, el número normalizado contendrá código de país y únicamente dígitos. El Backend no enviará mensajes ni integrará WhatsApp Business API en el MVP.

Las transiciones de estado permitidas serán:

- Transferencia: `payment_pending` → `paid` → `preparing` → `ready` → `picked_up`.
- Efectivo: `pending` → `preparing` → `ready` → `paid` → `picked_up`.
- Cualquier pedido no retirado podrá pasar a `cancelled`.

Los Services rechazarán saltos inválidos. Cancelar un pedido pagado requerirá confirmación administrativa y dejará el eventual reintegro de dinero registrado como gestión manual.

El Backend no aceptará métodos de entrega en el MVP. Dirección, horarios y URL de Google Maps se obtendrán desde Settings y se incluirán en la respuesta pública de configuración y en la confirmación del pedido.

Para transferencias, la respuesta de confirmación incluirá número de pedido, total final, alias, CBU y banco. Los datos bancarios no se devolverán antes de crear correctamente el pedido.

GuestSessionService

- Reutilizar una sesión anónima vigente cuando exista.
- Generar tokens con un CSPRNG y al menos 256 bits de entropía.
- Persistir únicamente el hash del token.
- Comparar hashes en tiempo constante.
- Establecer una expiración máxima de 30 días.
- Rotar la credencial después de una recuperación correcta y cuando exista riesgo de fijación de sesión.
- Revocar la sesión mediante "Olvidar pedidos de este dispositivo".
- Eliminar de forma segura las sesiones expiradas mediante una tarea de mantenimiento.

PublicOrderService

- Consultar únicamente pedidos relacionados con la Guest Session vigente.
- Devolver el último pedido asociado cuando se solicite la consulta reciente.
- Recuperar un pedido mediante coincidencia completa de `order_number` y `customer_phone_normalized`.
- Vincular de forma idempotente el pedido recuperado a la sesión vigente o a una nueva sesión.
- No modificar estados, pagos, productos, stock ni información del cliente.
- Aplicar el mismo resultado público y un tiempo de respuesta comparable cuando el pedido no exista o el celular no coincida.
- Devolver exclusivamente el DTO público de confirmación.

Una recuperación válida nunca dependerá únicamente del número de pedido.

SettingsService validará `maps_url` como URL HTTPS y no permitirá publicar una configuración sin dirección ni horarios de retiro. Resolverá `logo_path` desde el bucket privado `settings` y expondrá `logoUrl` en el DTO público; nunca expondrá la ruta interna ni persistirá una URL firmada.

Al cancelar un pedido, `OrderService` restaurará las unidades y registrará movimientos `order_cancelled`. La operación deberá ser idempotente para impedir una devolución duplicada.

Todo este flujo deberá ejecutarse desde un único Service.

---

Incorrecto

Controller

↓

ProductRepository

↓

CustomerRepository

↓

OrderRepository

↓

ProductRepository nuevamente

↓

Response

El Controller no debe coordinar el negocio.

---

## Comunicación entre Services

Un Service podrá utilizar otros Services únicamente cuando exista una justificación clara.

No crear dependencias circulares.

Siempre priorizar mantener la lógica del dominio agrupada.

---

## Responsabilidad

Cada Service deberá representar un único dominio del negocio.

Ejemplos

ProductService

- Gestión de productos.

CategoryService

- Gestión de categorías.

CustomerService

- Gestión de clientes.

OrderService

- Gestión completa del proceso de compra.
- Cálculo de importes y descuento por transferencia.
- Creación de snapshots históricos.
- Coordinación atómica del pedido y el stock.

SettingsService

- Configuración del comercio.
- Resolución del logo público a partir de `settings.logo_path`.

InventoryService

- Consulta y ajustes manuales de stock.
- Historial de movimientos de inventario.

StorageService

- Validación y subida de imágenes de productos, categorías y configuración.
- Aceptar únicamente JPG, PNG o WebP de hasta 5 MB.
- Guardar en Supabase Storage y persistir únicamente la ruta relativa del objeto.
- Almacenar el logo de marca bajo `brand/` dentro del bucket `settings` y reemplazarlo de forma controlada.

---

## Regla Final

Si una funcionalidad requiere acceder a múltiples Repositories para cumplir una única operación de negocio, la coordinación deberá realizarse dentro del Service correspondiente.

Nunca distribuir la lógica entre Controllers, Middlewares o Repositories.

---

## Repositories

Responsables únicamente del acceso a Supabase.

Nunca implementar reglas de negocio.

Nunca devolver Responses HTTP.

---

# Organización

```
src/

config/

controllers/

middlewares/

repositories/

routes/

schemas/

services/

types/

utils/
```

---

# Módulos

El Backend estará dividido en los siguientes dominios.

- Auth
- Products
- Categories
- Customers
- Orders
- Inventory
- Settings
- Guest Sessions

Categories expondrá `catalogArea` con los valores `art` o `decoration`. Los
listados públicos de categorías y productos admitirán un filtro opcional por
área. Products resolverá el área mediante su categoría y no persistirá una copia
del campo.

Los endpoints públicos iniciales de solo lectura serán:

- `GET /api/public/categories`, con filtro opcional `catalogArea`.
- `GET /api/public/products`, con filtros opcionales `catalogArea`,
  `categorySlug`, `featured`, `search`, `sort` y `limit` limitado a 100.
- `GET /api/public/settings`.

Antes de una escritura pública, el Frontend obtendrá un token mediante
`GET /api/public/csrf-token`. El Backend lo entregará en JSON y en una cookie
host-only `__Host-mad-csrf`, y exigirá su coincidencia en `X-CSRF-Token` junto
con una firma HMAC válida y un `Origin` permitido. La respuesta no se almacenará
en caché.

`POST /api/orders` aceptará `customer`, `items` y `paymentMethod` (`cash` o
`transfer`). El Backend normalizará el celular, traducirá `transfer` a
`bank_transfer` e ignorará cualquier importe calculado por el cliente. La RPC
transaccional continuará siendo la autoridad para actividad, stock, precios,
descuento, totales, snapshots e inventario.

Categories y Products expondrán `imageUrl`, nunca `image_path`. Si una ruta no
existe o Storage no puede firmarla, devolverán `imageUrl: null` para permitir el
respaldo visual local sin ocultar el resto del catálogo. Settings expondrá
`logoUrl` bajo la misma regla.

El DTO público de Settings no incluirá `transfer_alias`, `transfer_cbu`,
`bank_name`, `low_stock_threshold` ni `logo_path`. Los datos bancarios se
devolverán únicamente en la confirmación de un pedido por transferencia creado
correctamente.

Cada módulo deberá seguir la misma estructura.

```
module/

controller

service

repository

schema

types
```

---

# Flujo de una Request

Ejemplo

Crear Pedido

```
POST

↓

Route

↓

Validation Middleware

↓

Controller

↓

OrderService

↓

OrderRepository

↓

Supabase

↓

Response
```

Consultar Pedido Público

```
GET /api/public/orders/:orderNumber

↓

Cookie Middleware

↓

PublicOrderController

↓

GuestSessionService valida hash, vigencia y revocación

↓

PublicOrderService valida relación Guest Session Orders

↓

OrderRepository selecciona únicamente el DTO público

↓

Response con Cache-Control: no-store
```

Recuperar Pedido

```
POST /api/public/orders/recover

↓

Origin/CSRF Middleware

↓

Rate Limit y CAPTCHA adaptativo

↓

Schema Zod normaliza número y celular

↓

PublicOrderService valida coincidencia completa

↓

GuestSessionService crea o rota sesión y vincula el pedido

↓

Controller establece cookie segura

↓

Response pública genérica
```

---

# Validaciones

Todas las entradas deberán validarse mediante Zod.

Nunca confiar en el Frontend.

Toda validación crítica deberá repetirse en Backend.

---

# Manejo de Errores

Toda excepción deberá ser capturada.

Nunca devolver errores internos al cliente.

Formato estándar

```
{
    success: false,
    message: "...",
    error: "..."
}
```

Los errores deberán centralizarse mediante un Error Middleware.

---

# Respuestas

Formato exitoso

```
{
    success: true,
    data: {}
}
```

Formato con error

```
{
    success: false,
    message: ""
}
```

Mantener un formato consistente en toda la API.

Las respuestas públicas de confirmación utilizarán `Cache-Control: no-store` y no podrán almacenarse en caches compartidas.

El DTO público de pedido incluirá únicamente:

- `orderNumber`
- `createdAt`
- `status`
- `paymentMethod`
- snapshots públicos de productos, cantidades e importes
- subtotal, descuento y total
- dirección, horarios y URL de Google Maps
- banco, alias y CBU únicamente cuando corresponda a transferencia
- URL preparada para enviar manualmente el comprobante

No incluirá IDs internos, teléfono completo, observaciones privadas, auditoría, movimientos de inventario, notas administrativas ni datos de otros pedidos.

---

# Seguridad

El Backend nunca confiará en información enviada por el cliente.

Toda operación privada requerirá autenticación.

Los JWT serán validados mediante Supabase Auth.

Nunca exponer credenciales.

Nunca exponer información sensible.

Las sesiones anónimas serán credenciales de capacidad, de solo lectura y con alcance limitado a pedidos relacionados explícitamente.

El token anónimo:

- se generará mediante un CSPRNG con al menos 256 bits de entropía
- se enviará únicamente en una cookie `HttpOnly`, `Secure` y `SameSite=Lax`
- no se devolverá en JSON
- no se incluirá en parámetros de ruta, query strings, URLs de WhatsApp ni redirecciones
- se almacenará en la Base de Datos únicamente como hash
- expirará como máximo a los 30 días

La cookie utilizará el prefijo `__Host-`, un nombre sin información personal, `Path=/`, no definirá `Domain` y tendrá una vida igual o menor a la sesión persistida. El Backend deberá limpiarla cuando la sesión expire o sea revocada.

Las rutas que crean, recuperan, rotan o revocan una sesión validarán `Origin` y, cuando corresponda, un token CSRF. CORS aceptará únicamente orígenes explícitos y credenciales; nunca combinará credenciales con `Access-Control-Allow-Origin: *`.

Si Frontend y API no son same-site y se requiere `SameSite=None`, la excepción deberá documentarse antes del despliegue y será obligatorio utilizar `Secure`, protección CSRF y validación estricta de origen.

Las respuestas usarán `Referrer-Policy: no-referrer` en superficies de consulta de pedidos.

La recuperación aplicará por defecto:

- CAPTCHA adaptativo después de 3 intentos fallidos o señales equivalentes de abuso
- máximo de 5 intentos fallidos cada 15 minutos por IP
- máximo de 5 intentos fallidos cada 15 minutos por huella combinada de pedido y celular
- bloqueo temporal mínimo de 30 minutos al superar el límite

Los umbrales podrán configurarse sin desplegar código, pero nunca deshabilitarse en producción. Las huellas para rate limiting se derivarán mediante HMAC y no almacenarán el celular ni el número de pedido en texto plano.

El proveedor aprobado es Cloudflare Turnstile. Su token se verificará siempre en
el Backend mediante Siteverify, tendrá uso único, deberá corresponder a la acción
`order_recovery` y a un hostname permitido, y no sustituirá el rate limiting.

El incremento 7.3 implementa los límites persistentes, las huellas HMAC, la
señal `captchaRequired`, el bloqueo temporal, la validación Turnstile fail-closed,
la rotación atómica y la purga programada. Una indisponibilidad de Cloudflare
rechazará temporalmente la recuperación sin sumar un fallo al comprador.

El mensaje de recuperación fallida será siempre genérico y no revelará si existe el pedido, si el celular coincide o si una sesión previa estuvo asociada.

---

# Autorización

El sistema contará con dos tipos de acceso.

## Público

- Catálogo
- Productos
- Categorías
- Checkout
- Creación de pedidos
- Consulta de pedidos asociados a una sesión anónima
- Recuperación de un pedido mediante número y celular
- Revocación de la sesión anónima del dispositivo

Las rutas públicas de pedidos serán:

- `POST /api/orders`
- `GET /api/public/orders/recent`
- `GET /api/public/orders/:orderNumber`
- `POST /api/public/orders/recover`
- `DELETE /api/public/guest-session`

`GET /api/public/orders/recent` y `GET /api/public/orders/:orderNumber` requerirán una Guest Session vigente. La recuperación y revocación serán idempotentes cuando corresponda.

## Administrador

- Dashboard
- Productos
- Categorías
- Pedidos
- Clientes
- Configuración

Todo endpoint administrativo deberá validar autenticación.

Las rutas estrictamente relacionadas con autenticación, sesión y perfil se
incorporarán en la Fase 8.5. Los demás endpoints `/api/admin` se implementarán en
la Fase 9 junto con su caso de uso y nunca existirán públicamente antes de contar
con autenticación y autorización activas.

La Fase 8.5 expone únicamente:

- `GET /api/admin/auth/csrf-token`
- `POST /api/admin/auth/login`
- `GET /api/admin/auth/session`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/profile`

El incremento 9.1 incorpora:

- `GET /api/admin/dashboard`

Este endpoint es de solo lectura, utiliza `Cache-Control: no-store` y exige una
sesión administrativa activa. Cuenta productos activos, categorías y clientes no
eliminados, pedidos operativos y pedidos retirados. El stock bajo se calcula con
`settings.low_stock_threshold`; las ventas recientes excluyen pedidos cancelados
y no exponen celulares, notas ni IDs internos de clientes.

El incremento 9.2.1 incorpora:

- `GET /api/admin/products`

Es un endpoint privado de solo lectura con `Cache-Control: no-store`. Acepta
`page`, `pageSize`, `search`, `publication`, `stock` y `sort`; rechaza parámetros
desconocidos o inválidos. Excluye productos y categorías eliminados lógicamente,
selecciona solo las columnas necesarias y devuelve categoría, área del catálogo,
precio, stock, estado de stock, publicación, destacado, fecha de actualización y
URL firmada de imagen. El estado de stock bajo utiliza
`settings.low_stock_threshold`. La paginación por rango queda limitada a 50 filas
por página y usa el ID como segundo criterio para conservar un orden estable.

El incremento 9.2.2 incorpora:

- `GET /api/admin/products/:productId`
- `POST /api/admin/products`
- `PUT /api/admin/products/:productId`
- `PUT /api/admin/products/:productId/image`
- `DELETE /api/admin/products/:productId/image`

El alta y la edición validan el contrato en el Backend y derivan el slug desde el
nombre. La edición utiliza `updated_at` como control de concurrencia optimista y
no modifica stock. La imagen es opcional; sus operaciones aceptan JPG, PNG o WebP
de hasta 5 MB con firma de archivo validada y Storage privado.

El incremento 9.2.3 incorpora:

- `GET /api/admin/products/:productId/inventory`
- `POST /api/admin/products/:productId/inventory-adjustments`

La consulta devuelve el stock vigente y movimientos paginados con tipo, delta,
stock anterior y posterior, motivo, fecha y referencia administrativa o de pedido.
Excluye productos eliminados y utiliza fecha e ID descendentes como orden estable.

El ajuste acepta exclusivamente `direction=increase|decrease`, una cantidad entera
positiva y un motivo entre 3 y 500 caracteres. La identidad del autor procede de
la sesión administrativa, nunca del body. La escritura exige `Origin` y CSRF
válidos y ejecuta `adjust_product_stock`: la función bloquea la fila del producto,
impide stock negativo y registra el movimiento y la auditoría dentro de la misma
transacción. Los movimientos son append-only y no se exponen endpoints para
editarlos o eliminarlos.

El incremento 9.2.4 incorpora:

- `PATCH /api/admin/products/:productId/publication`
- `PATCH /api/admin/products/:productId/featured`
- `DELETE /api/admin/products/:productId`

Publicación y destacado reciben el valor objetivo junto con `expectedUpdatedAt`.
La activación vuelve a validar que la categoría exista y esté activa. Las tres
operaciones requieren sesión administrativa, rol, `Origin` permitido y token
CSRF; el autor siempre se obtiene de la sesión y cada cambio queda registrado en
el log estructurado del Backend.

La baja actualiza únicamente `products.deleted_at` con concurrencia optimista.
No elimina la fila, no modifica el stock ni el estado de publicación, y no retira
la imagen de Storage. Los repositorios continúan excluyendo productos dados de
baja mediante `deleted_at is null`.

El incremento 9.3 incorpora:

- `GET /api/admin/categories`
- `GET /api/admin/categories/:categoryId`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/:categoryId`
- `PUT /api/admin/categories/:categoryId/image`
- `PATCH /api/admin/categories/:categoryId/publication`
- `DELETE /api/admin/categories/:categoryId`

El listado privado acepta área, búsqueda, publicación, orden y paginación de hasta
50 filas. Devuelve el total de productos asociados y una URL firmada para la
imagen privada, sin exponer `image_path`. El alta genera el slug en el Backend y
siempre crea la categoría inactiva; la interfaz carga la imagen antes de solicitar
su publicación.

La edición y las acciones de ciclo de vida utilizan `updated_at` como control de
concurrencia optimista. Una categoría solo puede activarse cuando posee una imagen
real, no puede cambiar de área ni darse de baja si tiene productos asociados, y su
orden visual se mantiene mediante `display_order` dentro del área. La baja es
exclusivamente lógica y preserva la imagen de Storage. Todas las escrituras exigen
sesión administrativa, rol, `Origin` permitido y CSRF.

El incremento 9.4 incorpora:

- `GET /api/admin/orders`
- `GET /api/admin/orders/:orderId`
- `POST /api/admin/orders/:orderId/actions`
- `POST /api/admin/orders/:orderId/cancellation`

El listado administrativo acepta búsqueda, estado del pedido, método, estado de
pago, orden y paginación de hasta 50 filas. El detalle devuelve snapshots del
cliente y productos, importes, retiro y configuración operativa necesaria para
los mensajes manuales; no expone IDs internos de clientes ni datos bancarios.

Las acciones reciben una intención semántica y `expectedUpdatedAt`. El Service
consulta el pedido vigente, valida concurrencia y deriva la única combinación de
estado y pago permitida para efectivo o transferencia. La persistencia se ejecuta
mediante `transition_order_status`, que bloquea la fila y vuelve a validar
`expectedUpdatedAt` dentro de la transacción; su trigger valida nuevamente la
transición.

La cancelación exige motivo. Cuando el pago está confirmado también exige aceptar
que el reintegro monetario se gestiona manualmente. `cancel_order_with_stock`
bloquea el pedido y sus productos, comprueba atómicamente `expectedUpdatedAt` y la
confirmación de reintegro, restaura las unidades una sola vez, registra movimientos
y auditoría y deja el pedido en estado terminal. Ningún endpoint elimina pedidos.
Todas las escrituras requieren sesión administrativa, rol, `Origin` permitido y
CSRF.

El incremento 9.5 incorpora:

- `GET /api/admin/customers`
- `GET /api/admin/customers/:customerId`
- `PUT /api/admin/customers/:customerId`
- `DELETE /api/admin/customers/:customerId`

El listado privado acepta búsqueda, orden y paginación de hasta 50 filas, excluye
clientes dados de baja y devuelve el conteo de pedidos sin calcular gasto acumulado.
El detalle devuelve el registro maestro y un historial paginado de resúmenes de
pedido; nunca expone `phone_normalized` ni altera los snapshots históricos.

La edición valida y normaliza el celular, preserva su unicidad y utiliza
`expectedUpdatedAt` para concurrencia optimista. La eliminación es exclusivamente
lógica mediante `deleted_at`, exige la misma versión esperada y conserva todas las
relaciones. El alta de un pedido con el mismo celular puede reactivar el registro
maestro. Ambas escrituras requieren sesión administrativa, rol, `Origin` permitido
y CSRF, y la auditoría estructurada omite datos personales.

El incremento 9.6 incorpora:

- `GET /api/admin/settings`
- `PUT /api/admin/settings`
- `PUT /api/admin/settings/logo`
- `DELETE /api/admin/settings/logo`

La consulta devuelve el singleton completo para uso administrativo, incluida la
configuración bancaria, pero expone `logoUrl` firmada y nunca `logo_path`. El DTO
público general continúa sin incluir alias, CBU ni banco. La edición normaliza
WhatsApp y CBU, exige URLs HTTPS, valida descuento y umbral de stock y utiliza
`expectedUpdatedAt` para concurrencia optimista.

El logo acepta únicamente JPG, PNG o WebP con firma válida y hasta 5 MB. El
Backend carga un objeto nuevo bajo `brand/`, persiste su ruta con la versión
esperada y solo entonces retira el anterior. Ante un conflicto limpia el objeto
nuevo; al quitar el logo persiste NULL y habilita el respaldo oficial. Todas las
escrituras exigen sesión administrativa, rol, `Origin` permitido y CSRF, y los
logs de auditoría omiten datos bancarios y de contacto.

El incremento 9.7 incorpora:

- `GET /api/admin/profile`
- `PUT /api/admin/profile/name`
- `PUT /api/admin/profile/email`
- `PUT /api/admin/profile/password`

La consulta privada devuelve nombre, correo, rol y marcas de creación y
actualización, pero omite ID interno y estado de autorización. El nombre utiliza
`expectedUpdatedAt` para concurrencia optimista. Correo y contraseña requieren la
contraseña actual y una sesión completa en cookies; todos los `PUT` validan rol,
Origin y CSRF.

El cambio de correo utiliza `auth.updateUser` y puede quedar pendiente de
confirmación. `profiles.email` solo se sincroniza mediante el trigger de Auth
cuando el nuevo correo queda confirmado. El cambio de contraseña revoca las
sesiones globales de Supabase y limpia ambas cookies administrativas.

Los tokens de acceso y renovación permanecen exclusivamente en cookies host-only
`__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax` y `Path=/`; nunca forman parte del
JSON. El Backend valida el access token contra Supabase Auth, utiliza el refresh
token solo para renovar una sesión vencida y consulta `profiles` en cada
autenticación para comprobar que el único rol `administrator` continúa activo.
Los metadatos editables del usuario de Auth no conceden autorización.

---

# Soft Delete

Las siguientes entidades utilizarán eliminación lógica.

- Categories
- Products
- Customers

La eliminación consistirá en establecer:

```
deleted_at
```

Nunca eliminar físicamente desde la aplicación.

---

# Base de Datos

Todo acceso a datos deberá realizarse mediante Repositories.

Nunca acceder directamente a Supabase desde Controllers o Services.

---

# Storage

Las imágenes serán almacenadas en Supabase Storage.

La Base de Datos almacenará únicamente rutas relativas de objetos.

El Backend generará URLs firmadas por lote y mantendrá una caché acotada en
memoria hasta poco antes de su vencimiento. No generará una firma por producto
ni persistirá URLs temporales. Los fallos de firma se cachearán como máximo 60
segundos para permitir recuperación rápida cuando se cargue o corrija un objeto.

---

# Logging

Registrar:

- errores
- excepciones
- operaciones críticas

Nunca registrar:

- contraseñas
- tokens
- información sensible
- cookies
- cuerpos completos de recuperación
- celulares, CBU o alias en texto plano

Los eventos de seguridad registrarán únicamente identificadores internos, resultado, timestamp y huellas no reversibles necesarias para detectar abuso.

---

# Performance

Aplicar paginación en consultas administrativas.

Seleccionar únicamente las columnas necesarias.

Evitar consultas duplicadas.

Evitar lógica repetida.

Las actualizaciones de stock deberán ser atómicas para impedir sobreventas producidas por pedidos concurrentes.

Las consultas públicas de pedidos seleccionarán únicamente las columnas del DTO permitido y validarán primero la relación Guest Session Orders.

Las sesiones expiradas o revocadas y sus relaciones se purgarán mediante una tarea periódica. La limpieza nunca eliminará Orders.

---

# Convenciones

Controllers

```
products.controller.ts
```

Services

```
products.service.ts
```

Repositories

```
products.repository.ts
```

Schemas

```
products.schema.ts
```

Routes

```
products.routes.ts
```

---

# Principios

Todo desarrollo deberá respetar:

- Single Responsibility Principle
- Separation of Concerns
- DRY
- KISS
- Clean Code

---

# Flujo de Desarrollo

Toda nueva funcionalidad deberá seguir el siguiente orden.

1. Definir tipos.
2. Crear Schema Zod.
3. Crear Repository.
4. Crear Service.
5. Crear Controller.
6. Crear Routes.
7. Integrar.
8. Probar casos funcionales, autorización, enumeración, rate limiting, expiración, rotación y revocación.

---

# Definition of Done

Una funcionalidad del Backend solo estará finalizada cuando:

- Respete este documento.
- Respete DATABASE-SDD.
- Todas las entradas estén validadas.
- Exista separación correcta de responsabilidades.
- No existan reglas de negocio fuera de Services.
- No existan accesos directos a Supabase fuera de Repositories.
- Utilice Soft Delete cuando corresponda.
- Mantenga un formato consistente de respuestas.
- No exponga pedidos sin validar la sesión anónima o una recuperación completa.
- Incluya pruebas de aislamiento entre sesiones, expiración, revocación, CSRF, CORS y rate limiting.
- Esté documentada.
- Cumple todas las reglas definidas en BUSINESS-RULES.md.
