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

## Categories

Responsabilidad

Agrupar productos.

Campos mínimos

- id
- name
- slug
- image
- description
- display_order
- is_active
- created_at
- updated_at

Relaciones

Una Categoría posee muchos Productos.

`slug` deberá ser único. `display_order` será un entero mayor o igual a 0.

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
- image
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

Los campos `customer_first_name`, `customer_last_name`, `customer_phone` y `product_name` son snapshots históricos. No deberán cambiar cuando posteriormente se editen el cliente o el producto.

---

## Settings

Responsabilidad

Configuración global del negocio.

Campos mínimos

- id
- business_name
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

Los pedidos representan el historial comercial del negocio y nunca deberán eliminarse.

La configuración del sistema tampoco deberá eliminarse.

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

La Base de Datos almacenará únicamente las URLs.

Buckets recomendados

- products
- categories
- gallery
- settings

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

- `create_order_with_stock`: valida disponibilidad, crea el pedido y sus detalles, descuenta stock y registra movimientos.
- `cancel_order_with_stock`: cambia el pedido a Cancelled, restaura unidades una sola vez y registra movimientos.

Ambas funciones deberán ser atómicas. Cualquier error deberá revertir la operación completa.

---

# Seeds

El proyecto deberá incluir datos iniciales para:

- Categorías
- Productos
- Configuración
- Usuario Administrador

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
- slug
- created_at

Evitar consultas N+1.

Paginar consultas administrativas.

---

# Seguridad

Nunca almacenar:

- Contraseñas
- Tokens
- Información sensible de Mercado Pago

Toda autenticación será delegada a Supabase Auth.

---

# Definition of Done

Una modificación de Base de Datos solo estará finalizada cuando:

- Respete este documento.
- Posea migración.
- Mantenga integridad referencial.
- No rompa relaciones existentes.
- Esté documentada.
- Sea compatible con el Backend.
