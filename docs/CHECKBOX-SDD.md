## Implementar aceptación obligatoria de Términos y Condiciones en el Checkout

# Objetivo

Agregar una aceptación obligatoria de los Términos y Condiciones y de la Política de Privacidad dentro del Checkout.

El usuario no podrá finalizar ni enviar el pedido hasta aceptar ambos documentos.

La implementación debe respetar el Design System existente y mantener una arquitectura limpia y reutilizable.

# Ubicación

Agregar el bloque de aceptación inmediatamente antes del botón que envía el pedido.

Debe ser uno de los últimos elementos del formulario para que el usuario primero complete sus datos y luego acepte las condiciones.

# Diseño

    Implementar un checkbox acompañado por el siguiente texto:

He leído y acepto los Términos y Condiciones y la Política de Privacidad.

Las frases:

- Términos y Condiciones
- Política de Privacidad

deben ser enlaces internos utilizando React Router.

No utilizar <a href=""> para la navegación interna.

# Comportamiento

El checkbox debe ser obligatorio.

Mientras no esté seleccionado:

- el botón para enviar el pedido debe permanecer deshabilitado o impedir el envío mostrando el error de validación del formulario (seguir el patrón que ya utiliza el proyecto para el resto de las validaciones).

No permitir enviar el formulario mediante ninguna acción si el checkbox no fue aceptado.

# Validación

Integrar esta validación con el sistema actual del formulario.

Si el proyecto utiliza:

- React Hook Form;
- Zod;

agregar el nuevo campo respetando esa arquitectura.

No implementar validaciones manuales fuera del sistema existente.

El mensaje de error debe ser claro.

Ejemplo:

Debes aceptar los Términos y Condiciones y la Política de Privacidad para continuar.

# Experiencia de usuario

El texto debe ser fácilmente legible.

Los enlaces deben diferenciarse visualmente del resto del texto.

Al pasar el cursor:

- utilizar el color de acento del Design System;
- aplicar una transición suave.

Al hacer clic en un enlace:

- abrir la página correspondiente utilizando React Router.

Cuando el usuario vuelva al Checkout, la información ingresada en el formulario no debe perderse.

# Accesibilidad

Verificar:

- asociación correcta entre el checkbox y su etiqueta;
- navegación mediante teclado;
- foco visible;
- contraste adecuado;
- área de clic suficientemente amplia.

# Arquitectura

Antes de implementar:

- analizar la estructura actual del Checkout;
- reutilizar componentes y estilos existentes;
- evitar código duplicado;
- mantener consistencia con el resto del proyecto.

# Calidad

Antes de finalizar:

- verificar TypeScript;
- verificar ESLint;
- verificar responsive;
- verificar accesibilidad;
- comprobar que los enlaces navegan correctamente;
- comprobar que el formulario nunca pueda enviarse sin aceptar los documentos;
- verificar que la nueva validación esté integrada con el sistema actual del formulario.

# Resultado esperado

Al finalizar:

- el Checkout mostrará un checkbox obligatorio antes del botón de enviar pedido;
- el usuario deberá aceptar los Términos y Condiciones y la Política de Privacidad para continuar;
- ambos documentos serán accesibles mediante enlaces internos;
- la implementación quedará integrada con el sistema de validaciones existente y mantendrá una experiencia de usuario clara, profesional y consistente con el resto de la aplicación.