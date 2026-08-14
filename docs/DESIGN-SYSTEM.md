# DESIGN-SYSTEM.md

# Margarita Arte & Deco

## Design System

Versión: 1.0

---

# Objetivo

Este documento define absolutamente todas las reglas visuales del proyecto.

Ningún agente podrá improvisar colores, tamaños, espaciados, tipografías o componentes.

Toda la interfaz deberá respetar este documento.

---

# Concepto Visual

La marca debe transmitir:

- Artesanía
- Elegancia
- Creatividad
- Cercanía
- Profesionalismo
- Inspiración
- Calidad

No debe parecer un ecommerce tradicional.

Debe sentirse como una marca artesanal premium.

Inspiraciones:

• Etsy

• Anthropologie

• Magnolia

• Hobby Lobby

• Michaels

---

# Identidad Visual

La estética general será:

✔ Minimalista

✔ Moderna

✔ Cálida

✔ Mucho espacio en blanco

✔ Fotografías grandes

✔ Formas orgánicas

✔ Bordes suaves

✔ Animaciones sutiles

✔ Sombras muy livianas

Nunca utilizar colores fuertes o saturados.

---

# Paleta Principal

## Verde Principal

Uso:

Elementos destacados

HEX

#6E8B74

---

## Verde Oscuro

Uso:

Header

Footer

Botones Primarios

CTA

Hover

Botones secundarios

HEX

#4F6B58

---

## Blanco

Uso:

Body

Cards

Fondos

HEX

#FFFFFF

---

## Crema

Uso:

Secciones alternadas

HEX

#F8F5F0

---

## Arena

Uso:

Fondos decorativos

HEX

#E8DED0

---

## Dorado

Uso:

Detalles

Badges

Iconos especiales

HEX

#D4B25A

---

## Gris Texto

HEX

#2F2F2F

---

## Gris Claro

HEX

#D9D9D9

---

# Colores Semánticos

## Error

HEX

#B42318

## Éxito

HEX

#2F6B45

## Advertencia

HEX

#8A6814

## WhatsApp

Uso:

Botones y enlaces de contacto mediante WhatsApp

HEX

#25D366

Los colores semánticos se utilizarán para texto, iconos y bordes de estado. Sus fondos deberán usar una variante con opacidad baja del mismo color.

---

# Backgrounds

Body

#FFFFFF

Header

#4F6B58

Footer

#4F6B58

Cards

#FFFFFF

Inputs

#FFFFFF

Drawer

#FFFFFF

Modals

#FFFFFF

Sections Alternadas

#F8F5F0

Nunca utilizar fondos negros.

Nunca utilizar modo oscuro.

---

# Logo

El archivo maestro es `frontend/src/assets/images/logo.png`. La variante
transparente para el Header y el Footer es
`frontend/src/assets/images/logo-header.png` y la variante WebP optimizada para
superficies crema es `frontend/src/assets/images/logo.webp`.

Ambos deben conservar sus proporciones, colores y composición original.

En producción, Header y Footer utilizarán el logo configurado por el
administrador y resuelto por el Backend desde el bucket privado `settings`. La
variante local `logo-header.png` es el respaldo obligatorio cuando no exista una
configuración válida o la imagen remota no pueda cargarse. El origen de la imagen
no alterará ninguna regla visual de esta sección.

## Logo Principal

Visible.

Ubicado en la esquina superior izquierda.

El Header y el Footer utilizarán únicamente `logo-header.png`, con fondo
transparente, trazos blancos y detalles dorados. De este modo, el logo comparte
el fondo verde de ambas superficies sin un recuadro intermedio.

La imagen debe renderizarse con `object-fit: contain`; nunca recortarla,
deformarla ni cambiar su tamaño al hacer scroll.

---

## Logo Decorativo

No utilizar `logo.png` como marca de agua porque su fondo crema forma parte de
la imagen. La variante transparente se reserva para fondos verdes del Header y
el Footer.

