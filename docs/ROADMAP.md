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
- Sesiones anónimas
- Consulta pública de pedidos
- Recuperación pública de pedidos

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
