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

---

# FASE 6 — Base de Datos

## Objetivo

Diseñar toda la base de datos antes del Backend.

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

## Definir

- Relaciones
- Índices
- Constraints
- Foreign Keys
- RLS
- Buckets
- Seeds

## Resultado esperado

Modelo de datos completamente validado.

---

# FASE 7 — Backend API

## Objetivo

Construir toda la API REST.

## Módulos

- Autenticación
- Productos
- Stock e inventario
- Categorías
- Clientes
- Pedidos
- Pagos y estados iniciales
- Configuración
- Storage

## Arquitectura

- Controllers
- Services
- Repositories
- DTO
- Validators
- Middlewares

## Resultado esperado

API completamente funcional.

---

# FASE 8 — Integración Frontend + Backend

## Objetivo

Reemplazar Mock Data por la API.

## Tareas

- Productos
- Categorías
- Carrito
- Checkout
- Configuración
- Clientes
- Pedidos

## Resultado esperado

La aplicación pública utiliza exclusivamente la API.

---

# FASE 8.5 — Infraestructura de Seguridad

## Objetivo

Implementar toda la infraestructura de autenticación y autorización antes de desarrollar el Panel Administrativo.

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

## Seguridad

- Nunca exponer rutas administrativas sin autenticación.
- Nunca confiar en la validación del Frontend.
- Todas las rutas privadas deberán validar el JWT en el Backend.
- Las sesiones deberán persistirse de forma segura.
- El Panel Administrativo solo será accesible mediante `/admin` o `/admin/login`.

## Resultado esperado

Toda la infraestructura de autenticación y autorización implementada y validada, lista para soportar el Panel Administrativo.

---

# FASE 9 — Panel Administrativo

## Objetivo

Construir el BackOffice.

## Módulos

- Login
- Dashboard
- Productos
- Categorías
- Pedidos
- Clientes
- Configuración
- Perfil

## Funcionalidades

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

## Resultado esperado

Panel completamente funcional.

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
