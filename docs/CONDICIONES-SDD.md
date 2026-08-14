## Implementar Términos y Condiciones
# Objetivo

Implementar una página profesional de Términos y Condiciones para el proyecto Margarita Arte y Deco, adaptada al funcionamiento real de la aplicación.

La implementación debe respetar la arquitectura actual del proyecto, mantener el Design System y reutilizar los componentes existentes.

## Contexto del proyecto

Margarita Arte y Deco es un comercio dedicado a la venta de productos de arte y decoración.

Actualmente la aplicación permite que un cliente:

- navegue por el catálogo;
- agregue productos al carrito;
- complete un formulario con sus datos;
- envíe un pedido al comercio.

El comercio recibe el pedido y posteriormente se comunica con el cliente para coordinar la entrega o el retiro.

Los datos personales ingresados durante el checkout son almacenados por el comercio únicamente para gestionar los pedidos y mantener el historial comercial del negocio.

Actualmente:

- no es necesario registrarse para realizar un pedido;
- no existen cuentas de usuario;
- no existe autenticación para clientes;
- no existen suscripciones;
- no existen pagos online integrados;
- el envío del formulario representa una solicitud de pedido que posteriormente será gestionada por el comercio.

Los Términos y Condiciones deben describir únicamente el funcionamiento real de la aplicación.

No incluir funcionalidades futuras.

## Tareas
# 1. Crear la nueva página

Crear una nueva página pública para los Términos y Condiciones.

Utilizar la estructura existente para las páginas legales.

Si ya existen componentes reutilizables como:

- LegalLayout
- LegalSection

reutilizarlos.

No duplicar código.

# 2. Agregar la ruta

Agregar la ruta pública:

    /terminos-y-condiciones

Integrarla utilizando React Router.

# 3. Crear el contenido

El documento debe estar dividido en secciones claras.

1. Introducción

Explicar que los presentes Términos y Condiciones regulan el acceso y uso del sitio web de Margarita Arte y Deco.

Indicar que, al utilizar el sitio y enviar un pedido, el usuario acepta estos términos.

2. Uso del sitio

Explicar que el usuario se compromete a:

- proporcionar información verdadera;
- utilizar el sitio de buena fe;
- no realizar acciones que puedan afectar el funcionamiento del sitio.

3. Productos

Explicar que:

- los productos publicados pueden modificarse;
- los precios pueden actualizarse sin previo aviso;
- las fotografías son ilustrativas y pueden presentar pequeñas diferencias respecto del producto final artesanal.

No generar falsas expectativas.

4. Pedidos

Explicar claramente que:

- el envío del formulario genera una solicitud de pedido;
- el comercio podrá contactar al cliente para confirmar la información;
- el pedido podrá ser aceptado, modificado o cancelado antes de concretarse, por ejemplo, si existe un error evidente en el precio publicado o si el producto ya no se encuentra disponible.

Utilizar un lenguaje profesional y transparente.

5. Disponibilidad de productos

Explicar que la disponibilidad está sujeta al stock existente.

En caso de falta de disponibilidad, el comercio podrá comunicarse con el cliente para ofrecer una alternativa o cancelar el pedido.

6. Entregas y retiros

Explicar que:

- el comercio coordinará con el cliente el retiro o la entrega del pedido;
- los plazos podrán variar según la disponibilidad de los productos.

No mencionar métodos de envío que actualmente no existan.

7. Responsabilidad

Explicar que Margarita Arte y Deco realiza esfuerzos razonables para mantener la información del sitio actualizada y correcta.

No obstante:

- pueden existir errores involuntarios;
- el comercio podrá corregirlos cuando sean detectados.

No prometer disponibilidad permanente del sitio.

8. Propiedad intelectual

Indicar que:

- el contenido del sitio;
- fotografías;
- logotipo;
- diseño;
- textos;

pertenecen a Margarita Arte y Deco y no pueden utilizarse sin autorización.

9. Protección de datos

Agregar una breve sección indicando que el tratamiento de los datos personales se encuentra regulado por la Política de Privacidad del sitio.

Incluir un enlace interno hacia:

    /politica-de-privacidad

mediante React Router.

10. Modificaciones

Explicar que el comercio podrá actualizar estos Términos y Condiciones cuando resulte necesario.

Las modificaciones comenzarán a regir desde su publicación en el sitio.

11. Legislación aplicable

Indicar que estos Términos y Condiciones se rigen por las leyes de la República Argentina.

No agregar artículos legales innecesarios.

No utilizar lenguaje jurídico complejo.

# 4. Diseño

Mantener exactamente el mismo estilo visual utilizado en la página de Política de Privacidad.

Debe reutilizar:

- tipografía;
- espaciados;
- componentes;
- diseño responsive.

No crear un diseño diferente.

# 5. Footer

Actualizar el apartado Información del Footer agregando el nuevo enlace:

- Política de Privacidad
- Términos y Condiciones

Mantener el diseño preparado para futuras páginas legales.

# 6. Accesibilidad

Verificar:

- estructura semántica correcta;
- un único H1;
- jerarquía correcta de encabezados;
- navegación mediante teclado;
- contraste adecuado;
- focus visible.

# 7. SEO

Agregar:

- título de la página;
- meta description;
- H1 descriptivo.

Mantener consistencia con el resto del sitio.

8. Calidad

Antes de finalizar:

-verificar TypeScript;
-verificar ESLint;
-verificar imports sin uso;
-verificar responsive;
-verificar navegación entre páginas legales;
-verificar que el contenido represente únicamente funcionalidades existentes;
-no agregar información ficticia ni procesos que aún no hayan sido implementados.

## Resultado esperado

Al finalizar debe existir:

- la nueva página pública /terminos-y-condiciones;
- integración con el layout legal existente;
- enlace desde el footer;
- enlace interno hacia la Política de Privacidad;
- contenido profesional, claro y coherente con el funcionamiento actual de Margarita Arte y Deco;
- código limpio, modular y reutilizable para futuras páginas legales.