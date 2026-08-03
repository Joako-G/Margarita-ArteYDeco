# BUSINESS-RULES.md

# Margarita Arte & Deco

## Business Rules

Versión: 1.0

---

# Objetivo

Este documento define las reglas de negocio oficiales del sistema.

Toda funcionalidad implementada en el Frontend, Backend y Base de Datos deberá respetar estas reglas.

Las reglas aquí definidas tienen prioridad sobre cualquier decisión técnica.

---

# Principios Generales

- El sistema deberá ser simple y fácil de utilizar.
- El administrador gestionará todo el comercio desde el Panel Administrativo.
- Los clientes no necesitarán crear una cuenta para realizar compras.
- Toda la información comercial deberá mantenerse íntegra.
- Nunca deberán perderse datos históricos por operaciones del usuario.

---

# Administración

## Administrador

- Existirá un único administrador.
- El administrador tendrá acceso completo al Panel.
- Todo acceso administrativo requerirá autenticación.
- No existirán otros roles en la versión MVP.

---

# Productos

## Creación

- Todo producto deberá pertenecer a una categoría.
- Todo producto deberá tener un nombre.
- La imagen del producto será opcional. Cuando no exista, las interfaces pública y
  administrativa mostrarán la imagen de respaldo definida por el Frontend.
- Todo producto deberá tener un precio mayor a cero.
- Todo producto deberá crearse con un stock inicial entero mayor o igual a cero.

## Estado

- Un producto podrá estar Activo o Inactivo.
- Solo los productos activos serán visibles en la tienda pública.
- Un producto activo con stock mayor a cero estará disponible para la venta.
- Un producto activo sin stock continuará visible con el estado "Sin stock", pero no podrá comprarse.
- Un producto inactivo no podrá agregarse al carrito ni incluirse en un pedido nuevo.

## Stock

- Todo producto deberá tener un stock entero mayor o igual a cero.
- Nunca se permitirá stock negativo.
- La cantidad solicitada no podrá superar el stock disponible.
- El stock se descontará al crear el pedido.
- Si el pedido se cancela, sus unidades se restaurarán una sola vez.
- Todo cambio manual o automático de stock deberá quedar auditado.

## Eliminación

- Los productos utilizarán eliminación lógica (Soft Delete).
- Nunca se eliminarán físicamente desde la aplicación.
- Un producto con historial de ventas deberá conservarse.

---

# Categorías

## Áreas del catálogo

- El catálogo tendrá dos áreas fijas: Arte y Decoraciones.
- Arte agrupará materiales, herramientas y objetos sin terminar destinados a ser intervenidos por el cliente.
- Decoraciones agrupará piezas terminadas, pintadas o intervenidas por el negocio y listas para usar o regalar.
- Toda categoría deberá pertenecer exactamente a una de estas áreas.
- Los productos heredarán el área de su categoría; el área nunca se almacenará de forma duplicada en el producto.
- El orden de visualización de las categorías se administrará de forma independiente dentro de cada área.
- No podrá cambiarse el área de una categoría que posea productos asociados.

## Creación

- Toda categoría deberá tener un nombre único.
- Toda categoría pública deberá tener una imagen.
- El orden de visualización deberá poder administrarse.

## Estado

- Una categoría podrá estar Activa o Inactiva.
- Solo las categorías activas serán visibles en la tienda.

## Filtrado

- Las categorías activas funcionarán como filtros del catálogo.
- Deberá existir una opción para mostrar todos los productos.
- Seleccionar una categoría mostrará únicamente sus productos activos.
- La categoría seleccionada deberá comunicarse visualmente y mediante texto accesible.

## Eliminación

- Las categorías utilizarán eliminación lógica.
- No podrán eliminarse si poseen productos asociados.

---

# Clientes

## Registro

- Los clientes no deberán registrarse ni iniciar sesión.
- El sistema creará automáticamente un cliente cuando realice su primera compra.
- Si ya existe un cliente con el mismo teléfono normalizado, se reutilizará el registro existente.
- Una sesión anónima de compra no constituirá una cuenta de cliente ni concederá acceso administrativo.

## Datos

Cada cliente podrá almacenar:

- Nombre
- Apellido
- Teléfono
- Observaciones

En el MVP, nombre, apellido y teléfono serán obligatorios.

## Eliminación