---

# Header

Color:

#4F6B58

Altura Desktop

96 px

Altura Mobile

72 px

Sticky

Sí

Glass Effect

Sí

Al hacer scroll:

- Agregar blur
- Mantener fondo verde con transparencia
- Sombra muy suave
- Mantener estables la altura del Header y el tamaño del logo

---

# Navegación

Color

Blanco

Hover

Dorado

Elemento activo

Subrayado dorado

Tipografía

Poppins

Peso

500

Nunca utilizar mayúsculas completas.

---

# Tipografías

## Principal

Cormorant Garamond

Uso:

Hero

Títulos

Logo

Frases importantes

---

## Secundaria

Poppins

Uso:

Todo el contenido

Botones

Menús

Cards

Formularios

Footer

---

# Escala Tipográfica

Hero

64 px

H1

48 px

H2

36 px

H3

28 px

Body

18 px

Small

15 px

Caption

13 px

---

# Espaciado

Sistema basado en múltiplos de 8.

8

16

24

32

40

48

64

80

96

128

Nunca utilizar valores aleatorios.

---

# Border Radius

Botones

14 px

Cards

20 px

Inputs

12 px

Categorías

100%

Drawer

28 px

---

# Sombras

Muy suaves.

Nunca exageradas.

Utilizar una sola elevación por defecto.

Ejemplo:

0 10px 30px rgba(0,0,0,.08)

---

# Botones

## Primario

Verde oscuro

Texto blanco

Hover:

Mantener Verde oscuro y aplicar la escala definida

Escala:

1.02

---

## Secundario

Blanco

Borde verde

Hover:

Verde

Texto blanco

## Biblioteca Base

Todos los componentes base utilizarán exclusivamente los colores, tipografías,
espaciados, radios, sombras y estados definidos en este documento.

### Button

- Altura mínima de 44 px.
- Padding horizontal de 24 px.
- Radius de 14 px.
- Variantes: `primary`, `secondary` y `ghost`.
- Tamaños: `small`, `medium` y `large`, manteniendo siempre un área interactiva
  mínima de 44 × 44 px.
- El estado `loading` conservará el ancho y mostrará Spinner con texto accesible.

### IconButton

- Área de 44 × 44 px.
- Radius de 14 px.
- Variantes visuales equivalentes a Button.
- Siempre requiere un nombre accesible.

### Campos de formulario

Input, TextArea y Select compartirán:

- Altura mínima de 44 px, salvo TextArea.
- Padding interno de 16 px.
- Radius de 12 px.
- Borde Gris Claro; Verde Principal en hover y Verde Oscuro en focus.
- Label visible, texto de ayuda opcional y mensaje de error asociado mediante ARIA.
- TextArea tendrá una altura inicial de 128 px y podrá crecer verticalmente.

### Controles de selección

- Checkbox y Radio utilizarán un control visible de 24 px y un área interactiva
  mínima de 44 px.
- Switch tendrá 48 × 24 px y desplazará un indicador circular de 24 px.
- El estado seleccionado utilizará Verde Principal y nunca dependerá únicamente
  del color.
- Cada control tendrá label visible y descripción opcional.

### Badge y Chip

- Forma de píldora.
- Padding de 8 px vertical y 16 px horizontal.
- Badge comunica estados con variantes `neutral`, `success`, `warning` y `error`.
- Chip representa filtros o selecciones y puede ser interactivo o removible.
- Un Chip interactivo mantendrá un área mínima de 44 px.

### Card

- Fondo Blanco, radius de 20 px, padding de 24 px y elevación por defecto.
- No utilizar borde visible.
- Solo tendrá elevación y desplazamiento en hover cuando sea interactiva.

### Container y Section

- Container centra el contenido y aplica padding horizontal responsive de 16,
  24 o 32 px según los breakpoints oficiales.
- Section utiliza padding vertical de 64, 80 o 96 px.
- Section admite fondo Blanco o Crema.

