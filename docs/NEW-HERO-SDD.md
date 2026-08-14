## Reemplazar el Hero por un nuevo encabezado premium para la sección principal de la pagina

# Objetivo

Reemplazar el Hero principal de la Home por un nuevo encabezado editorial y minimalista que introduzca la sección principal del catálogo.

Este encabezado reemplazará completamente el Hero actual y será el nuevo inicio visual de la página principal.

En el futuro, inmediatamente encima de este encabezado, se implementará un carrusel de promociones y ofertas, por lo que el diseño debe quedar preparado para ello.

# Concepto

El diseño debe transmitir elegancia utilizando únicamente:

- tipografía;
- espacio en blanco;
- pequeños detalles decorativos;
- una división sutil del fondo.

No utilizar:

- imágenes;
- botones;
- tarjetas;
- ilustraciones.

El objetivo es que la atención recaiga completamente sobre el título.

# Composición

Crear un bloque centrado.

El fondo debe ocupar todo el ancho de la pantalla.

Dividir visualmente el fondo en dos partes horizontales.

La mitad superior mantiene el color principal del sitio.

La mitad inferior utiliza un tono apenas más cálido perteneciente a la paleta del proyecto.

La transición debe ser completamente plana y sutil.

Título

Mostrar exactamente:

Nuestros
Productos

Las palabras deben estar en dos líneas.

El centro del texto debe coincidir aproximadamente con la línea divisoria del fondo.

Visualmente debe dar la sensación de que el fondo atraviesa el título.

# Tipografía

Utilizar la tipografía serif definida en el Design System.

Color:

- verde principal de la marca.

Peso:

- Bold.

Desktop:

font-size: clamp(4rem, 8vw, 6.5rem);

Tablet:

Reducir proporcionalmente.

Mobile:

Entre:

3rem

y

4rem

# Elementos decorativos

Agregar únicamente pequeños detalles lineales.

Ejemplos:

- una pequeña estrella lineal a la izquierda;
- pequeñas líneas decorativas a la derecha;
- debajo del título agregar:
    ──────── ♡ ────────

Todos los elementos deben utilizar el verde principal.

No utilizar iconografía pesada.

# Texto descriptivo

Debajo del separador agregar un texto centrado.

Ejemplo:

    Descubrí nuestra colección de artículos de arte y decoración pensados para inspirar cada espacio.

Máximo dos líneas.

Color gris suave.

Ancho máximo cercano a 600 px.

# Altura

Este bloque debe ocupar aproximadamente:

- Desktop: 260–320 px.
- Tablet: proporcional.
- Mobile: 200–240 px.

No debe sentirse como un Hero.

El usuario debe comenzar a visualizar el contenido rápidamente.

# Preparado para futuras promociones

No implementar todavía el carrusel.

Sin embargo, la estructura debe permitir agregar una sección de promociones inmediatamente encima sin modificar este encabezado.

# Responsive

Verificar:

- Desktop.
- Tablet.
- Mobile.

Mantener la composición centrada.

No generar scroll horizontal.

Escalar correctamente el tamaño de la tipografía.

# Animación

Agregar únicamente:

- Fade In.
- TranslateY suave.

Duración aproximada entre 300 y 500 ms.

# Arquitectura

- Reutilizar componentes existentes cuando sea posible.
- No duplicar estilos.
- Mantener consistencia con el Design System.
- Código modular y limpio.

# Resultado esperado

La Home debe comenzar con un encabezado editorial, premium y minimalista que sustituya al Hero actual y funcione como introducción al catálogo. Debe transmitir una imagen elegante, dejar espacio para un futuro carrusel de promociones y guiar naturalmente al usuario hacia las categorías y productos.

Un último consejo de UX: si vas a tener un carrusel de ofertas arriba, dejaría un margen de unos 48–64 px entre el carrusel y este encabezado. Así ambos bloques respiran y no compiten visualmente entre sí.