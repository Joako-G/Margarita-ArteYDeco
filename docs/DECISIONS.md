# DECISIONS.md

# Margarita Arte & Deco
## Architecture Decision Records (ADR)

Versión: 1.0

---

# Introducción

Este documento registra todas las decisiones importantes tomadas durante el desarrollo del proyecto.

Su propósito es evitar que futuros cambios modifiquen la arquitectura por desconocimiento.

Cada decisión debe incluir:

- Contexto
- Decisión
- Justificación
- Consecuencias

Toda nueva decisión deberá agregarse al final del documento.

Nunca eliminar decisiones anteriores.

Si una decisión cambia, registrar una nueva indicando que reemplaza a la anterior.

---

# ADR-001

## Arquitectura General

### Contexto

El proyecto comenzó como una Landing Page, pero el cliente necesita administrar productos, pedidos y clientes.

### Decisión

El sistema se desarrollará como un pequeño e-commerce con Landing comercial integrada.

### Justificación

Evita reescribir el proyecto cuando se agreguen nuevas funcionalidades.

Permite reutilizar la solución para futuros clientes.

### Consecuencias

La Landing y el Panel compartirán la misma API.

---

# ADR-002

## Stack Frontend

### Decisión

Frontend construido con:

- React
- TypeScript
- Vite

### Justificación

Excelente rendimiento.

Escalable.

Gran ecosistema.

---

# ADR-003

## Backend

### Decisión

Backend independiente utilizando:

Node

Express

TypeScript

### Justificación

Toda la lógica de negocio permanecerá fuera del frontend.

---

# ADR-004

## Base de Datos

### Decisión

Supabase PostgreSQL.

### Justificación

Permite:

Base de datos

Storage

Autenticación

Escalabilidad

RLS

---

# ADR-005

## Acceso a Datos

### Decisión

El Frontend nunca accederá directamente a Supabase.

### Justificación

Mayor seguridad.

Centralización de reglas.

Facilidad para migrar de proveedor.

---

# ADR-006

## Arquitectura

### Decisión

Arquitectura Feature First.

### Justificación

Reduce el acoplamiento.

Facilita mantenimiento.

---

# ADR-007

## Estado Global

### Decisión

Zustand.

TanStack Query.

### Justificación

Separar estado remoto de estado local.

---

# ADR-008

## Formularios

### Decisión

React Hook Form + Zod.

### Justificación

Validaciones tipadas.

Menor cantidad de renders.

---

# ADR-009

## Carrito

### Decisión

Persistir carrito utilizando Zustand Persist.

### Justificación

El usuario no perderá su compra al actualizar la página.

---

# ADR-010

## Diseño del Carrito

### Decisión

Drawer lateral.

No página independiente.

### Justificación

Mejor experiencia de usuario.

Menor cantidad de navegación.

---

# ADR-011

## Checkout

### Decisión

Checkout simple.

Solicitar únicamente:

Nombre

Apellido

Teléfono

Notas (opcional)

### Justificación

Reducir abandono.

---

# ADR-012

## Pasarela de Pago

### Decisión

No integrar Mercado Pago en el MVP.

### Justificación

Reducir complejidad.

Validar primero el flujo comercial.

---

# ADR-013

## Transferencia Bancaria

### Decisión

Permitir transferencia bancaria.

Mostrar:

Alias

CBU

Banco

Botón Copiar Alias

### Justificación

Proceso simple para el cliente.

---

# ADR-014

## Descuento

### Decisión

El descuento por transferencia será configurable.

No estará hardcodeado.

### Justificación

Cada negocio podrá modificarlo desde el Panel.

---

# ADR-015

## Stock

### Decisión

El stock no se descontará al agregar productos al carrito.

### Justificación

Evita bloquear stock innecesariamente.

---

# ADR-016

## Confirmación de Stock

### Decisión

El stock únicamente disminuirá cuando el pedido cambie a:

Pago recibido.

### Justificación

Evita inconsistencias.

---

# ADR-017

