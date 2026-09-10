Implementar Política de Privacidad
Objetivo

Implementar una página profesional de Política de Privacidad para el proyecto Margarita Arte y Deco, adaptada al funcionamiento real de la aplicación.

La implementación debe respetar la arquitectura actual del proyecto, mantener el Design System y reutilizar los componentes existentes.

Contexto del proyecto

La web solicita los siguientes datos personales durante el checkout:

Nombre
Apellido
Número de teléfono
Observaciones opcionales
Dirección, únicamente cuando se elige envío

Estos datos se utilizan exclusivamente para:

identificar al cliente;
gestionar el pedido;
contactar al cliente para informar el estado del pedido;
coordinar el retiro o la entrega;
permitir que el dueño del comercio consulte la información desde el Panel Administrativo, específicamente en la sección Pedidos, para realizar el seguimiento correspondiente.

La aplicación actualmente:

NO vende datos personales;
NO comparte datos con terceros con fines comerciales;
NO utiliza los datos para campañas de marketing;
NO envía publicidad;
NO requiere registro de usuarios;
NO permite crear cuentas de clientes;
NO almacena tarjetas de crédito;
conserva el método de pago elegido y el estado operativo del cobro, pero no credenciales ni
datos de tarjetas;
utiliza una cookie técnica `HttpOnly` para asociar pedidos al dispositivo y una
pista local no sensible con el número del último pedido;
procesa datos técnicos mínimos para seguridad, CSRF, rate limiting y CAPTCHA
adaptativo;
conserva los datos de clientes y pedidos dentro de la base de datos para mantener el historial comercial del negocio.

La Política de Privacidad debe describir únicamente el comportamiento real de la aplicación.

No incluir funcionalidades que todavía no existen.

## Tareas

## 1. Crear la nueva página

Crear una nueva página pública para la Política de Privacidad.

Utilizar la estructura del proyecto y ubicarla en la carpeta correspondiente (por ejemplo src/pages/legal si existe una estructura para páginas legales).

La página debe reutilizar:

Layout público existente.
Header existente.
Footer existente.
Sistema de tipografía.
Sistema de colores.
Componentes reutilizables.

No duplicar código ni estilos.


## 2. Agregar la ruta

Agregar la ruta pública:

    /politica-de-privacidad

Integrarla con React Router sin afectar la navegación existente.

## 3. Crear el contenido

Generar un contenido profesional, claro y fácil de comprender.

Dividir el documento en secciones:

## Introducción

Explicar que Margarita Arte y Deco respeta la privacidad de sus clientes y protege la información personal que éstos proporcionan al utilizar la página.

## Datos que recopilamos

Indicar claramente que se solicitan:

- Nombre.
- Apellido.
- Número de teléfono.
- Observaciones opcionales del pedido.
- Dirección de entrega únicamente para envíos.
- Método de pago elegido y datos operativos del pedido.
- Cookies y huellas técnicas estrictamente necesarias para sesión anónima,
  seguridad, prevención de abuso y recuperación.

No afirmar que se recopilan tarjetas, credenciales bancarias, publicidad o
tracking comercial mientras esas funciones no existan.

## Finalidad del tratamiento

Explicar que los datos se utilizan exclusivamente para:

- gestionar pedidos;
- contactar al cliente;
- informar el estado del pedido;
- coordinar el retiro o la entrega;
- responder consultas relacionadas con un pedido;
- permitir la gestión interna del negocio mediante el Panel Administrativo.
- proteger la consulta de pedidos y prevenir abuso o fraude.

Aclarar expresamente que los datos no se utilizan con fines publicitarios o comerciales.

## Datos compartidos

Explicar claramente que:

- no se venden datos personales;
- no se comparten con terceros para fines comerciales.

Identificar a Supabase, Vercel y Turnstile según su uso real. Las tipografías son locales
en WOFF2 y no requieren Google Fonts. No mencionar Mercado
Pago como encargado efectivo hasta que la pasarela sea habilitada.

## Seguridad

Explicar que se implementan medidas razonables para proteger la información almacenada.

No prometer seguridad absoluta.

Utilizar un lenguaje profesional y realista.

## Conservación de los datos

Esta sección debe reflejar exactamente el funcionamiento actual del sistema.

Explicar que:

- los datos personales y los pedidos se almacenan en la base de datos del sistema;
- esta información permite administrar correctamente los pedidos;
- permite consultar pedidos anteriores desde el Panel Administrativo;
- permite mantener un historial comercial del negocio;
- puede utilizarse para brindar soporte posterior a una compra cuando sea necesario;
- también puede conservarse para cumplir obligaciones legales o administrativas cuando corresponda.

Indicar además que:

Los datos se conservarán únicamente durante el tiempo que resulte necesario para cumplir estas finalidades y, cuando ya no sean necesarios, podrán ser eliminados o anonimizados de forma segura.

No indicar plazos específicos.

No mencionar eliminación automática.

No mencionar funcionalidades futuras.

## Derechos del usuario

Explicar que el cliente puede solicitar:

- acceso a sus datos;
- actualización;
- rectificación;
- eliminación de sus datos personales, siempre que ello sea compatible con las obligaciones legales que pudieran corresponder.

Utilizar lenguaje claro y sencillo.

## Contacto

Agregar una sección indicando que cualquier consulta relacionada con la privacidad de los datos personales podrá realizarse mediante los medios oficiales de contacto del comercio.

