# FRONTEND-SDD.md

## 1. Objetivo

## 2. Arquitectura Frontend

## 3. Routing

## 4. Layouts

## 5. Aplicación Pública

### Landing

- En la navegación completa de escritorio, actualizar el enlace activo según la
  sección visible durante el scroll.
- Considerar `Inicio`, `Inspiración`, `Nosotros` y `Contacto` como hitos; mantener
  activo el último hito alcanzado hasta ingresar en el siguiente.
- No modificar la URL automáticamente durante el scroll.
- Mantener el menú móvil fuera de este seguimiento automático y conservar en él
  el estado derivado de la ruta o hash seleccionado.

### Catálogo

- Componer el catálogo con filtros de categorías y un grid de productos.
- Mantener el filtro seleccionado en la URL mediante `/categoria/:slug`.
- Incluir búsqueda y ordenamiento sin perder la categoría activa.
- Adaptar la carga progresiva al viewport: 8 productos en desktop, 6 en tamaños medianos y 4 en pantallas pequeñas.
- La acción explícita para ver más cargará otro bloque del tamaño correspondiente al viewport.
- Conservar los productos ya visibles si el viewport cambia de tamaño.
- Mantener el ancho habitual de las cards cuando una búsqueda o filtro devuelva pocos productos.
- Reiniciar la cantidad visible al cambiar la categoría, la búsqueda o el ordenamiento.

### Categorías

- Mostrar una opción "Todos" y únicamente categorías activas.
- Representar cada categoría mediante un único botón con imagen circular, nombre y cantidad de productos.
- Utilizar una imagen cuadrada WebP específica por categoría, con un mínimo de
  560 × 560 px y el sujeto principal preparado para el recorte circular.
- Evitar escalar la imagen raster durante el hover; comunicar la interacción
  mediante elevación y superficie para conservar su nitidez.
- Mostrar el nombre y la cantidad debajo de la imagen para mejorar su lectura.
- Utilizar `aria-pressed` para comunicar la selección.
- Resaltar el botón seleccionado mediante superficie blanca, borde circular, halo y check.
- Mostrar sobre el grid el texto "Estás viendo: {categoryName}".
- Para "Todos", mostrar "Todos los productos".
- Utilizar desplazamiento horizontal con la barra nativa oculta, conservando gesto
  táctil, rueda horizontal y trackpad.
- Mostrar flechas de navegación a ambos lados en todos los tamaños cuando existan
  categorías fuera del área visible; mantenerlas en móvil como señal de continuidad.
- Deshabilitar la flecha correspondiente al alcanzar el inicio o el final, con un
  área interactiva mínima de 44 × 44 px.
- En la Landing, seleccionar una categoría navegará a `/categoria/:slug`.
- En el catálogo, seleccionar otra categoría actualizará la URL y los productos sin recargar la aplicación.

### Producto

- Mostrar únicamente productos activos.
- Mostrar el stock disponible en el detalle del producto y cuando aporte valor en sus cards.
- Mostrar "Sin stock" y deshabilitar la compra cuando `stock_quantity` sea cero.
- Permitir agregar al carrito únicamente productos activos con stock suficiente.
- No permitir cantidades superiores al stock conocido.
- El estado del Frontend es informativo; el Backend debe validar actividad y stock nuevamente al crear el pedido.
- Cada ProductCard tendrá selector de cantidad y botón Agregar al carrito.
- Mostrar el badge "Nuevo" durante los primeros 30 días desde `created_at`.
- Reservar el badge "Oferta" para la funcionalidad de promociones; no inferir ofertas a partir del precio ni usar porcentajes hardcodeados.
- La cantidad inicial será 1.
- Deshabilitar disminuir en 1 y aumentar al alcanzar el stock.
- Si el producto ya está en el carrito, sumar la cantidad sin superar el stock.
- Después de agregar, mostrar confirmación breve y permitir continuar comprando.

### Carrito

- Mostrar la cantidad seleccionada y el máximo disponible.
- Impedir incrementos por encima del stock conocido.
- Informar y solicitar corrección si el stock cambió desde que se agregó el producto.
- Conservar el carrito no implica reservar unidades.
- Abrir el carrito mediante Drawer desde el icono del header; no abrirlo automáticamente después de cada agregado.
- Permitir editar cantidades, eliminar productos y vaciar el carrito.
- Mostrar subtotal, descuento estimado cuando corresponda y total.
- Incluir una acción principal "Continuar compra".

### Checkout

Flujo:

1. Revisar productos y cantidades.
2. Completar nombre, apellido y celular.
3. Elegir Efectivo o Transferencia.
4. Mostrar descuento y total actualizado.
5. Confirmar el pedido.
6. Mostrar número de pedido y próximos pasos.

- Mantener visible el resumen antes de confirmar.
- Validar los datos con React Hook Form y Zod.
- Si se elige transferencia, mostrar el descuento antes de confirmar.
- No mostrar los datos bancarios como sustituto de la creación del pedido.
- Después de crear correctamente un pedido por transferencia, mostrar número de pedido, importe final, alias, CBU, banco y acciones para copiar.
- Incluir "Enviar comprobante por WhatsApp" con un mensaje predefinido que contenga nombre y número de pedido. El cliente adjuntará el archivo manualmente.
- Los datos bancarios deberán permanecer visibles en la confirmación aunque WhatsApp no pueda abrirse.
- Informar antes de confirmar que el pedido se retira exclusivamente en el local.
- Mostrar la dirección y los horarios configurados del local antes de confirmar.
- En la confirmación, mostrar dirección, horarios y el botón "Ver ubicación" enlazado a Google Maps.
- Abrir el mapa en una pestaña nueva con `rel="noopener noreferrer"`.
- Para efectivo, informar que el pago se realiza al retirar.
- No solicitar dirección al cliente.

## 6. Panel Administrativo

### Login

### Dashboard

- Mostrar productos activos, productos sin stock, productos con stock bajo, pedidos pendientes y ventas recientes.

### Productos

- Consultar, crear y editar `stock_quantity`.
- Mostrar filtros de productos con stock y sin stock.
- Permitir ajustes manuales con un motivo obligatorio.
- Mostrar el historial de movimientos de inventario.
- El formulario de alta y edición incluirá categoría, imagen, nombre, descripción, precio, stock, estado activo y condición de destacado.
- Generar el slug a partir del nombre y permitir validar su unicidad.
- Mostrar vista previa de la imagen antes de guardar.

### Categorías

- Crear, editar, ordenar, activar y desactivar categorías.
- Gestionar nombre, imagen, descripción y orden visual.

### Pedidos

- Mostrar cliente, celular, productos, cantidades, importes, descuento, método y estado de pago.
- Permitir actualizar estados y cancelar con confirmación.
- Mostrar claramente cuándo una cancelación restauró stock.
- Incluir "Contactar cliente" para todos los pedidos.
- Incluir "Avisar que está listo" únicamente cuando el pedido esté `ready`.
- Incluir "Recordar transferencia" únicamente para transferencias con pago pendiente.
- Abrir WhatsApp con mensajes predefinidos y editables antes del envío.
- El uso de WhatsApp no deberá cambiar estados ni asumir que el mensaje fue enviado o leído.

### Clientes

### Configuración

## 7. Componentes Compartidos

## 8. Gestión de Estado

## 9. Consumo de API

## 10. Formularios

## 11. Estados Globales

Loading

Error

Empty

Success

## 12. Responsive

## 13. Accesibilidad

## 14. Performance

## 15. Flujo de Navegación

## 16. Definition of Done