### Paneles de datos administrativos

- El contenido del Dashboard tendrá un ancho máximo de 1120 px y utilizará el
  token `--container-admin`.
- Las métricas relacionadas se agruparán en una sola superficie con divisores;
  no se presentará cada número como una card independiente.
- Inventario y actividad reciente podrán utilizar paneles blancos con borde Gris
  Claro, sin elevación decorativa.
- Los valores numéricos usarán cifras tabulares y los estados reutilizarán las
  variantes semánticas de Badge.

### Divider

- Línea de 1 px en Gris Claro.
- Puede ser horizontal o vertical.
- Es decorativo por defecto y no debe agregar ruido al árbol de accesibilidad.

### Modal

- Overlay oficial, capa 100 y cierre mediante botón, tecla Escape o clic en el
  overlay cuando la acción no sea destructiva.
- Ancho máximo de 560 px, radius de 20 px y padding de 24 px.
- Debe atrapar el foco y devolverlo al elemento que lo abrió.

### Drawer

- Overlay oficial, capa 90, ancho máximo de 420 px y radius de 28 px.
- Puede abrirse desde la derecha, la izquierda o desde el borde inferior.
- En móvil ocupa el ancho disponible.
- La variante inferior utiliza el contenido necesario, conserva el radius de 28 px
  en sus esquinas superiores y respeta el área segura del dispositivo.
- Debe atrapar el foco, cerrarse con Escape y devolver el foco al activador.
- Cuando la variante inferior complementa una barra de navegación persistente,
  puede ser no modal: se ubicará por encima de la barra, mantendrá visibles y
  operables sus acciones, y conservará cierre explícito y mediante Escape.

### Accordion

- Cada encabezado es un botón de al menos 44 px.
- Utiliza Divider entre elementos y un icono Lucide para comunicar expansión.
- Expone `aria-expanded` y relaciona encabezado y panel mediante ARIA.
- La animación dura 200 ms y respeta `prefers-reduced-motion`.

### Tooltip

- Fondo Verde Oscuro, texto Blanco, radius de 12 px y padding de 8 px.
- Capa 110.
- Solo complementa un nombre accesible existente.
- Aparece con hover o foco y se cierra con Escape.

### Spinner y Skeleton

- Spinner utiliza Verde Principal, tamaño base de 24 px y texto alternativo
  accesible.
- Skeleton utiliza Gris Claro, radius de 12 px y un shimmer sutil de 1500 ms.
- El skeleton de producto replica la jerarquía y dimensiones aproximadas de la card
  final para evitar saltos de layout durante la carga.
- Ambos respetan `prefers-reduced-motion`.

### Empty State

- Alineación centrada, icono Lucide, título, explicación breve y acción opcional.
- Espaciado interno de 32 px.
- No utiliza Card anidada ni ilustraciones improvisadas.

### Floating Button

- Forma circular de 48 × 48 px.
- Se ubica a 24 px de los bordes disponibles.
- Usa la capa del contexto donde se incorpora, sin superar Toast.
- Siempre requiere nombre accesible.

### Typography

- Variantes: `hero`, `h1`, `h2`, `h3`, `body`, `small` y `caption`.
- Hero y headings utilizan Cormorant Garamond.
- Body, small y caption utilizan Poppins.
- Los headings usan `text-wrap: balance`; el contenido extenso usa
  `text-wrap: pretty`.

---

# Cards

Color

Blanco

Radius

20 px

Padding

24 px

Hover

TranslateY(-6px)

Sombra suave

Nunca utilizar bordes visibles.

---

# Categorías

La Landing presentará dos grupos visibles: "Arte para crear" y "Decoraciones
listas para disfrutar". No ocultará uno detrás de pestañas, selectores o gestos.
Cada grupo incluirá una explicación breve y una acción para consultar todos sus
productos.

Forma

Circular

140 px

En móvil

160 px