## Estados del Pedido

Estados oficiales:

Pending

Payment Pending

Paid

Preparing

Ready

Delivered

Cancelled

No podrán existir estados adicionales.

---

# ADR-018

## Productos

Los productos podrán estar:

Activo

Inactivo

Sin Stock

El frontend nunca mostrará productos inactivos.

---

# ADR-019

## Categorías

Las categorías serán administrables.

No estarán hardcodeadas.

---

# ADR-020

## Imágenes

Todas las imágenes se almacenarán en Supabase Storage.

No guardar imágenes en la base de datos.

---

# ADR-021

## Landing

La Landing tendrá prioridad comercial.

No parecerá un ecommerce tradicional.

Primero venderá inspiración.

Luego productos.

---

# ADR-022

## Panel Administrativo

Panel completamente separado de la Landing.

Compartir únicamente componentes reutilizables.

---

# ADR-023

## Responsive

Mobile First.

Desktop como mejora progresiva.

---

# ADR-024

## Seguridad

Toda validación deberá existir:

Frontend

Backend

Nunca confiar únicamente en el cliente.

---

# ADR-025

## Escalabilidad

La arquitectura deberá permitir incorporar:

- Mercado Pago
- Cupones
- Promociones
- Envíos
- Múltiples sucursales
- Múltiples administradores
- Clientes registrados

Sin modificar la estructura principal del proyecto.

---

# ADR-026

## Futuro

Todo el sistema deberá comportarse como un pequeño ERP comercial.

La Landing será únicamente una vista pública del sistema.

# ADR-027

## Arquitectura Frontend

### Contexto

El proyecto posee una Landing pública y un Panel Administrativo.

### Decisión

Se utilizará un único proyecto React con dos aplicaciones lógicas.

Public App

Admin App

Ambas compartirán únicamente componentes reutilizables.

### Justificación

Evita duplicar código.

Reduce mantenimiento.

Facilita compartir:

- Tipos
- Hooks
- Services
- Axios
- Design System

### Consecuencias

No existirán dos repositorios distintos.

Todo el proyecto vivirá dentro de una única aplicación.

---

# ADR-028

## Disponibilidad de productos en el MVP

### Contexto

Las ADR-015, ADR-016 y parte de ADR-018 asumían la administración de cantidades de stock. El MVP no administrará stock.

### Decisión

Esta decisión reemplaza las reglas de stock de ADR-015 y ADR-016, y elimina el estado "Sin Stock" de ADR-018 para el MVP.

Los productos tendrán únicamente estado Activo o Inactivo. Un producto activo se mostrará y podrá comprarse. Un producto inactivo no se mostrará ni podrá incluirse en pedidos nuevos. El Backend validará nuevamente este estado al crear cada pedido.

### Justificación

Permite que el administrador controle manualmente la disponibilidad sin introducir cantidades, reservas ni movimientos de inventario.

### Consecuencias

El modelo MVP no tendrá campo `stock`. Una implementación futura podrá agregar cantidades de inventario sin reemplazar `is_active`.

---

# ADR-029

## Control de stock desde el MVP

### Contexto

El catálogo contiene productos físicos y permite comprar múltiples unidades. Utilizar únicamente el estado Activo o Inactivo permitiría solicitar cantidades superiores a las disponibles.

### Decisión

Esta decisión reemplaza ADR-028 y vuelve a reemplazar las reglas originales de ADR-015 y ADR-016.

Cada producto tendrá `is_active` y `stock_quantity`. `is_active` controlará su publicación. Un producto activo con stock cero seguirá visible como "Sin stock", pero no podrá comprarse.

El stock se descontará de forma atómica al crear el pedido y se restaurará una sola vez cuando el pedido sea cancelado. Todo ajuste deberá generar un movimiento de inventario auditable.

### Justificación

Evita sobreventas, permite comprar varias unidades con una validación confiable y mantiene separadas la publicación y la disponibilidad real.

### Consecuencias

