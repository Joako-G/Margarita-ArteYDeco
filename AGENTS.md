# Margarita Arte & Deco — Guía de desarrollo con IA

## Objetivo y principios

Construir una plataforma de arte y decoración escalable: landing comercial, catálogo, carrito, checkout sin pasarela, administración de productos, categorías, clientes, pedidos y configuración del negocio. Debe poder integrar Mercado Pago sin rediseñar la arquitectura.

Priorice escalabilidad, reutilización, simplicidad, bajo acoplamiento, cohesión, accesibilidad, rendimiento y mantenibilidad. No sacrifique calidad por velocidad.

## Prioridad de Documentación

Cuando exista un conflicto entre documentos, deberá respetarse el siguiente orden:

1. BUSINESS-RULES.md
2. DATABASE-SDD.md
3. BACKEND-SDD.md
4. FRONTEND-SDD.md
5. ADMIN-SDD.md
6. DESIGN-SYSTEM.md
7. CONVENTIONS.md
8. DECISIONS.md

Las reglas definidas en BUSINESS-RULES.md tienen prioridad sobre cualquier decisión técnica.

## Stack y arquitectura objetivo

El frontend usa React, TypeScript y Vite. Al incorporar las funcionalidades correspondientes, use React Router, TanStack Query para datos remotos, Zustand para estado global, React Hook Form con Zod para formularios, Axios para HTTP, Framer Motion para animaciones y Lucide React para iconos. Use Swiper solo si es realmente necesario.

El backend objetivo es Node.js, Express y TypeScript, con JWT, Zod y Supabase JS. Supabase PostgreSQL y Storage son servicios exclusivos del backend; el frontend nunca debe acceder a Supabase ni ejecutar SQL. El recorrido obligatorio es: frontend → backend → servicio/repositorio → Supabase.

Organice el frontend por funcionalidades en `src/`, separando `app`, `components`, `features`, `hooks`, `layouts`, `pages`, `router`, `services`, `stores`, `styles`, `types` y `utils`. Mantenga la lógica de negocio fuera de la UI. El backend debe separar `config`, `controllers`, `middlewares`, `repositories`, `routes`, `schemas`, `services`, `types` y `utils`.

No cambie la arquitectura, stack, dependencias, estructura de carpetas, reglas de negocio ni base de datos sin autorización explícita.

## Convenciones de código y diseño

Use inglés en código y español en textos de usuario. Los archivos de componentes y sus exports usan PascalCase (`ProductCard.tsx` y `ProductCard`); los hooks usan camelCase comenzando con `use` (`useProducts.ts` y `useProducts`). Use `kebab-case` para servicios, schemas y utilidades, `camelCase` para variables y funciones, `IProduct` para interfaces, `ProductType` para tipos y `ProductStatus` para enums. Respete el estilo existente: dos espacios, comillas simples, sin punto y coma y comas finales multilínea. Ejecute `pnpm lint` y `pnpm build` antes de entregar.

Construya componentes reutilizables y divídalos cuando exista una responsabilidad coherente que extraer; 250 líneas es una señal para revisarlo, no un límite mecánico. Extraiga la lógica compartida a hooks y no duplique servicios, utilidades ni componentes existentes. Todos los colores y tipografías deben provenir del Design System: no improvise ni use valores visuales hardcodeados.

## Estado, formularios y API

Use exclusivamente Zustand para estado global, con Persist y `localStorage` para el carrito. No use Context API como estado global. Use TanStack Query solo para datos remotos. Centralice las llamadas HTTP en servicios Axios; no use `fetch`. Todo formulario debe usar React Hook Form y Zod, y toda entrada debe validarse también en el backend.

## Reglas de negocio