Imagen

Circular

Fuente:

- Archivo cuadrado WebP de al menos 560 × 560 px.
- Sujeto principal centrado y completamente visible dentro del recorte circular.
- Evitar reutilizar una imagen genérica entre categorías diferentes.
- Mantener detalle, contraste y foco uniforme en el área central.

Padding interno

8 px alrededor del conjunto

Borde

3 px blanco

Hover

Elevación vertical sin escalar la imagen raster

Elevación

Cuando está seleccionada:

Borde verde oscuro

Check superior derecho

Halo verde muy sutil

Mostrar cantidad de productos

Cada categoría será un único botón compuesto por una imagen circular, el nombre y la cantidad de productos. El nombre y la cantidad se ubicarán debajo de la imagen para conservar su legibilidad sin utilizar overlay.

La opción "Todos" utilizará un círculo con fondo Arena, texto Verde Oscuro y un icono Lucide de cuadrícula, seguido por su nombre y el total de productos.

Estado seleccionado:

- Superficie Blanca con radius de Card detrás del conjunto.
- Borde circular de 3 px en Verde Oscuro.
- Halo exterior verde sutil alrededor de la imagen.
- Check superpuesto en la esquina superior derecha de la imagen, visible por
  encima del borde y sin recortes.
- `aria-pressed="true"`.
- No depender únicamente del color.

Sobre el grid deberá mostrarse el indicador textual `Estás viendo: {categoría}`. La opción "Todos" utilizará `Todos los productos`.

Las categorías se desplazarán horizontalmente mediante gesto táctil, rueda horizontal,
trackpad o dos botones IconButton con flechas Lucide ubicados a ambos lados. Las
flechas conservarán un área interactiva de 44 × 44 px, permanecerán disponibles en
todos los breakpoints cuando exista contenido fuera del área visible y se
deshabilitarán al alcanzar cada extremo.

La barra de desplazamiento nativa permanecerá oculta para evitar ruido visual sin
eliminar el desplazamiento horizontal. En móvil, las flechas seguirán visibles para
comunicar que existen más categorías y convivirán con el gesto táctil.

---

# Tablas administrativas

Las tablas de gestión utilizarán una superficie Blanca con borde Gris Claro y
radius de Card. El encabezado tendrá Fondo Crema, tipografía Caption en Verde
Oscuro y títulos en mayúsculas. Los valores numéricos usarán cifras tabulares y
los estados se comunicarán mediante Badge semántico y texto, nunca solo color.

En anchos inferiores a 1024 px las filas se reorganizarán como fichas verticales
con etiquetas visibles. No se utilizará scroll horizontal para resolver la falta
de espacio. Los filtros permanecerán antes de los resultados, usarán los campos
estándar del sistema y pasarán progresivamente de una a varias columnas.

Las imágenes de producto usarán el placeholder oficial cuando la URL firmada no
exista o falle. Los estados de carga conservarán la estructura mediante Skeleton;
los estados vacíos y de error deberán ofrecer una explicación y una acción útil.

---

# Productos

Cards verticales.

Imagen superior.

Cuando la imagen de un producto esté temporalmente ausente o falle su carga, se
utilizará `frontend/src/assets/images/product-placeholder.webp`. El placeholder
mantendrá el mismo aspect ratio y recorte de la card, con texto alternativo que
indique que la imagen del producto no está disponible. No sustituye la imagen
propia requerida para publicar el producto.

Nombre.

Precio.

Descripción.

Contador.

Botón Agregar al carrito.

Selector de cantidad:

- Botones IconButton para disminuir y aumentar.
- Cantidad centrada y legible.
- Disminuir deshabilitado en 1.
- Aumentar deshabilitado al alcanzar el stock.
- Ubicado inmediatamente antes de Agregar al carrito.
- Controles con nombres accesibles que incluyan el producto.

Badge:

Nuevo

Oferta

Destacado

Sin stock

Cuando no exista stock:

- Mostrar el Badge "Sin stock" con color semántico de Error.
- Deshabilitar el botón Agregar al carrito.
- Mantener visible el producto si está activo.

Después de agregar:

- Mostrar feedback breve de éxito.
- No abrir automáticamente el Drawer.
- Mantener la posición del usuario en el catálogo.

---

# Carrito

Drawer lateral derecho.

Ancho Desktop

420 px

Color

Blanco

Radius

28 px

Shadow

Suave

El Drawer incluirá productos, precio unitario, controles de cantidad, acción para eliminar, subtotal, descuento, total y el botón "Continuar compra".

En móvil podrá ocupar todo el ancho disponible.

---

# Formularios

Inputs

44 px mínimo

Radius

12 px

Focus

Borde verde

Error

Rojo suave

Nunca utilizar borde negro.

---

# Estados Interactivos

Todos los botones, controles y enlaces deberán tener estados Default, Hover, Focus y Disabled. Cuando corresponda, también tendrán Loading, Error y Success.

En la navegación completa de la Landing, el enlace correspondiente a la sección
visible utilizará el mismo indicador dorado del estado activo y comunicará su
ubicación mediante `aria-current="location"`. Este seguimiento por scroll no se
aplicará al menú móvil.

Focus visible:

- Outline de 3 px en Verde Oscuro.
- Separación de 2 px respecto del componente.
- Nunca eliminar el outline sin reemplazarlo por este indicador.

Disabled:

- Opacidad 55%.
- Cursor `not-allowed`.
- Sin animaciones ni acciones.

Loading:

- Mantener el tamaño del componente.
- Bloquear interacciones repetidas.
- Mostrar Spinner junto a un texto accesible.

Área interactiva mínima:

44 × 44 px.

---

# Capas y Overlays

Overlay:

`rgba(47, 47, 47, 0.45)`

Escala de capas:

- Header sticky: 50.
- Drawer: 90.
- Modal: 100.
- Tooltip: 110.
- Toast: 120.

Modal:

- Ancho máximo 560 px.
- Ancho móvil `calc(100% - 32px)`.
- Fondo blanco, radius de 20 px y padding de 24 px.

Drawer:

- Ancho máximo 420 px.
- En móvil ocupa como máximo el 100% del viewport.

---

# Iconografía

Lucide React

Trazo

2 px

Nunca mezclar diferentes librerías.

---

# Animaciones

Framework

Framer Motion

Duración

200–500 ms

Permitidas:

Reveal

Fade

Scale

Slide

Floating

Parallax muy suave

Ripple

Navbar Blur

Zoom

Nunca utilizar animaciones llamativas.

---

# Responsive

Desktop

≥1280 px

Laptop

1024 px

Tablet

768 px

Mobile

480 px

Mobile Small

360 px

## Navegación administrativa

- En viewports menores a 480 px, el Panel Administrativo utiliza una barra
  inferior con las acciones Inicio, Gestión y Cuenta.
- Gestión y Cuenta abren un Drawer inferior compacto y no modal, ubicado por
  encima de la barra para que Inicio, Gestión y Cuenta permanezcan visibles y
  operables. La barra y los paneles respetan las áreas seguras del dispositivo
  y mantienen acciones de al menos 44 × 44 px.
- Desde 480 px y hasta 1279 px, la navegación utiliza hamburguesa y Drawer
  lateral izquierdo.
- Desde 1280 px, utiliza Sidebar permanente y oculta la hamburguesa.

---

# Accesibilidad

Contraste WCAG AA

Alt obligatorio

Focus visible

Navegación por teclado

ARIA Labels

---

# SEO

Open Graph

JSON-LD

Schema.org

Meta Description

Lazy Loading

---

# Regla Final

Si algún componente necesita un color, tipografía, tamaño o espaciado que no esté definido aquí:

NO improvisar.

Actualizar primero este Design System y luego implementar el componente.