El Backend será la autoridad final del stock. El carrito no reservará unidades. El Panel Administrativo permitirá consultar, ajustar y auditar el inventario.

---

# ADR-030

## Experiencia de catálogo y compra del MVP

### Contexto

La tienda debe facilitar la exploración visual por categorías, permitir comprar varias unidades y completar pedidos sin registro ni pasarela de pago.

### Decisión

Las categorías se representarán mediante botones circulares con imagen de fondo. La selección se reflejará visualmente, mediante texto accesible y en la URL.

Cada ProductCard permitirá elegir una cantidad antes de agregarla. Agregar un producto mostrará confirmación sin abrir automáticamente el carrito. El carrito se presentará como Drawer y conducirá al checkout.

El checkout solicitará nombre, apellido y teléfono. Permitirá efectivo o transferencia con descuento configurable. El Backend calculará todos los importes. La logística se coordinará posteriormente por teléfono.

Los pedidos conservarán snapshots del cliente y nombres de productos para proteger el historial.

### Justificación

Reduce interrupciones durante la compra, mantiene un flujo simple para el cliente y permite al negocio operar sin integrar pagos o logística automática en el MVP.

### Consecuencias

Las categorías requieren imagen y orden administrable. El Panel deberá gestionar imágenes, stock, publicación y productos destacados. Mercado Pago, logística automatizada, promociones y cupones permanecen fuera del MVP.

---

# ADR-031

## Retiro exclusivo en el local

### Contexto

El MVP no realizará envíos ni entregas a domicilio. Todos los pedidos serán retirados personalmente en el local.

### Decisión

Esta decisión reemplaza el estado final `Delivered` de ADR-017 por `PickedUp` y reemplaza la coordinación logística general indicada en ADR-030.

El checkout y la confirmación mostrarán la dirección configurada del local. No se solicitará dirección al cliente. El administrador marcará el pedido como `PickedUp` cuando sea retirado y el pago esté confirmado.

### Justificación

Refleja el funcionamiento real del negocio y evita solicitar datos o construir un flujo de envíos que no se utilizará en el MVP.

### Consecuencias

El sistema registrará `picked_up_at`. Para efectivo, el pago se confirmará al momento del retiro antes de marcar el pedido como retirado. Envíos y logística automatizada permanecen como mejoras futuras.

---

# ADR-032

## Ubicación del local en el flujo de compra

### Contexto

Todos los pedidos se retiran en el local y el cliente necesita conocer claramente dónde y cuándo puede retirarlos.

### Decisión

La dirección y los horarios se mostrarán antes de confirmar el pedido. La pantalla de confirmación mostrará además un botón para abrir la ubicación en Google Maps.

Dirección, horarios y URL de Google Maps serán administrables desde Settings y nunca estarán hardcodeados.

### Justificación

Evita confusiones después de la compra y permite que el negocio actualice su información de retiro sin desplegar una nueva versión.

### Consecuencias

Settings incorporará `maps_url` y `business_hours`. La API pública y la respuesta de confirmación expondrán únicamente la información necesaria para el retiro.

---

# ADR-033

## WhatsApp manual y datos de transferencia

### Contexto

El negocio necesita comunicarse con clientes y recibir comprobantes sin integrar WhatsApp Business API en el MVP.

### Decisión

El sistema utilizará enlaces `wa.me` con mensajes predefinidos y editables. El Panel ofrecerá "Contactar cliente", "Avisar que está listo" y "Recordar transferencia" según el estado del pedido.

Para pagos por transferencia, los datos bancarios se mostrarán directamente en la confirmación después de crear el pedido. WhatsApp se utilizará para enviar el comprobante, no como único medio para recibir alias, CBU o banco.

### Justificación

Permite operar sin costos, credenciales ni automatizaciones externas y evita que el flujo de pago dependa de que WhatsApp esté disponible.

### Consecuencias

El envío será manual. El sistema no conocerá el estado de entrega o lectura del mensaje y abrir WhatsApp no modificará pedidos ni pagos. WhatsApp Business API permanece como mejora futura.
