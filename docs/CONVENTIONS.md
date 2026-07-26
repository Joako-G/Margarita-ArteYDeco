# CONVENTIONS.md

# Margarita Arte & Deco

## Coding Conventions

Versión 1.0

---

# Objetivo

Este documento define todas las convenciones obligatorias del proyecto.

Todos los agentes deben seguir estas reglas.

Nunca romper estas convenciones.

---

# Idioma

Código

Inglés

Comentarios

Español únicamente cuando aporten valor.

Interfaz

Español.

---

# Archivos

Archivos de componentes:

PascalCase, igual que el componente exportado.

Ejemplos

ProductCard.tsx

ShoppingCart.tsx

CheckoutForm.tsx

Archivos de hooks:

camelCase comenzando con `use`, igual que el hook exportado.

Ejemplos

useProducts.ts

useCart.ts

Servicios, schemas, stores, tipos y utilidades:

kebab-case.

Ejemplos

products.service.ts

product.schema.ts

cart.store.ts

format-price.ts

---

# Componentes

PascalCase.

Ejemplo

ProductCard

CheckoutDrawer

CategoryCircle

HeroSection

---

# Hooks

Comenzar siempre con:

use

Ejemplos

useProducts

useCart

useCategories

useCheckout

---

# Stores

Finalizar con:

Store

Ejemplo

cartStore

authStore

settingsStore

---

# Services

Finalizar con:

Service

Ejemplo

productService

orderService

customerService

---

# Repositories

Finalizar con:

Repository

Ejemplo

productRepository

---

# Controllers

Finalizar con:

Controller

---

# DTO

Finalizar con:

Dto

CreateProductDto

UpdateOrderDto

---

# Interfaces

Prefijo I

IProduct

ICategory

IOrder

---

# Types

Sufijo Type

ProductType

OrderType

---

# Enums

Sufijo Enum

OrderStatusEnum

PaymentMethodEnum

---

# Variables

camelCase

productPrice

customerPhone

shoppingCart

---

# Constantes

SCREAMING_SNAKE_CASE

DEFAULT_PAGE_SIZE

MAX_UPLOAD_SIZE

DEFAULT_DISCOUNT

---

# Booleanos

Siempre comenzar con:

is

has

can

should

Ejemplos

isActive

canCheckout

shouldShowPrice

---

# Funciones

Siempre comenzar con un verbo.

calculateDiscount

createOrder

fetchProducts

updateCustomer

removeProduct

---

# Eventos

handleClick

handleSubmit

handleCheckout

handleDelete

---

# CSS

No utilizar IDs.

Utilizar únicamente clases.

No utilizar estilos inline.

---

# Imports

Orden obligatorio

1 React

2 Librerías

3 Componentes

4 Hooks

5 Stores

6 Services

7 Types

8 Utils

9 CSS

---

# Componentes

Un componente debe tener una responsabilidad clara. Extraer subcomponentes, hooks o utilidades cuando mejore la reutilización, legibilidad o capacidad de prueba.

Las 250 líneas son una señal de revisión, no un límite absoluto. Si un componente las supera, evaluar su división; dividirlo solo cuando las partes resultantes tengan una responsabilidad coherente. No fragmentar por cantidad de líneas ni crear componentes de un solo uso sin una razón clara.

---

# Hooks

Máximo recomendado:

150 líneas.

---

# Funciones

Una función debe expresar una única operación y mantener una complejidad fácil de entender. Las 40 líneas son una señal de revisión, no una regla estricta.

Si una función supera ese tamaño, extraer funciones solo si existen pasos con nombre propio, lógica reutilizable o ramas complejas. No extraer fragmentos triviales únicamente para cumplir un conteo de líneas.

---

# JSX

Nunca más de dos niveles de anidación.

Si ocurre:

Extraer componente.

---

# Props

Nunca pasar más de diez props.

Si ocurre:

Crear objeto.

---

# Estado

Local

useState

Global

Zustand

Servidor

TanStack Query

---

# Formularios

Siempre

React Hook Form

+

Zod

---

# Validaciones

Nunca validar únicamente en frontend.

Toda validación debe existir también en backend.

---

# API

Nunca utilizar fetch.

Siempre Axios.

---

# Errores

Nunca usar alert().

Utilizar componentes visuales.

Toast.

Modal.

Banner.

---

# Console

No dejar console.log en producción.

---

# Imágenes

Lazy Loading.

Alt obligatorio.

WebP cuando sea posible.

---

# Accesibilidad

aria-label

roles

focus visible

Contraste AA

---

# Responsive

Mobile First.

Breakpoints oficiales.

xs

sm

md

lg

xl

2xl

Nunca utilizar valores arbitrarios.

---

# Animaciones

Framer Motion.

Duración máxima:

500 ms.

No abusar de animaciones.

---

# Performance

Memo únicamente cuando aporte valor.

No optimizar prematuramente.

---

# Reutilización

Antes de crear cualquier componente nuevo, verificar:

¿Ya existe?

¿Puede reutilizarse?

¿Puede extenderse?

Nunca duplicar componentes.

---

# Regla Final

Si alguna decisión entra en conflicto con:

AGENTS.md

o

DECISIONS.md

Siempre prevalecerán esos documentos.

CONVENTIONS.md únicamente define la forma de escribir el proyecto.
