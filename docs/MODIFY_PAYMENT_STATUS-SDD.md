## Migración de order_status + Rediseño del módulo de Pedidos

Versión: 1.0
Estado: Pendiente
Prioridad: Alta
Dependencias: Base de datos ya migrada (order_status actualizado)

# Objetivo

Adaptar todo el sistema al nuevo enum order_status, eliminando cualquier lógica relacionada con pagos dentro del estado del pedido.

La implementación debe respetar el siguiente orden:

Backend
Frontend
Testing
Validación final

No deben existir referencias a estados antiguos como:

payment_pending
paid

dentro de order_status.

Nuevo enum oficial
pending
confirmed
preparing
ready
picked_up
delivered
cancelled

El estado del pago queda exclusivamente representado por payment_status.

# FASE 1 — Backend
Objetivo

Actualizar toda la lógica de negocio para trabajar únicamente con el nuevo flujo del pedido.

1.1 Auditoría

Buscar referencias de:

payment_pending
paid
pending

especialmente en:

controllers
services
repositories
validators
middleware
rpc
helpers
cron
notificaciones
websocket
documentación

No modificar nada antes de generar un inventario completo.

1.2 Tipos

Actualizar:

OrderStatus

Eliminar estados antiguos.

Agregar únicamente:

pending
confirmed
preparing
ready
picked_up
delivered
cancelled
1.3 Validaciones

Actualizar todas las validaciones Zod.

Actualizar:

DTOs
Schemas
Infer Types

Eliminar cualquier referencia a:

paid
payment_pending
1.4 Lógica de negocio

Revisar completamente:

Creación del pedido

Debe crear:

pending

Confirmación del comercio

Debe pasar a:

confirmed

Inicio de preparación

confirmed
↓

preparing

Pedido listo

preparing
↓

ready

Entrega

Si Delivery

ready
↓

delivered

Retiro

ready
↓

picked_up

Cancelación

Permitida únicamente desde estados válidos.

Verificar reglas de negocio.

1.5 Transiciones

Implementar una máquina de estados.

Estados permitidos:

pending
↓

confirmed
↓

preparing
↓

ready

Desde ready

picked_up

o

delivered

Cancelación únicamente donde corresponda.

Nunca permitir:

delivered
↓

preparing

ni

picked_up
↓

confirmed

etc.

1.6 Payment Status

Verificar que:

payment_status

sea completamente independiente.

No debe modificar:

order_status
1.7 API

Actualizar:

OpenAPI

Swagger

tipos

responses

DTOs

Ejemplos

1.8 Documentación

Actualizar:

API-SPEC

BUSINESS-RULES

DATABASE-SDD

Backend-SDD

# FASE 2 — Frontend
Objetivo

Consumir el nuevo flujo del backend y mejorar completamente la UX de la tabla.

2.1 Tipos

Actualizar:

OrderStatus

Eliminar estados viejos.

2.2 Hooks

Actualizar:

React Query

Mutations

Caches

Optimistic Updates

2.3 Componentes

Buscar referencias en:

StatusBadge

OrderRow

OrderCard

OrderDetail

Filters

Statistics

Dashboard


Actualizar todos los switch/case.

2.4 Colores

Definir nuevos badges.

Ejemplo:

Pending

Amarillo

Confirmed

Azul

Preparing

Naranja

Ready

Verde claro

Picked Up

Turquesa

Delivered

Verde

Cancelled

Rojo

Todos deben utilizar el Design System existente.

2.5 Filtros

Actualizar filtros.

Eliminar estados antiguos.

Agregar:

Confirmed
Preparing
Ready
Picked Up
Delivered
# FASE 3 — Rediseño UX
Objetivo

Reducir la carga visual de la tabla.

Nueva estructura

Eliminar completamente la columna:

Pago

Nueva tabla

Pedido

Cliente

Estado

Total

Fecha

Acciones
Pedido

Mostrar:

Número

Cantidad de productos
Cliente

Mostrar:

Nombre

Teléfono

📦 Envío

o

🏪 Retiro

según corresponda.

Eliminar cualquier información redundante.

Estado

Mostrar únicamente el estado operativo del pedido.

Ejemplo

🟡 Pendiente

🔵 Confirmado

🟠 Preparando

🟢 Listo

🚚 Entregado

🏪 Retirado

❌ Cancelado

Debajo del badge, mostrar en texto secundario y con menor jerarquía visual:

💳 Transferencia · Pagado

o

💵 Efectivo · Pendiente

o

💳 Mercado Pago · Fallido

Esto elimina la columna "Pago" sin perder información.

Total

Mantener únicamente:

$19.200

Con mayor peso visual.

Fecha

Mantener diseño actual.

Acción

Reemplazar:

Ver detalle

por un botón consistente con el resto del panel:

Ver

o un botón con icono si el Design System ya utiliza ese patrón.

# FASE 4 — Detalle del pedido

Actualizar toda la pantalla de detalle.

Eliminar referencias a:

Pedido Pagado
Pago Pendiente

como estado principal.

El encabezado debe mostrar únicamente:

Estado del pedido

El bloque de pago debe ser independiente.

# FASE 5 — Testing
Backend

Actualizar:

Unit Tests

Integration Tests

Supertest

Verificar:

Creación

Confirmación

Preparación

Listo

Retiro

Entrega

Cancelación

Transiciones inválidas

Payment Status independiente

Frontend

Actualizar:

Vitest

React Testing Library

Verificar:

Badges

Filtros

Tabla

Detalle

Mutations

Estados vacíos

Responsive

E2E

Verificar flujo completo.

Caso 1

Pedido

↓

Pending

↓

Confirmed

↓

Preparing

↓

Ready

↓

Picked Up

Caso 2

Pedido

↓

Pending

↓

Confirmed

↓

Preparing

↓

Ready

↓

Delivered

Caso 3

Pedido

↓

Pending

↓

Cancelled

Caso 4

Pedido

↓

Confirmed

↓

Cancelled

Caso 5

Pago pendiente

↓

Pedido listo

↓

Pago confirmado

↓

Pedido entregado

Verificar que el cambio en payment_status no modifique order_status.

# FASE 6 — Verificación final

Antes de dar la tarea por finalizada, el agente deberá:

Buscar cualquier referencia restante a payment_pending y paid dentro del código relacionado con order_status y eliminarla.
Verificar que todas las transiciones de estado sean válidas y estén centralizadas en una única fuente de verdad (evitar lógica duplicada entre backend y frontend).
Comprobar que el frontend utiliza exclusivamente los nuevos valores del enum y que no existen switch o if incompletos.
Ejecutar todos los linters y verificaciones de tipos (TypeScript) sin advertencias relacionadas con estados.
Ejecutar la suite completa de pruebas (backend, frontend e integración) y confirmar que no haya regresiones.
Revisar la experiencia responsive (desktop, tablet y móvil) para asegurar que la eliminación de la columna Pago mejora la legibilidad y que la nueva información de Envío / Retiro se integra correctamente sin romper el diseño existente.
Resultado esperado
order_status representa únicamente el ciclo de vida operativo del pedido.
payment_status representa exclusivamente el ciclo de vida del pago.
La tabla de pedidos es más simple, legible y escalable.
El backend y el frontend comparten el mismo flujo de estados, evitando inconsistencias.
Toda la documentación, las pruebas y la interfaz quedan alineadas con el nuevo modelo de dominio.