## Implementar botón flotante de WhatsApp e integración con el Footer

# Objetivo

Implementar un canal de contacto mediante WhatsApp para el proyecto Margarita Arte y Deco.

La implementación debe consistir en:

- un botón flotante de WhatsApp visible en todo el sitio público;
- un enlace Contacto dentro del Footer;
- reutilizar el número de WhatsApp que actualmente se configura desde el Panel Administrativo.

La implementación debe respetar el Design System existente, mantener una arquitectura limpia y no duplicar lógica ni configuraciones.

## Contexto

Actualmente el sistema ya posee una configuración de WhatsApp administrada desde el Panel Administrativo.

El sitio público debe reutilizar exactamente esa configuración.

No crear una nueva configuración ni hardcodear números de teléfono.

El botón flotante y el enlace del Footer deben obtener el número desde la misma fuente de datos utilizada actualmente por el sistema.

Si ya existe una utilidad, hook o servicio para obtener esta configuración, reutilizarlo.

## Tareas

# 1. Analizar la implementación existente

Antes de implementar, analizar cómo el sitio obtiene actualmente la configuración del negocio.

Identificar:

- dónde se almacena el número de WhatsApp;
- cómo se obtiene;
- qué componentes ya utilizan esa información.

No duplicar implementaciones existentes.

# 2. Crear un componente reutilizable

Crear un componente reutilizable para el botón flotante.

Ejemplo:

    src/components/common/FloatingWhatsApp

o la estructura equivalente utilizada por el proyecto.

El componente debe ser completamente reutilizable.

# 3. Implementar el botón flotante

El botón debe:

- permanecer visible durante toda la navegación del sitio público;
- abrir WhatsApp utilizando el número configurado por el administrador;
- utilizar el mensaje predeterminado configurado por el sistema (si existe);
- si actualmente no existe un mensaje configurable, utilizar un mensaje por defecto sencillo, centralizado en una utilidad reutilizable y fácilmente reemplazable en el futuro;
- abrir en una nueva pestaña cuando corresponda;
- funcionar correctamente tanto en escritorio como en dispositivos móviles.

# 4. Diseño

El botón debe sentirse moderno y profesional.

Requisitos:

- botón circular;
- utilizar el color oficial de WhatsApp;
- sombra suave;
- transición elegante;
- efecto hover únicamente en escritorio;
- animaciones discretas;
- respetar el Design System.

No utilizar animaciones excesivas.

# 5. Responsive

Verificar el comportamiento en:

- móvil;
- tablet;
- escritorio.

El botón nunca debe:

- tapar contenido importante;
- interferir con el carrito;
- superponerse a modales;
- interferir con otros elementos flotantes.

Mantener una separación adecuada respecto de los bordes de la pantalla.

6. Accesibilidad

Agregar:

- aria-label;
- atributo title;
- tamaño adecuado para interacción táctil;
- foco visible mediante teclado.

# 7. Footer

Actualizar el apartado Información del Footer.

Debe contener:

- Política de Privacidad;
- Términos y Condiciones;
- Contacto.

El enlace Contacto debe abrir exactamente la misma conversación de WhatsApp que el botón flotante.

No duplicar lógica.

# 8. Reutilización

Si actualmente no existe una utilidad para abrir WhatsApp, crear una.

Por ejemplo:

    src/utils/whatsapp.ts

La utilidad deberá:

- construir correctamente la URL de WhatsApp;
- reutilizar el número configurado por el sistema;
- reutilizar el mensaje correspondiente.

Tanto el botón flotante como el Footer deberán utilizar esta utilidad.

# 9. Arquitectura

Antes de implementar:

- analizar la estructura actual del proyecto;
- reutilizar hooks, servicios y componentes existentes;
- evitar código duplicado;
- mantener consistencia con la arquitectura existente.

# 10. Calidad

Antes de finalizar:

- verificar TypeScript;
- verificar ESLint;
- verificar imports sin uso;
- verificar responsive;
- verificar accesibilidad;
- verificar que el botón funcione correctamente en escritorio y móvil;
- verificar que el Footer utilice exactamente la misma lógica;
- verificar que cualquier cambio futuro del número de WhatsApp realizado desde el Panel Administrativo se refleje automáticamente tanto en el botón flotante como en el Footer, sin necesidad de modificar el código del frontend.

## Resultado esperado

Al finalizar debe existir:

- un botón flotante de WhatsApp profesional y completamente responsive;
- un enlace Contacto en el Footer que abra la misma conversación de WhatsApp;
- reutilización de la configuración existente del negocio, sin duplicar datos;
- una implementación modular, escalable y consistente con la arquitectura actual del proyecto;
- código limpio, reutilizable y preparado para futuras ampliaciones.