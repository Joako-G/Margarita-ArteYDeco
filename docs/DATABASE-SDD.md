# DATABASE-SDD.md

# Margarita Arte & Deco

## Database Software Design Document

Versión: 1.0

---

# Objetivo

Este documento define la arquitectura oficial de la Base de Datos del proyecto.

Toda modificación de la base de datos deberá respetar este documento.

No crear tablas nuevas sin justificar su necesidad.

No modificar relaciones sin actualizar este documento.

---

# Relación con las Reglas de Negocio

La estructura de la Base de Datos deberá soportar todas las reglas definidas en `BUSINESS-RULES.md`.

Las restricciones, relaciones, claves foráneas y políticas de integridad deberán diseñarse para garantizar el cumplimiento de dichas reglas.

La Base de Datos no deberá permitir estados inconsistentes que contradigan las reglas del negocio.

---

# Motor de Base de Datos

Base de Datos

- PostgreSQL

Proveedor

- Supabase

ORM

- Ninguno

El Backend accederá directamente mediante el SDK oficial de Supabase.

---

# Principios

La Base de Datos deberá cumplir los siguientes principios:

- Normalización hasta donde resulte práctica.
- Evitar duplicación de datos.
- Integridad referencial.
- Restricciones mediante Foreign Keys.
- Validaciones críticas realizadas en Backend.
- RLS únicamente para proteger información sensible.
- Soft Delete cuando corresponda.

---

# Modelo del Dominio

El sistema estará compuesto por los siguientes dominios.

## Seguridad

- Profiles
- Guest Sessions
- Audit Logs

---

## Catálogo

- Categories
- Products
- Inventory Movements

---

## Clientes

- Customers

---

## Ventas

- Orders
- Order Items
- Guest Session Orders

---

## Configuración

- Settings

---

# Relaciones Generales

```
Category

│

└── Product

        │

        └── Order Item

                 │

                 └── Order

                           │

                           └── Customer
```

Cada Product tendrá muchos Inventory Movements. Un movimiento podrá relacionarse con un Order cuando se origine por una compra o cancelación.

Cada Guest Session podrá consultar muchos Orders mediante Guest Session Orders. Un Order podrá vincularse a más de una Guest Session cuando el cliente lo recupere desde otro navegador, sin transferir ni eliminar accesos válidos anteriores.

---

# Entidades

## Profiles

Responsabilidad

Administrar los usuarios autenticados del sistema.

Un usuario podrá administrar completamente el comercio.

Campos mínimos

- id
- email
- full_name
- role
- is_active
- created_at
- updated_at

`profiles.id` referencia a `auth.users.id`. El correo de `profiles` es una copia
operativa del correo confirmado en Supabase Auth: el trigger
`auth_user_email_sync_profile` lo actualiza después de un cambio confirmado en
`auth.users.email`. La función asociada fija un `search_path` vacío y no concede
ejecución a `public`, `anon` ni `authenticated`.

---

## Guest Sessions

Responsabilidad

Representar una sesión anónima y de solo lectura para consultar pedidos sin crear una cuenta.

Campos mínimos

- id
- token_hash
- expires_at
- revoked_at, nullable
- last_accessed_at, nullable
- created_at
- updated_at

Relaciones

Posee muchas relaciones Guest Session Orders.

`token_hash` deberá ser único. El token original nunca se almacenará. `expires_at` deberá ser posterior a `created_at`.

Una sesión estará vigente únicamente cuando `revoked_at IS NULL` y `expires_at > NOW()`.

Las sesiones anónimas no estarán relacionadas con Profiles, Supabase Auth ni roles administrativos.

---

## Public Recovery Attempts

Responsabilidad

Persistir límites antiabuso compartidos entre instancias del Backend sin guardar
IP, celular ni número de pedido en texto plano.

Campos mínimos

- id
- scope (`ip` o `order_phone`)
- fingerprint
- window_started_at
- failed_count
- blocked_until, nullable
- created_at
- updated_at

