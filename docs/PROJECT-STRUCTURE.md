# PROJECT-STRUCTURE.md

# Margarita Arte & Deco

## Project Structure

Versión: 1.0

---

# Objetivo

Este documento define la estructura oficial del proyecto.

Todos los desarrolladores y agentes de IA deberán respetar esta estructura.

No crear carpetas nuevas sin autorización.

No modificar la organización del proyecto sin actualizar este documento.

---

# Arquitectura General

El sistema estará compuesto por:

- Una aplicación React
- Un Backend independiente
- Una Base de Datos PostgreSQL (Supabase)

La aplicación React tendrá dos áreas claramente diferenciadas.

## Public App

Landing comercial

Catálogo

Carrito

Checkout

Contacto

## Admin App

Dashboard

Productos

Categorías

Pedidos

Clientes

Configuración

Ambas aplicaciones compartirán únicamente componentes reutilizables.

Nunca compartir Layouts.

Nunca compartir navegación.

---

# Estructura General

```
/
│
├── docs/
├── frontend/
├── backend/
├── database/
└── README.md
```

---

# Frontend

```
frontend/
│
├── public/
│
├── src/
│
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

# src

```
src/

app/

config/

layouts/

pages/

features/

mocks/

shared/

router/

styles/

assets/
```

---

# app

Responsabilidad:

Inicialización de la aplicación.

Contendrá únicamente:

```
app/

App.tsx

providers.tsx

query-client.ts

theme.ts

index.ts
```

Nunca colocar lógica de negocio aquí.

---

# config

Configuración global.

Ejemplo

```
config/

env.ts

constants.ts

routes.ts

navigation.ts

storage.ts
```

---

# mocks

Datos simulados utilizados durante las fases de Frontend.

```
mocks/

categories.mock.ts

products.mock.ts

orders.mock.ts

customers.mock.ts

settings.mock.ts

testimonials.mock.ts

gallery.mock.ts

faq.mock.ts
```

Los componentes no deberán depender de detalles exclusivos de estos archivos.
Cambiar a la API deberá requerir únicamente reemplazar el origen de los datos.

---

# layouts

Layouts reutilizables.

```
layouts/

PublicLayout/

AdminLayout/

AuthLayout/
```

Cada Layout contiene:

```
components/

layout.tsx

styles.css
```

---

# pages

Las páginas únicamente componen componentes.

No contienen lógica de negocio.

Ejemplo

```
pages/

Home/

Products/

Checkout/

About/

Contact/

Admin/

Login/

Dashboard/
```

Cada página deberá tener:

```
index.tsx
```

Nunca más de un componente principal.

---

# features

Toda la lógica del negocio vive aquí.

Cada módulo tendrá independencia.

```
features/

landing/

hero/

products/

categories/

cart/

checkout/

gallery/

faq/

customers/

orders/

settings/

dashboard/

auth/
```

Cada Feature tendrá la misma estructura.

```
feature-name/

components/

hooks/

services/

types/

schemas/

utils/

constants/

index.ts
```

---

# Ejemplo

```
features/products/

components/

ProductCard.tsx

ProductGrid.tsx

ProductFilters.tsx

hooks/

useProducts.ts

services/

products.service.ts

types/

product.ts

schemas/

product.schema.ts

utils/

format-price.ts

constants/

product.constants.ts

index.ts
```

---

# shared

Todo aquello reutilizable.

Nunca colocar lógica específica.

```
shared/

components/

hooks/

service/

stores/

utils/

types/

icons/

constants/

validators/
```

---

## shared/components

```
Button

IconButton

Input

TextArea

Select

Checkbox

Switch

Radio

Badge

Chip

Card

Container

Section

Divider

Drawer

Modal

Accordion

Tooltip

Spinner

Skeleton

EmptyState

Typography

FloatingButton
```

---

## shared/hooks

```
useDebounce

useDisclosure

useMediaQuery

useLocalStorage

usePagination

useClickOutside
```

---

## shared/utils

```
currency.ts

date.ts

string.ts

number.ts

validation.ts

format.ts
```

---

## shared/types

```
api.ts

common.ts

pagination.ts

response.ts
```

---

# router

Toda la configuración de React Router.

```
router/

index.tsx

public.routes.tsx

admin.routes.tsx

guards/
```

Los Guards contendrán:

```
ProtectedRoute

PublicRoute