- Los clientes utilizarán eliminación lógica.
- Nunca deberán perder su historial de compras.

---

# Pedidos

## Creación

- Todo pedido deberá estar asociado a un cliente.
- Todo pedido deberá contener al menos un producto.
- El total deberá calcularse automáticamente.
- Todo pedido deberá guardar el método de pago elegido.
- Los datos de contacto y nombres de productos deberán conservarse como snapshot histórico.

## Historial

- Los pedidos representan el historial comercial del negocio.
- Nunca deberán eliminarse.

## Estados

Los estados permitidos son:

- Pendiente
- Pendiente de Pago
- Pagado
- Preparando
- Listo
- Retirado
- Cancelado

No se permitirán estados diferentes.

Transiciones del MVP:

- Transferencia: `payment_pending` → `paid` → `preparing` → `ready` → `picked_up`.
- Efectivo: `pending` → `preparing` → `ready` → `paid` → `picked_up`.
- Un pedido podrá pasar a `cancelled` antes de ser retirado.
- No se podrá reabrir un pedido cancelado o retirado.

---

# Configuración

- Existirá un único registro de configuración.
- Solo el administrador podrá modificarlo.

La configuración incluirá como mínimo:

- Nombre del negocio
- Logo de la marca
- WhatsApp
- Dirección
- URL de Google Maps
- Horarios de atención
- Alias
- CBU
- Banco
- Descuento por transferencia
- Umbral de stock bajo
- Redes sociales

La dirección, ubicación y horarios configurados corresponderán al local y deberán mostrarse al cliente para retirar su pedido.

El logo configurado se utilizará en el Header y el Footer de la aplicación
pública. Si todavía no existe un logo configurado o no puede resolverse, el
Frontend utilizará la variante local oficial como respaldo.

---

# Catálogo Público

- Solo se mostrarán categorías activas.
- Solo se mostrarán productos activos.
- Nunca se mostrarán productos eliminados lógicamente.
- Un producto activo sin stock permanecerá visible, identificado como "Sin stock" y sin acciones de compra disponibles.
- La tienda distinguirá de manera explícita Arte de Decoraciones y nunca dependerá únicamente de una imagen o del color para comunicar la diferencia.
- La página principal comenzará por las categorías, mostrando primero las de Arte y luego las de Decoraciones.

---

# Compra

- El cliente podrá comprar sin crear una cuenta.
- El carrito deberá permitir múltiples productos.
- El carrito deberá respetar el stock disponible de cada producto.
- La cantidad mínima por producto será 1.
- Agregar nuevamente un producto ya presente sumará cantidades sin superar el stock.
- Agregar un producto no reservará unidades.
- El total se calculará automáticamente.
- La compra generará un nuevo pedido.
- Al crear el pedido, el Backend deberá comprobar nuevamente que todos los productos continúan activos y poseen stock suficiente.
- La creación del pedido y el descuento de stock deberán completarse como una única operación atómica.

## Consulta y recuperación de pedidos

- Después de crear un pedido, el Backend deberá asociarlo a una sesión anónima de compra.
- La sesión anónima permitirá consultar únicamente los pedidos asociados a ese navegador y nunca concederá permisos para modificarlos.
- La sesión se identificará mediante una credencial aleatoria, opaca e imposible de inferir a partir del número de pedido, almacenada en una cookie segura.
- La credencial tendrá una vigencia máxima de 30 días. Una recuperación válida podrá emitir una nueva sesión con la misma vigencia.
- El Backend será siempre la fuente oficial del pedido. El Frontend no utilizará `localStorage` como autoridad para estados, importes, pagos ni datos bancarios.
- El Frontend podrá guardar únicamente el número del último pedido como pista no sensible para facilitar la navegación.
- El cliente podrá abrir "Ver mi último pedido" sin completar un formulario mientras conserve una sesión anónima válida.
- Si la sesión no existe o expiró, el cliente podrá recuperar un pedido específico ingresando el número de pedido y el mismo celular utilizado en la compra.
- Una recuperación correcta vinculará el pedido a la sesión vigente y rotará su credencial; si no existe una sesión válida, creará una nueva.
- La recuperación nunca indicará si falló el número de pedido o el celular por separado.
- Los intentos de recuperación deberán limitarse por IP y por identificadores normalizados, con bloqueo temporal ante abuso y CAPTCHA únicamente cuando se detecte comportamiento sospechoso.
- Un número de pedido por sí solo nunca será suficiente para consultar información.
- La consulta pública expondrá únicamente la confirmación necesaria para el cliente: número, fecha, estado, productos, importes, método de pago, retiro y, cuando corresponda, datos de transferencia.
- Una confirmación recuperada deberá mostrar la misma información operativa que la confirmación original mientras la sesión sea válida.
- La consulta pública nunca expondrá IDs internos, auditoría, notas administrativas ni datos de otros clientes.
- El cliente podrá eliminar la asociación local mediante una acción "Olvidar pedidos de este dispositivo". Esta acción no eliminará pedidos ni historial comercial.