`fingerprint` contendrá exclusivamente una huella HMAC-SHA-256 de 32 bytes. La
combinación `scope + fingerprint` será única. La tabla tendrá RLS sin políticas
públicas y sus privilegios directos permanecerán revocados; solo podrá operarse
mediante funciones autorizadas al rol de servidor.

---

## Categories

Responsabilidad

Agrupar productos.

Campos mínimos

- id
- catalog_area
- name
- slug
- image_path
- description
- display_order
- is_active
- created_at
- updated_at

Relaciones

Una Categoría posee muchos Productos.

`slug` deberá ser único. `display_order` será un entero mayor o igual a 0.

`catalog_area` será obligatorio y admitirá únicamente `art` o `decoration`.
El orden público se resolverá por `catalog_area`, `display_order` y `name`.
Products no duplicará este campo: su área se resolverá mediante `category_id`.

---

## Products

Responsabilidad

Representar cada producto publicado.

Campos mínimos

- id
- category_id
- name
- slug
- description
- price
- discount_percentage
- sale_price
- stock_quantity
- image_path
- is_featured
- is_active
- created_at
- updated_at

Relaciones

Pertenece a una Categoría.

Puede aparecer en muchos Pedidos.

`is_active` determina si el producto se publica. `stock_quantity` determina cuántas unidades pueden venderse y deberá tener un constraint `CHECK (stock_quantity >= 0)`.

`stock_quantity` será un entero, obligatorio y con valor predeterminado `0`.

`price` será el precio de lista. `discount_percentage` será `numeric(5,2)`,
obligatorio, tendrá valor predeterminado `0` y deberá ser mayor o igual a `0` y
menor que `100`. `sale_price` será una columna generada y almacenada, redondeada a
dos decimales, siempre mayor a cero y nunca superior al precio de lista.

`slug` deberá ser único.

`image_path` será nullable. Cuando exista, almacenará únicamente la ruta relativa
del objeto dentro del bucket privado correspondiente. La API será responsable de
resolver una URL firmada o de servir el archivo; nunca se persistirán URLs firmadas
con vencimiento. Un valor `NULL` indica que el Frontend debe utilizar su imagen de
respaldo.

---

## Inventory Movements

Responsabilidad

Registrar de forma auditable todo cambio de stock y evitar restauraciones duplicadas.

Campos mínimos

- id
- product_id
- order_id, nullable
- withdrawal_request_id, nullable
- movement_type
- quantity_delta
- stock_before
- stock_after
- reason, nullable
- created_by, nullable
- created_at

Tipos permitidos

- initial_stock
- manual_adjustment
- order_created
- order_cancelled
- consumer_withdrawal_return

Los movimientos `order_created` y `order_cancelled` deberán ser únicos por pedido y producto. `quantity_delta` será negativo al descontar y positivo al reponer.
Los movimientos `consumer_withdrawal_return` serán positivos, estarán relacionados
con pedido y solicitud, y serán únicos por solicitud y producto.

Inventory Movements no utilizará Soft Delete ni permitirá edición o eliminación desde la aplicación.

---

## Customers

Responsabilidad

Representar compradores.

Campos mínimos

- id
- first_name
- last_name
- phone
- phone_normalized
- notes
- deleted_at, nullable
- created_at
- updated_at

Relaciones

Un Cliente posee muchos Pedidos.

`phone_normalized` deberá ser único y se utilizará para encontrar y reutilizar clientes.

La baja administrativa establecerá `deleted_at` sin eliminar pedidos. La creación
de un pedido con el mismo `phone_normalized` podrá reactivar el registro maestro.
Los datos históricos permanecerán en los snapshots de Orders y nunca se
reescribirán al editar o reactivar un Customer.

---

## Orders

Responsabilidad

Representar una compra.

Campos mínimos

