# SDD — Nueva Implementacion Método de entrega (Retiro / Envío)

## Implementación estricta

Implementar únicamente lo especificado en este SDD.

No agregar funcionalidades adicionales.

No modificar el flujo actual de pedidos fuera de lo indicado.

No rediseñar componentes existentes salvo que sea necesario para incorporar el método de entrega.

No crear nuevas tablas.

No implementar estados de envío, tracking, empresas de transporte, costos de envío ni integraciones externas.

Mantener la arquitectura, convenciones, estilo de código y patrones actuales del proyecto.

Ejecutar los tests existentes y corregir cualquier regresión antes de finalizar.

## Objetivo

Incorporar la selección del método de entrega al flujo de compra sin convertir la aplicación en un sistema de logística.

El sistema únicamente debe registrar la preferencia del cliente:

- Retiro en el local.
- Envío coordinado por el dueño.

Toda la coordinación del envío (costo, empresa de transporte, seguimiento, fechas, etc.) continúa realizándose manualmente por WhatsApp entre el dueño y el cliente.

---

# Alcance

## Incluye

- Nuevos campos en Orders.
- Validaciones Backend.
- Actualización de DTOs.
- Actualización de API.
- Checkout dinámico.
- Visualización en detalle del pedido (Admin).
- Persistencia en Base de Datos.

## No incluye

- Cálculo de costos de envío.
- Integración con empresas de transporte.
- Tracking.
- Número de seguimiento.
- Estados de envío.
- Integración con Andreani, Correo Argentino, OCA, etc.

---

# Base de Datos

La tabla Orders ya contiene:

- payment_method
- payment_status
- status
- subtotal
- discount
- total
- ...

Agregar:

```sql
delivery_method
```

Enum:

```
pickup
shipping
```

Agregar:

```sql
shipping_address
```

Tipo:

```
TEXT NULL
```

---

## Reglas

### pickup

Debe cumplirse:

```
shipping_address = NULL
```

### shipping

Debe cumplirse:

```
shipping_address obligatorio
```

---

# Backend

## Dominio

Actualizar entidad Order.

Agregar:

```
deliveryMethod

shippingAddress
```

---

# Validaciones

## Crear Pedido

### delivery_method

Obligatorio.

Valores permitidos:

```
pickup
shipping
```

Cualquier otro valor:

```
400 Bad Request
```

---

## pickup

Si:

```
delivery_method = pickup
```

El backend debe:

- Ignorar shipping_address enviado por el cliente.
- Guardar NULL.

Nunca debe almacenarse una dirección para retiro.

---

## shipping

Si:

```
delivery_method = shipping
```

Debe validar:

- shipping_address requerido.
- trim().
- longitud mínima.
- longitud máxima.

Ejemplo:

```
Min:
10 caracteres

Max:
300 caracteres
```

Si falta:

```
400 Bad Request
```

---

# Reglas de Negocio

El backend NO debe:

- calcular costos
- elegir empresa de transporte
- generar tracking
- almacenar seguimiento
- modificar estados de envío

Toda la logística queda fuera del sistema.

---

# DTOs

Actualizar:

CreateOrderDto

Agregar:

```
deliveryMethod

shippingAddress
```

---

UpdateOrderDto

No modificar.

La dirección enviada por el cliente no debe modificarse desde el panel administrativo.

Si en el futuro se requiere edición, se implementará en otra fase.

---

OrderResponseDto

Agregar:

```
deliveryMethod

shippingAddress
```

---

# API

## POST /orders

Aceptar:

```
deliveryMethod

shippingAddress
```

---

Ejemplo

Retiro

```json
{
  "deliveryMethod": "pickup"
}
```

---

Envío

```json
{
  "deliveryMethod": "shipping",
  "shippingAddress": "Belgrano 607, San Salvador de Jujuy"
}
```

---

## GET /orders

Debe devolver:

```
deliveryMethod
```

No es necesario ocultarlo.

---

## GET /orders/:id

Debe devolver:

```
deliveryMethod

shippingAddress
```

---

# Frontend Público

Modificar Checkout.

---

## Paso 1

Agregar nueva sección antes del pago.

Título:

```
¿Cómo querés recibir tu pedido?
```

Mostrar dos cards.

---

Card 1

```
Retiro en el local

Retirá tu compra personalmente en nuestro local.
```

---

Card 2

```
Envío a coordinar

Nos comunicaremos con vos para coordinar el envío.
```

---

Sólo una puede estar seleccionada.

---

## Flujo Pickup

Mostrar:

- métodos de pago actuales
- información del local

No mostrar dirección de envío.

---

## Flujo Shipping

Mostrar:

Campo:

```
Dirección de entrega
```

Textarea o Input grande.

Placeholder:

```
Ingresá la dirección donde querés recibir tu pedido.
```

Debajo mostrar:

```
Una vez recibido el pedido nos comunicaremos por WhatsApp para coordinar el costo y la entrega.

El envío es gestionado directamente por el dueño.
```

Luego mostrar los métodos de pago correspondientes.

Actualmente:

- Transferencia

En una fase posterior:

- Mercado Pago

---

# Validaciones Frontend

pickup

No mostrar:

```
shippingAddress
```

---

shipping

Validar:

obligatorio.

Mostrar error si está vacío.

---

# TanStack Query

Actualizar mutation CreateOrder.

Enviar:

```
deliveryMethod

shippingAddress
```

---

# Tipos

Actualizar:

```
Order

CreateOrderRequest

OrderResponse
```

Agregar:

```
deliveryMethod

shippingAddress
```

---

# Panel Administrativo

## Lista de Pedidos

NO modificar diseño.

No agregar columnas nuevas.

No mostrar:

- método de entrega
- dirección

La lista debe mantenerse limpia.

---

## Detalle del Pedido

Agregar nueva card.

Título:

```
Entrega
```

---

Si:

pickup

Mostrar:

```
Tipo

Retiro en el local
```

---

Si:

shipping

Mostrar:

```
Tipo

Envío

Dirección

<shippingAddress>
```

No mostrar:

- tracking
- empresa
- costo
- estado del envío

---

# Seguridad

Nunca confiar en:

```
shippingAddress
```

Aplicar:

- trim
- sanitización
- validación
- longitud máxima

Evitar almacenar HTML.

---

# Testing

Backend

Crear tests para:

- pickup guarda NULL.
- shipping guarda dirección.
- shipping sin dirección devuelve 400.
- deliveryMethod inválido devuelve 400.

---

Frontend

Verificar:

- cambio entre Pickup y Shipping.
- aparición/desaparición del campo dirección.
- validaciones.
- payload enviado.
- renderizado correcto del detalle del pedido.

---

# Resultado esperado

El sistema permite elegir entre retiro y envío.

El backend valida correctamente la información.

La dirección únicamente se solicita cuando corresponde.

El panel administrativo muestra la información de entrega únicamente dentro del detalle del pedido.

La aplicación continúa sin gestionar logística, costos ni seguimiento de envíos, manteniendo el modelo de negocio definido.