## Retiro

- Todos los pedidos del MVP se retirarán exclusivamente en el local.
- No habrá envío ni entrega a domicilio.
- El checkout mostrará dirección y horarios antes de confirmar.
- La confirmación mostrará dirección, horarios y una acción para abrir la ubicación en Google Maps.
- El administrador marcará el pedido como `picked_up` cuando el cliente lo retire.
- Para pagos en efectivo, el administrador confirmará primero el pago y luego el retiro.

---

# Soft Delete

Las siguientes entidades utilizarán eliminación lógica:

- Productos
- Categorías
- Clientes

La eliminación lógica consistirá en establecer el campo:

```
deleted_at
```

Las consultas normales deberán ignorar automáticamente los registros eliminados.

Los registros podrán restaurarse posteriormente.

---

# Seguridad

- Toda acción administrativa requerirá autenticación.
- El Backend validará todas las operaciones críticas.
- Nunca se confiará en los datos enviados por el Frontend.
- Las sesiones anónimas utilizarán cookies `HttpOnly`, `Secure` y `SameSite=Lax` cuando Frontend y API sean same-site.
- Si el despliegue exige contexto cross-site, cualquier excepción a `SameSite=Lax` deberá documentarse y acompañarse de protección CSRF y una política CORS con orígenes explícitos.
- El token original de una sesión anónima nunca se almacenará en la base de datos; se persistirá únicamente un hash seguro.
- Los tokens anónimos no se incluirán en URLs, logs, mensajes de error ni analítica.
- Las credenciales anónimas serán de solo lectura y estarán limitadas a los pedidos asociados a su sesión.

---

# Integridad

- No deberán existir pedidos sin cliente.
- No deberán existir productos sin categoría.
- No deberán eliminarse registros necesarios para conservar el historial comercial.
- Los cambios posteriores en clientes o productos no deberán alterar la información histórica guardada en pedidos.

---

# Definition of Done

Una funcionalidad estará finalizada únicamente cuando:

- Respete todas las reglas definidas en este documento.
- No contradiga ninguna regla existente.
- Mantenga la integridad de los datos.
- No comprometa la simplicidad del sistema.

# Administración de Stock

El administrador podrá consultar y ajustar el stock desde el Panel Administrativo. Cada ajuste manual requerirá una cantidad y un motivo. Activar o desactivar un producto no modificará su stock.

# Pagos

Los métodos disponibles en el MVP serán:

- Efectivo.
- Transferencia bancaria.

La transferencia aplicará el descuento configurado por el administrador. El Backend calculará el descuento y el total; nunca confiará en importes calculados por el Frontend.

Un pedido en efectivo se creará con estado `pending` y pago `pending`. Un pedido por transferencia se creará con estado `payment_pending` y pago `pending`. El administrador marcará el pago como recibido después de verificarlo.

Antes de confirmar una transferencia se mostrarán el porcentaje de descuento y el total resultante, pero no se solicitará ningún pago todavía.

Después de crear correctamente el pedido se mostrarán en la web número de pedido, importe final, alias, CBU, banco y acciones para copiar. Estos datos no dependerán de WhatsApp.

La confirmación incluirá una acción "Enviar comprobante por WhatsApp" que abrirá una conversación con el negocio y un mensaje predefinido. El cliente deberá adjuntar el comprobante manualmente.

El Panel Administrativo utilizará enlaces `wa.me` para contactar al cliente, avisar que el pedido está listo y recordar un pago pendiente. El envío siempre requerirá una acción manual del administrador y nunca cambiará automáticamente el estado del pedido.

Mercado Pago y WhatsApp Business API no forman parte del MVP.