- id
- customer_id
- customer_first_name
- customer_last_name
- customer_phone
- customer_phone_normalized
- order_number
- status
- subtotal
- discount
- total
- payment_method
- payment_status
- picked_up_at, nullable
- notes
- created_at
- updated_at

Relaciones

Pertenece a un Cliente.

Posee muchos Order Items.

Posee muchas relaciones Guest Session Orders.

---

## Guest Session Orders

Responsabilidad

Relacionar de forma explícita las sesiones anónimas con los pedidos que pueden consultar.

Campos mínimos

- id
- guest_session_id
- order_id
- created_at
- updated_at

Relaciones

Pertenece a una Guest Session.

Pertenece a un Order.

La combinación `guest_session_id + order_id` deberá ser única.

La eliminación autorizada de una Guest Session eliminará sus relaciones mediante `ON DELETE CASCADE`, pero nunca eliminará el Order. La relación hacia Orders utilizará `ON DELETE RESTRICT`.

---

## Order Items

Responsabilidad

Representar los productos comprados.

Campos mínimos

- id
- order_id
- product_id
- product_name
- quantity
- list_unit_price
- product_discount_percentage
- unit_price
- subtotal

Relaciones

Pertenece a un Pedido.

Pertenece a un Producto.

Los campos `customer_first_name`, `customer_last_name`, `customer_phone`,
`customer_phone_normalized`, `product_name`, `list_unit_price`,
`product_discount_percentage` y `unit_price` son snapshots históricos. No deberán
cambiar cuando posteriormente se editen el cliente o el producto. `unit_price`
será el precio de oferta efectivamente cobrado y `subtotal` conservará la regla
`unit_price × quantity`.

---

## Settings

Responsabilidad

Configuración global del negocio.

Campos mínimos

- id
- business_name
- logo_path, nullable
- whatsapp
- address
- maps_url
- business_hours
- transfer_alias
- transfer_cbu
- bank_name
- transfer_discount
- low_stock_threshold
- instagram
- facebook
- tiktok
- created_at
- updated_at

Existirá únicamente un registro.

Las actualizaciones administrativas usarán `updated_at` como versión de
concurrencia y nunca crearán un segundo registro. Los cambios de descuento, datos
de transferencia o retiro afectarán operaciones futuras y no reescribirán Orders.

`transfer_discount` deberá estar entre 0 y 100. `low_stock_threshold` deberá ser un entero mayor o igual a 0.

`maps_url` deberá ser una URL HTTPS válida. `instagram`, `facebook` y `tiktok`
serán URLs HTTPS opcionales. `business_hours` será texto administrable para
mostrar los horarios vigentes del local.

`logo_path` almacenará únicamente la ruta relativa del objeto dentro del bucket
privado `settings`; nunca almacenará una URL pública ni una URL firmada. Será
nullable para permitir que la aplicación utilice el logo local oficial como
respaldo hasta que el administrador publique uno.

Al reemplazar el logo se persistirá primero una ruta nueva bajo `brand/` y se
retirará el objeto anterior después de confirmar la actualización. Al quitarlo,
`logo_path` volverá a NULL para activar el respaldo oficial del Frontend.

---

## Audit Logs

Responsabilidad

Conservar un registro append-only de operaciones administrativas y eventos
críticos que no pertenecen al historial de inventario.

Campos mínimos

- id
- actor_profile_id, nullable
- action
- entity_type
- entity_id, nullable
- metadata
- created_at

Los registros no podrán editarse ni eliminarse desde la aplicación. `metadata`
será un objeto JSON mínimo y nunca contendrá tokens, cookies, celulares, datos
bancarios, contraseñas ni otros secretos.

---

# Arrepentimientos

El modelo detallado se encuentra en `BOTON-ARREPENTIMIENTO-SDD.md`. La migración
será aditiva y no modificará pedidos históricos.

## Consumer Withdrawal Requests

`consumer_withdrawal_requests` representará el expediente vigente:

- UUID y relación opcional `order_id` con `ON DELETE RESTRICT`;
- hash, sufijo y versión de clave del código público, sin almacenar el original;
- referencia de pedido opcional y alternativa explícita cuando no se encuentra;
- celular normalizado y fingerprint HMAC para identificación y antiabuso;
- `request_status`, `return_status` y `refund_status` independientes;
- `version` bigint para concurrencia optimista;
- comentario, fundamento, origen y fechas operativas;
- estimación de plazo con estado, base y fecha nullable, nunca rechazo automático;
- snapshots nullable de `contract_concluded_at`, `right_informed_at` y versión
  del aviso, para no confundir creación del pedido con celebración del contrato;
- timestamps de presentación, constancia, revisión, recepción, inspección,
  determinación de aplicabilidad y cierre.

`request_status` admitirá `received`, `verification_pending`, `under_review`,
`applicable`, `not_applicable` y `closed`. `return_status` admitirá `not_required`,
`pending`, `received` e `inspected`. `refund_status` admitirá `not_required`,
`pending`, `processing`, `succeeded`, `failed` y `manual_review`.

## Consumer Withdrawal Return Items

`consumer_withdrawal_return_items` conservará de forma append-only la resolución
de inventario por ítem del pedido: solicitud, ítem, producto, cantidad vendida,
cantidad apta, cantidad no apta, nota, actor y fecha. Aptas más no aptas deberá
coincidir exactamente con la cantidad vendida. Existirá una sola resolución por
solicitud e ítem y una sola reposición por solicitud y producto.

## Consumer Withdrawal Events

`consumer_withdrawal_events` será append-only y conservará solicitud, actor
nullable, tipo, estados anterior/siguiente, razón saneada, metadata mínima y
fecha. No admitirá `UPDATE` ni `DELETE` desde la aplicación.

## Consumer Withdrawal Settlements

`consumer_withdrawal_settlements` representará una única obligación económica
completa por solicitud en el primer incremento. Conservará pedido, moneda `ARS`,
total y monto capturado como snapshots, devolución contractual completa, costo
original de entrega, costo de devolución, total,
método manual, estado, referencia no sensible, actor y fechas. El total no podrá
superar el importe capturado más los gastos reintegrables documentados.

`consumer_withdrawal_settlement_corrections` conservará de forma append-only
cada rectificación administrativa de una liquidación completada: liquidación y
solicitud, gasto de devolución anterior y corregido, totales anterior y
corregido, motivo, actor y fecha. La liquidación mantendrá el valor vigente para
la operación, mientras la corrección y el evento preservarán la evidencia previa.

Una futura operación técnica de Mercado Pago pertenecerá al módulo de pagos y se
relacionará opcionalmente con la liquidación. Conservará proveedor, identificadores,
importe, moneda, clave de idempotencia, estado, intentos y datos mínimos de
conciliación; no reescribirá la liquidación ni `orders.payment_status`.
`MP-CHECKOUT-PRO-SDD.md` desarrolla este contrato sin autorizar todavía una
migración. Las tablas del proveedor deberán quedar fuera del acceso directo del
Frontend, con RLS habilitado, grants públicos revocados y funciones
`SECURITY INVOKER` por defecto.
El futuro intento de pago conservará `reservation_expires_at`, calculado
atómicamente como 40 minutos desde la creación del pedido, y el estado específico
del proveedor. El proceso de vencimiento deberá bloquear el pedido, conciliar
`pending`/`in_process` y restaurar stock una sola vez únicamente después de
descartar un cobro aprobable o capturado.

## Idempotencia y antiabuso

Una tabla específica almacenará únicamente hashes de claves de idempotencia,
fingerprint canónico, solicitud asociada, versión de secreto y expiración. El
código público se derivará con HMAC-SHA-256 y al menos 128 bits efectivos para
permitir reintentos sin persistirlo en texto plano.

