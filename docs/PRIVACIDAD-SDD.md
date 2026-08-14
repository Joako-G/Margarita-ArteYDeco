Implementar Política de Privacidad
Objetivo

Implementar una página profesional de Política de Privacidad para el proyecto Margarita Arte y Deco, adaptada al funcionamiento real de la aplicación.

La implementación debe respetar la arquitectura actual del proyecto, mantener el Design System y reutilizar los componentes existentes.

Contexto del proyecto

La web solicita únicamente los siguientes datos personales durante el checkout:

Nombre
Apellido
Número de teléfono

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
NO almacena medios de pago;
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

Indicar claramente que únicamente se solicitan:

- Nombre.
- Apellido.
- Número de teléfono.

No mencionar datos que actualmente no se solicitan.

## Finalidad del tratamiento

Explicar que los datos se utilizan exclusivamente para:

- gestionar pedidos;
- contactar al cliente;
- informar el estado del pedido;
- coordinar el retiro o la entrega;
- responder consultas relacionadas con un pedido;
- permitir la gestión interna del negocio mediante el Panel Administrativo.

Aclarar expresamente que los datos no se utilizan con fines publicitarios o comerciales.

## Datos compartidos

Explicar claramente que:

- no se venden datos personales;
- no se comparten con terceros para fines comerciales.

No mencionar integraciones que actualmente no existen.

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

No hardcodear correos electrónicos, teléfonos ni direcciones.

Preparar el componente para que en el futuro estos datos puedan obtenerse desde la configuración del negocio.

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