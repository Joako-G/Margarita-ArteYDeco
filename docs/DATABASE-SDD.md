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

Los movimientos `order_created` y `order_cancelled` deberán ser únicos por pedido y producto. `quantity_delta` será negativo al descontar y positivo al reponer.

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
- created_at
- updated_at

Relaciones

Un Cliente posee muchos Pedidos.

`phone_normalized` deberá ser único y se utilizará para encontrar y reutilizar clientes.

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
- unit_price
- subtotal

Relaciones

Pertenece a un Pedido.

Pertenece a un Producto.

Los campos `customer_first_name`, `customer_last_name`, `customer_phone`, `customer_phone_normalized` y `product_name` son snapshots históricos. No deberán cambiar cuando posteriormente se editen el cliente o el producto.

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
- created_at
- updated_at

Existirá únicamente un registro.

`transfer_discount` deberá estar entre 0 y 100. `low_stock_threshold` deberá ser un entero mayor o igual a 0.

`maps_url` deberá ser una URL HTTPS válida. `business_hours` será texto administrable para mostrar los horarios vigentes del local.

`logo_path` almacenará únicamente la ruta relativa del objeto dentro del bucket
privado `settings`; nunca almacenará una URL pública ni una URL firmada. Será
nullable para permitir que la aplicación utilice el logo local oficial como
respaldo hasta que el administrador publique uno.

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
- payment_pending
- paid
- preparing
- ready
- picked_up
- cancelled

---

## Pagos

- pending
- paid
- rejected

## Métodos de Pago

- cash
- bank_transfer

Los pedidos en efectivo se crearán como `pending` con pago `pending`. Los pedidos por transferencia se crearán como `payment_pending` con pago `pending`.

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

- `create_order_with_stock`: valida disponibilidad, crea el pedido y sus detalles, descuenta stock, registra movimientos y vincula el pedido con la Guest Session recibida.
- `cancel_order_with_stock`: cambia el pedido a Cancelled, restaura unidades una sola vez y registra movimientos.
- `adjust_product_stock`: aplica un ajuste manual no negativo y registra actor y motivo.
- `transition_order_status`: aplica únicamente una transición válida y registra el cambio de pedido y pago.
- `link_guest_session_order`: crea de forma idempotente una relación previamente validada por el Backend.
- `purge_guest_sessions`: elimina sesiones expiradas o revocadas después del período de retención sin eliminar pedidos.
- `get_public_recovery_limit`: consulta los límites persistentes de recuperación.
- `register_public_recovery_failure`: incrementa atómicamente las huellas de IP y pedido/celular y aplica el bloqueo configurado.
- `clear_public_recovery_failures`: elimina los fallos después de una coincidencia válida.
- `recover_order_guest_session`: crea una credencial nueva, conserva los pedidos de una sesión vigente, vincula el pedido recuperado y revoca la credencial anterior en una sola transacción.
- `touch_guest_session`: actualiza el último acceso usando el reloj de PostgreSQL.
- `revoke_guest_session`: revoca de forma idempotente una sesión anónima.
- `purge_public_security_data`: purga sesiones e intentos vencidos; Supabase Cron la ejecutará diariamente.

Las funciones que modifican pedidos o inventario deberán ser atómicas. Cualquier error deberá revertir la operación completa.

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