Las mutaciones administrativas utilizarán una tabla de idempotencia separada con
hash de clave, fingerprint del payload, solicitud, operación, versión resultante
y expiración. La comprobación, la mutación y el registro de la clave ocurrirán en
la misma RPC para impedir efectos duplicados o claves huérfanas.

Los límites públicos usarán una tabla independiente con fingerprints HMAC de IP y
contacto, ventanas, conteos, bloqueos y retención corta. Su purga nunca alcanzará
solicitudes, liquidaciones o eventos.

## Restricciones e índices de arrepentimientos

- XOR entre número informado y alternativa `No encuentro mi número de pedido`;
- hashes de longitud exacta, importes no negativos y sumas consistentes;
- checks de fechas y guards de transición en RPC;
- unicidad de código e idempotencia;
- índices por estado/fecha, vencimientos operativos, pedido y fingerprint;
- ninguna eliminación física ni propagación desde pedidos;
- RLS habilitado y grants/revokes explícitos, sin acceso para `anon` o
  `authenticated` y con acceso mínimo para `service_role`.

---

# Convenciones

## IDs

Todas las tablas utilizarán UUID.

Nunca IDs autoincrementales.

---

## Fechas

Toda tabla deberá contener:

- created_at
- updated_at

Cuando corresponda:

- deleted_at

---

## Slugs

Las entidades públicas utilizarán Slugs.

Ejemplo

```
/categoria/moldes-silicona

/producto/molde-flores
```

---

# Estados

## Productos

- active
- inactive

La disponibilidad de compra no constituye un estado adicional: se calcula con `is_active = true` y `stock_quantity > 0`.

---

## Pedidos

- pending
- confirmed
- preparing
- ready
- picked_up
- delivered
- cancelled

---

## Pagos

- pending
- paid
- rejected

## Métodos de Pago

- cash
- bank_transfer

Todos los pedidos se crearán como `pending` con pago `pending`, independientemente del método. `payment_status` es independiente de `order_status`.

`picked_up_at` deberá permanecer NULL hasta que el pedido cambie a `picked_up`; en esa transición se registrará la fecha y hora.

---

# Integridad

Una Categoría con Productos asociados no podrá eliminarse físicamente.

En caso de ser necesario ocultarla, deberá aplicarse Soft Delete.

Los Productos con historial de ventas tampoco deberán eliminarse físicamente.

Los Clientes con historial de compras deberán conservarse para mantener la integridad histórica del sistema.

Una Guest Session nunca otorgará acceso a un Order sin una relación Guest Session Orders vigente y explícita.

Revocar o purgar una Guest Session no modificará ni eliminará los pedidos asociados.

---

# Eliminación Lógica (Soft Delete)

El sistema no eliminará permanentemente la información de negocio.

En su lugar, las entidades que requieran eliminación lógica deberán utilizar el campo:

- deleted_at

Cuando `deleted_at` sea NULL, el registro se considerará activo.

Cuando `deleted_at` contenga una fecha, el registro se considerará eliminado.

---

## Entidades que utilizarán Soft Delete

- Categories
- Products
- Customers

---

## Entidades que NO utilizarán Soft Delete

- Orders
- Order Items
- Settings
- Profiles
- Guest Sessions
- Guest Session Orders
- Audit Logs

Los pedidos representan el historial comercial del negocio y nunca deberán eliminarse.

La configuración del sistema tampoco deberá eliminarse.

Guest Sessions y Guest Session Orders podrán eliminarse físicamente mediante una tarea de mantenimiento autorizada después de su expiración o revocación. Esta limpieza nunca se propagará a Orders.

Audit Logs e Inventory Movements serán append-only. Su eventual retención o
archivo deberá aprobarse como una decisión operativa independiente y nunca
ejecutarse desde el Panel.

---

## Consultas

Todas las consultas del sistema deberán excluir por defecto los registros eliminados.