El MVP administra stock por unidades. Un producto activo se muestra; solo puede comprarse si `stock_quantity > 0`. Un producto inactivo no debe mostrarse ni aceptarse al crear un pedido. El Backend debe validar actividad y stock, descontar las unidades de forma atómica al crear el pedido y restaurarlas una sola vez si el pedido se cancela. Nunca permita stock negativo. Los únicos estados de pedido son `Pending`, `Confirmed`, `Preparing`, `Ready`, `PickedUp`, `Delivered` y `Cancelled`; el estado de pago se administra por separado. El cliente elegirá entre retiro en el local y envío a coordinar. Para retiro, checkout y confirmación deben mostrar dirección, horarios y enlace de Google Maps obtenidos desde Settings. Para envío, la dirección será obligatoria y el costo y la entrega se coordinarán manualmente por WhatsApp, sin tracking ni logística automatizada. El descuento por transferencia debe proceder de la configuración del negocio, nunca de un porcentaje hardcodeado. Mantenga separadas la aplicación pública y la administración; reutilice componentes solo cuando sea adecuado.

Las categorías públicas funcionan como filtros circulares con imagen de fondo. La selección debe ser visible, accesible y mantenerse en la URL. Cada ProductCard permite elegir una cantidad entre 1 y el stock disponible antes de agregarla al carrito. El checkout solicita nombre, apellido y celular, admite efectivo o transferencia y muestra siempre el resumen y total final antes de confirmar.

Los clientes compran sin cuenta. En producción, cada pedido deberá asociarse a una sesión anónima de solo lectura mediante una cookie segura `HttpOnly`; el Frontend recuperará la confirmación desde el Backend y nunca persistirá tokens, datos personales ni el pedido completo en `localStorage`. Sin una sesión vigente, la recuperación requerirá número de pedido y el mismo celular de la compra, con respuestas indistinguibles, rate limiting, bloqueo temporal y CAPTCHA adaptativo. Esta sesión pública es independiente de Supabase Auth y de la autenticación administrativa.

## Calidad, accesibilidad y entrega

Toda imagen informativa requiere `alt`; los botones deben tener un nombre accesible y el contraste mínimo es AA. Aplique lazy loading y code splitting cuando aporte valor; use memoización solo con una razón concreta. Las animaciones con Framer Motion deben mejorar, no distraer.

Una tarea termina únicamente cuando compila sin errores ni warnings, es responsive y accesible, no duplica código y actualiza la documentación si modifica lógica crítica. Antes de crear algo, compruebe si ya existe un componente, hook, utilidad o servicio reutilizable.

## Skills del proyecto

Las skills locales viven en `.agents/skills` y complementan estas instrucciones; nunca reemplazan `AGENTS.md` ni la prioridad documental definida arriba. Antes de aplicar una recomendación visual, deben leer `docs/DESIGN-SYSTEM.md`, `docs/CONVENTIONS.md` y la especificación funcional correspondiente.

Use `impeccable` para diseñar o pulir interfaces, `make-interfaces-feel-better` para detalles visuales y microinteracciones, y `web-design-guidelines` para auditorías de UI, UX y accesibilidad. No cree `PRODUCT.md` ni `DESIGN.md`: el contexto equivalente ya existe en `docs/`. Las auditorías son de solo lectura salvo que el usuario solicite implementar los cambios.

# Arquitectura General

El proyecto estará compuesto por una única aplicación React.

No existirán dos proyectos separados.

La aplicación tendrá dos áreas completamente diferenciadas.

## Public App

/

Landing comercial

Catálogo

Productos

Checkout

Contacto

Nosotros

## Admin App

/admin

Dashboard

Productos

Categorías

Pedidos

Clientes

Configuración

El Panel Administrativo compartirá únicamente:

- Design System
- Componentes reutilizables
- Hooks reutilizables
- Types
- Utils
- Services

Nunca compartir layouts entre ambas aplicaciones.

Cada aplicación tendrá sus propias rutas, layouts y navegación.

El usuario público nunca verá enlaces al Panel Administrativo.

El acceso será únicamente mediante:

/admin

o

/admin/login