GuestRoute
```

---

# shared/services

Servicios compartidos de toda la aplicación.

Esta carpeta contendrá únicamente infraestructura reutilizable.

Nunca deberá contener lógica específica de una Feature.

```
shared/services/

api/

axios.ts

interceptors.ts

storage.ts

auth.service.ts
```

Los servicios específicos del negocio deberán ubicarse dentro de cada Feature.

Ejemplo:

```
features/products/services/

features/orders/services/

features/categories/services/
```

---

# shared/stores

Estado global compartido de la aplicación.

Todos los stores deberán implementarse utilizando Zustand.

```
shared/stores/

auth.store.ts

cart.store.ts

settings.store.ts
```

Cada store deberá representar un único dominio.

No mezclar estados de distintas funcionalidades en un mismo store.

Los stores administran estado; la lógica de negocio deberá vivir en los Services correspondientes.

---

# styles

```
styles/

globals.css

variables.css

animations.css

utilities.css

scrollbar.css
```

---

# assets

```
assets/

images/

logos/

icons/

illustrations/

backgrounds/

patterns/
```

---

# Public App

```
/

/productos

/categoria/:slug

/producto/:slug

/checkout

/nosotros

/contacto
```

Nunca existirán rutas administrativas visibles.

---

# Admin App

```
/admin

/admin/login

/admin/dashboard

/admin/products

/admin/categories

/admin/orders

/admin/customers

/admin/settings

/admin/profile
```

Todo el Panel utilizará AdminLayout.

---

# Backend

```
backend/

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

storage/

tests/
```

---

## Controllers

Responsables únicamente de recibir Requests y devolver Responses.

Nunca implementar lógica de negocio.

---

## Services

Toda la lógica del negocio.

---

## Repositories

Únicamente acceso a Supabase.

Nunca lógica.

---

## Schemas

Validaciones Zod.

---

## Middlewares

```
auth

role

error

validation

logger
```

---

# Database

```
database/

migrations/

seeds/

policies/

functions/

views/

backups/
```

---

## Storage

Bucket recomendado

```
products

categories

gallery

settings
```

---

# Convenciones

## Componentes

Los archivos y los componentes exportados utilizan PascalCase.

Ejemplo

```
ProductCard.tsx
```

---

## Hooks

Los archivos y los hooks exportados utilizan camelCase y comienzan con `use`.

```
useProducts.ts

useCart.ts
```

---

## Servicios

```
products.service.ts

orders.service.ts
```

---

## Stores

```
cart.store.ts

auth.store.ts
```

---

## Tipos

```
product.ts

order.ts

customer.ts
```

---

## Schemas

```
product.schema.ts

order.schema.ts
```

---

# Alias

Utilizar siempre alias.

```
@/app

@/config

@/layouts

@/pages

@/features

@/shared

@/router

@/shared/services

@/shared/stores

@/styles

@/assets
```

Nunca utilizar imports relativos largos como:

```
../../../../components
```

---

# Reglas de Organización

- Cada Feature debe ser independiente.
- Nunca duplicar componentes.
- Nunca duplicar Hooks.
- Nunca duplicar Utils.
- Nunca crear lógica de negocio en Pages.
- Nunca crear lógica de negocio en Layouts.
- Nunca acceder directamente a Supabase desde el Frontend.
- Toda llamada HTTP deberá pasar por `services/api`.
- Todo componente reutilizable deberá vivir en `shared/components`.
- Todo componente específico deberá vivir dentro de su Feature.

---

# Flujo de Desarrollo

Toda nueva funcionalidad deberá seguir el siguiente orden:

1. Crear Types.
2. Crear Schema.
3. Crear Service.
4. Crear Hook.
5. Crear Componentes.
6. Crear Página.
7. Integrar con Router.
8. Documentar si corresponde.

Nunca comenzar desarrollando la UI sin haber definido previamente los tipos y la estructura de datos.

---

# Regla Final

Antes de crear un archivo nuevo, el agente deberá responder internamente:

- ¿Ya existe una Feature para esta funcionalidad?
- ¿Ya existe un componente reutilizable?
- ¿Ya existe un Hook?
- ¿Ya existe un Service?
- ¿Ya existe un Type?
- ¿Ya existe una utilidad?

Si la respuesta es "Sí", deberá reutilizarla.

Si la respuesta es "No", podrá crear el archivo respetando esta estructura.

Nunca reorganizar el proyecto sin autorización explícita del usuario.