Ejemplo

```
WHERE deleted_at IS NULL
```

Las pantallas administrativas podrán incluir filtros para visualizar registros eliminados cuando sea necesario.

---

## Restauración

Un registro eliminado podrá restaurarse estableciendo nuevamente:

```
deleted_at = NULL
```

No será necesario recrear el registro.

---

## Eliminación Permanente

La eliminación física de registros solo podrá realizarse mediante procesos administrativos o tareas de mantenimiento autorizadas.

Nunca desde la interfaz pública ni desde el Panel Administrativo.

---

# Imágenes

Las imágenes se almacenarán en Supabase Storage.

La Base de Datos almacenará únicamente rutas de objetos. El Backend generará
URLs firmadas de corta duración o entregará los archivos mediante un endpoint
controlado.

Buckets recomendados

- products
- categories
- gallery
- settings

Todos los buckets serán privados. Los roles `anon` y `authenticated` no tendrán
políticas directas sobre `storage.objects`; el Backend autorizado será el único
responsable de subir, reemplazar y resolver imágenes.

---

# Auditoría

Toda modificación importante deberá registrar:

- usuario
- fecha
- acción
- entidad modificada

La implementación podrá realizarse mediante tablas o logs del Backend.

Los cambios de stock utilizarán obligatoriamente Inventory Movements como registro de auditoría.

---

# Funciones Transaccionales

La creación y cancelación de pedidos con cambios de stock deberán implementarse mediante funciones PostgreSQL invocadas por el Backend a través de Supabase RPC.

- `create_order_with_stock`: valida disponibilidad, calcula el precio de oferta
  desde Products, aplica luego el descuento por transferencia cuando corresponde,
  crea el pedido y sus snapshots, descuenta stock, registra movimientos y vincula
  el pedido con la Guest Session recibida.
- `cancel_order_with_stock`: bloquea el pedido, valida su versión esperada y la confirmación de reintegro manual cuando ya estaba pagado, cambia el pedido a Cancelled, restaura unidades una sola vez y registra movimientos.
- `adjust_product_stock`: aplica un ajuste manual no negativo y registra actor y motivo.
- `transition_order_status`: bloquea el pedido, valida su versión esperada, aplica únicamente una transición válida y registra el cambio de pedido y pago.
- `link_guest_session_order`: crea de forma idempotente una relación previamente validada por el Backend.
- `purge_guest_sessions`: elimina sesiones expiradas o revocadas después del período de retención sin eliminar pedidos.
- `get_public_recovery_limit`: consulta los límites persistentes de recuperación.
- `register_public_recovery_failure`: incrementa atómicamente las huellas de IP y pedido/celular y aplica el bloqueo configurado.
- `clear_public_recovery_failures`: elimina los fallos después de una coincidencia válida.
- `recover_order_guest_session`: crea una credencial nueva, conserva los pedidos de una sesión vigente, vincula el pedido recuperado y revoca la credencial anterior en una sola transacción.
- `touch_guest_session`: actualiza el último acceso usando el reloj de PostgreSQL.
- `revoke_guest_session`: revoca de forma idempotente una sesión anónima.
- `purge_public_security_data`: purga sesiones e intentos vencidos; Supabase Cron la ejecutará diariamente.
- `create_consumer_withdrawal`: registra solicitud, vínculo opcional, constancia
  hasheada, idempotencia y eventos iniciales en una única transacción.
- `transition_consumer_withdrawal`: bloquea el expediente, valida `version`,
  aplica una transición válida y agrega el evento correspondiente.
- `link_consumer_withdrawal_order`: vincula o corrige un único pedido con actor,
  fundamento y concurrencia, sin modificar pedido, pago o stock.
- `record_consumer_withdrawal_settlement`: registra o confirma la liquidación
  manual exactamente una vez y actualiza `refund_status`.
