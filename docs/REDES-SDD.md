## Implementar sección de Redes Sociales en el Footer

# Objetivo

Agregar una sección de redes sociales dentro del Footer del sitio público.

La implementación debe mantener el diseño minimalista existente y reforzar la identidad visual de la marca sin recargar el Footer.

# Ubicación

No crear una nueva columna.

Agregar las redes sociales debajo de la descripción del negocio, en la columna donde actualmente se encuentra:

- el logotipo;
- la descripción de Margarita Arte y Deco.

La estructura final debe ser similar a:

LOGO

Materiales para crear y decoraciones
terminadas a mano.

[ Instagram ] [ Facebook ] [ TikTok ]

Los iconos deben aparecer inmediatamente debajo de la descripción, manteniendo un buen espaciado vertical.

# Diseño

No mostrar texto.

Mostrar únicamente los iconos oficiales de:

- Instagram
- Facebook
- TikTok

Utilizar una librería de iconos ya existente en el proyecto (por ejemplo, Lucide o React Icons) si está disponible.

No incorporar nuevas dependencias si ya existe una alternativa instalada.

# Apariencia

Los iconos deben utilizar:

color blanco;
mismo tamaño;
mismo grosor visual.

Tamaño aproximado:

22px - 24px

Mantener consistencia con el resto del Footer.

# Hover

Implementar un hover elegante y sutil.

Al pasar el cursor sobre un icono:

- cambiar el color al verde claro o al color de acento definido por el Design System;
- aplicar una ligera escala entre 1.05 y 1.1;
- transición suave de aproximadamente 200 ms.

No utilizar rotaciones.

No utilizar rebotes.

No utilizar animaciones exageradas.

El efecto debe sentirse premium.

# Arquitectura

Antes de implementar, analizar cómo el proyecto obtiene actualmente la configuración del negocio.

No crear lógica específica para cada red social.

Diseñar el componente para trabajar con una colección genérica de redes sociales.

Ejemplo conceptual:

socialLinks = [
  {
    id,
    name,
    url,
    icon,
    enabled
  }
]

El componente debe renderizar las redes recorriendo esta colección.

Evitar JSX repetido.

No crear un bloque independiente para cada red.

# Configuración actual

Actualmente el Panel Administrativo permite configurar:

- Instagram
- Facebook
- TikTok

Estas URLs deben obtenerse desde la configuración existente del negocio.

No hardcodearlas.

# Configuración de TikTok

TikTok debe obtenerse desde la configuración del negocio, igual que Instagram y
Facebook. No se utilizarán URLs temporales ni valores hardcodeados en el
Frontend.

Debe limitarse a renderizar la colección de redes sociales.

No deberá ser necesario modificar:

- el Footer;
- el componente de redes sociales;
- la lógica de renderizado.

# Visibilidad

Instagram:

- si no existe URL configurada, no mostrar el icono.

Facebook:

- si no existe URL configurada, no mostrar el icono.

TikTok:

- si no existe URL configurada, no mostrar el icono.

El componente debe adaptarse automáticamente si una o varias redes no están disponibles.

No dejar espacios vacíos.

# Accesibilidad

Cada icono debe incluir:

- aria-label;
- title;
- apertura en nueva pestaña (target="_blank");
- rel="noopener noreferrer".

# Responsive

Verificar:

- escritorio;
- tablet;
- móvil.

Los iconos deben mantenerse centrados respecto al contenido de la columna.

No romper el layout del Footer.

Mantener una separación uniforme entre iconos.

# Reutilización

Si resulta conveniente, crear un pequeño componente reutilizable para renderizar enlaces sociales.

El Footer únicamente deberá consumir dicho componente.

Mantener una arquitectura limpia y modular

# Calidad

Antes de finalizar:

- verificar TypeScript;
- verificar ESLint;
- verificar responsive;
- verificar accesibilidad;
- comprobar que los enlaces de Instagram, Facebook y TikTok utilicen la configuración existente;
- verificar que el Footer mantenga una apariencia limpia y equilibrada;
- asegurar que el comportamiento del hover sea consistente con el resto de las interacciones del sitio.

Resultado esperado

Al finalizar, el Footer debe reforzar la identidad de Margarita Arte y Deco incorporando una pequeña sección de redes sociales elegante y minimalista.

Los iconos deben integrarse visualmente con el logotipo, utilizar un diseño limpio y profesional, adaptarse automáticamente a la configuración disponible y quedar preparados para que, en el futuro, TikTok también pueda obtenerse desde el Panel Administrativo sin modificar la arquitectura del componente.