Publicar para derechos de privacidad el buzón confirmado:
`margaritas.arteydeco.jujuy@gmail.com`.

Mantener los demás datos de contacto provenientes de la configuración del negocio.

## 4. Diseño

La página debe sentirse profesional y fácil de leer.

No crear un bloque enorme de texto.

Utilizar:

- títulos;
- subtítulos;
- listas cuando sea conveniente;
- separación entre secciones;
- ancho máximo cómodo para lectura;
- buen espaciado vertical.

Debe ser completamente responsive.

Mantener el mismo estilo visual del resto del sitio.

## 5. Footer

Modificar el Footer agregando un nuevo apartado denominado:

    Información

Dentro de este apartado agregar, por el momento, únicamente:

- Política de Privacidad.

Utilizar React Router para la navegación.

No utilizar enlaces <a href=""> para rutas internas.

Diseñar el apartado de forma que posteriormente puedan agregarse fácilmente:

- Términos y Condiciones.
- Cambios y Devoluciones.

## 6. Arquitectura

Analizar la estructura del proyecto antes de implementar.

Si resulta conveniente, crear componentes reutilizables para futuras páginas legales, por ejemplo:

- LegalLayout
- LegalSection

Evitar duplicación de código.

Mantener una arquitectura escalable y consistente con el resto del proyecto.

## 7. Accesibilidad

Verificar:

- estructura semántica correcta;
- un único H1;
- jerarquía correcta de encabezados;
- navegación mediante teclado;
- focus visible;
- contraste adecuado.

## 8. SEO

Agregar:

- título de la página;
- meta description;
- H1 descriptivo.

Mantener consistencia con el resto del sitio.

## 9. Calidad

Antes de finalizar:

verificar TypeScript;
verificar ESLint;
verificar imports sin uso;
verificar que no existan estilos duplicados;
verificar responsive en móvil, tablet y escritorio;
verificar la navegación desde el footer;
verificar que el contenido refleje exactamente el comportamiento actual de la aplicación.

No agregar información ficticia ni funcionalidades que todavía no existen.

## Resultado esperado

Al finalizar debe existir:

- una nueva página pública /politica-de-privacidad;
- una Política de Privacidad profesional, clara y alineada con el funcionamiento real del sistema;
- integración completa con el layout existente;
- enlace desde el footer;
- componentes reutilizables para futuras páginas legales cuando resulte conveniente;
- código limpio, modular, escalable y consistente con la arquitectura del proyecto.

## Actualización obligatoria para activar el Botón de Arrepentimiento

La Política de Privacidad publicada deberá actualizarse junto con la funcionalidad
y describir, además de los pedidos:

- número de pedido opcional, celular, comentario y código de solicitud;
- finalidad de registrar, verificar, gestionar y auditar el arrepentimiento;
- fingerprints HMAC e información técnica usada para idempotencia, seguridad,
  prevención de abuso y CAPTCHA adaptativo;
- relación opcional con el pedido, eventos, liquidación, devolución e inventario;
- acceso limitado al administrador y procesamiento exclusivo mediante el Backend;
- ausencia de códigos, teléfonos o comentarios en URLs, logs y analítica;
- conservación sin purga automática durante la primera versión, hasta aprobar una
  política jurídica de retención;
- derechos de acceso, rectificación y eliminación sujetos a las obligaciones de
  conservación aplicables;
- Supabase, Turnstile y, cuando se implemente, Mercado Pago como proveedores
  tecnológicos, indicando finalidad y alcance reales en ese momento.

La consulta pública por código mostrará información mínima y no creará una cuenta,
cookie ni Guest Session. El documento no afirmará que Mercado Pago procesa datos
antes de que la integración esté efectivamente habilitada.

## Actualización PR 1: canal restringido para derechos de privacidad

Las solicitudes de acceso, actualización, rectificación o supresión se reciben en
`margaritas.arteydeco.jujuy@gmail.com` y se siguen en un hilo de correo restringido
al titular y al personal autorizado con acceso al buzón. La evidencia mínima de
seguimiento comprende fecha de recepción, categoría, contacto necesario, estado de
verificación y resolución, fecha de cierre y revisión de conservación o eliminación.

No se agrega una tabla, API ni persistencia en el backend para este canal. Tampoco se
copia en la aplicación el contenido innecesario de la solicitud, el teléfono ni el
pedido completo. Los períodos concretos y disparadores de eliminación de esta
evidencia, así como los de las demás categorías, quedan pendientes de confirmación
del contador y revisión legal final.

## Reconciliación PR3 — comportamiento vigente y límites de publicación

La implementación vigente también informa el tratamiento técnico de CSRF, límites de
solicitudes y Cloudflare Turnstile únicamente en los flujos sensibles aprobados. Las
fuentes tipográficas se sirven desde WOFF2 locales y no se requiere una solicitud a
Google Fonts. Por ahora se utilizan únicamente cookies técnicas necesarias y no se
muestra un banner de consentimiento; esta decisión no constituye una conclusión
legal sobre banners, proveedores o transferencias internacionales.

La conservación se revisa por categoría (pedidos, evidencia de reclamos y derechos,
seguridad y rate limiting, checkout temporal y verificación). Los períodos y
disparadores concretos siguen pendientes de confirmación del contador y revisión
legal final. Esta documentación no agrega una tabla, API ni persistencia adicional
para solicitudes de privacidad.