- `correct_consumer_withdrawal_settlement`: rectifica únicamente el gasto
  adicional de devolución de una liquidación completada, valida el total
  confirmado, incrementa la versión y agrega corrección y evento append-only.
- `inspect_consumer_withdrawal_return`: bloquea solicitud y productos, exige la
  resolución exacta de todos los ítems, incrementa solo el stock apto, registra
  movimientos `consumer_withdrawal_return`, inspección, evento e idempotencia en
  una única transacción. Un replay idéntico no repone stock nuevamente.
- `record_consumer_withdrawal_settlement` bloqueará la solicitud y la
  liquidación, pero no utilizará `FOR UPDATE` sobre `orders` cuando solo lea su
  snapshot. `service_role` conservará únicamente `SELECT` directo sobre pedidos;
  no se ampliarán permisos para satisfacer un bloqueo innecesario.
- `purge_consumer_withdrawal_security_data`: elimina solo límites e idempotencias
  vencidos, nunca solicitudes, liquidaciones o eventos.
- `register_consumer_withdrawal_attempt`: incrementa atómicamente huellas HMAC de
  IP y contacto y devuelve necesidad de CAPTCHA, bloqueo y tiempo de reintento.

Las funciones que modifican pedidos o inventario deberán ser atómicas. Cualquier error deberá revertir la operación completa.

Las RPC de arrepentimientos serán `SECURITY INVOKER`, revocarán `EXECUTE` a
`PUBLIC`, `anon` y `authenticated`, y concederán exclusivamente los permisos
necesarios a `service_role`. Ninguna RPC realizará llamadas de red. Los futuros
reintegros externos usarán una operación outbox recuperable fuera de la transacción.

La recuperación de acceso a un pedido deberá validar en el Backend el número de pedido y el snapshot `customer_phone_normalized` antes de insertar una nueva relación Guest Session Orders. La inserción deberá ser idempotente y nunca trasladará el pedido de una sesión a otra.

---

# Seeds

El proyecto deberá incluir datos iniciales para:

- Categorías
- Productos
- Configuración
- Usuario Administrador

El seed no almacenará credenciales ni creará usuarios directamente en
`auth.users`. El administrador se provisionará mediante Supabase Auth y luego se
creará el Profile asociado usando su UUID. Categorías y productos con rutas de
Storage aún no cargadas permanecerán inactivos.

---

# Migraciones

Toda modificación estructural deberá realizarse mediante migraciones.

Nunca modificar la Base de Datos manualmente en producción.

---

# Performance

Crear índices para:

- category_id
- customer_id
- order_id
- product_id
- phone_normalized
- customer_phone_normalized
- order_number, único
- token_hash, único
- expires_at
- guest_session_id + order_id, único
- guest_session_id
- slug
- created_at

Evitar consultas N+1.

Paginar consultas administrativas.

---

# Seguridad

Nunca almacenar:

- Contraseñas
- Tokens de sesión en texto plano
- Información sensible de Mercado Pago

Toda autenticación será delegada a Supabase Auth.

Las sesiones anónimas no constituyen autenticación de usuario. Solo se almacenará el hash de un token aleatorio de alta entropía.

Todas las tablas del esquema de negocio utilizarán RLS con denegación por
defecto para `anon` y `authenticated`. El Frontend no accederá directamente a
ninguna tabla. `service_role` recibirá privilegios mínimos por tabla y las
operaciones críticas de pedidos, inventario y relaciones de sesión se
ejecutarán exclusivamente mediante funciones `SECURITY DEFINER` con
`search_path` vacío y permisos de ejecución explícitos.

Las comparaciones de credenciales se realizarán en el Backend a partir del hash y nunca mediante búsquedas por el token original.

---

# Definition of Done

Una modificación de Base de Datos solo estará finalizada cuando:

- Respete este documento.
- Posea migración.
- Mantenga integridad referencial.
- No rompa relaciones existentes.
- Esté documentada.
- Sea compatible con el Backend.
