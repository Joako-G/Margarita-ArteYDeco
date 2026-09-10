# BUSINESS-RULES.md

# Margarita Arte & Deco

## Business Rules

Versión: 1.1

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
- Todo producto podrá tener un porcentaje de descuento individual entre `0` y
  menor que `100`; `0` indica que no está en oferta.
- El precio de oferta será derivado del precio de lista y deberá continuar siendo
  mayor a cero después del redondeo monetario.
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
- Al crear una categoría, el Backend le asignará automáticamente la siguiente posición disponible dentro de su área.
- El administrador podrá modificar posteriormente el orden de visualización.

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
- Confirmado
- Preparando
- Listo
- Retirado
- Entregado
- Cancelado

No se permitirán estados diferentes.

Transiciones del MVP:

- Todos los pedidos: `pending` → `confirmed` → `preparing` → `ready`.
- Desde `ready`, un pedido puede pasar a `picked_up` o `delivered` según corresponda.
- Un pedido podrá pasar a `cancelled` antes de ser retirado o entregado.
- No se podrá reabrir un pedido cancelado, retirado o entregado.

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
- El total se calculará automáticamente usando primero los descuentos vigentes
  de cada producto y, después, el descuento por transferencia cuando corresponda.
- El carrito no congelará precios. El Backend recalculará precio de lista,
  descuento del producto, subtotal y total al crear el pedido.
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
- La consulta pública expondrá únicamente la confirmación necesaria para el cliente: número, fecha, estado, productos, importes, método de pago, método de entrega y, cuando corresponda, dirección de envío o datos de transferencia.
- Una confirmación recuperada deberá mostrar la misma información operativa que la confirmación original mientras la sesión sea válida.
- La consulta pública nunca expondrá IDs internos, auditoría, notas administrativas ni datos de otros clientes.
- El cliente podrá eliminar la asociación local mediante una acción "Olvidar pedidos de este dispositivo". Esta acción no eliminará pedidos ni historial comercial.

## Método de entrega

- El cliente elegirá entre retiro en el local (`pickup`) y envío a coordinar (`shipping`).
- Para retiro, el checkout y la confirmación mostrarán la dirección, los horarios y la ubicación del local.
- Para envío, la dirección de entrega será obligatoria y se conservará en el pedido.
- Los envíos se coordinarán manualmente por WhatsApp entre el negocio y el cliente.
- El sistema no calculará costos de envío ni gestionará transportistas, fechas, seguimiento o números de guía.
- El pago en efectivo estará disponible únicamente para retiro; los pedidos con envío utilizarán transferencia.
- El administrador marcará como `picked_up` un retiro completado y como `delivered` un envío completado.
- Para pagos en efectivo, el administrador confirmará primero el pago y luego el retiro.

---

# Derecho de Arrepentimiento

## Acceso y presentación

- Toda ruta pública mostrará, desde el primer acceso y en un lugar destacado, un
  enlace denominado exactamente `BOTÓN DE ARREPENTIMIENTO`.
- El cliente podrá presentar una solicitud sin crear una cuenta, iniciar sesión,
  recuperar un pedido ni conservar una Guest Session vigente.
- El número de pedido será opcional. Si el cliente no lo encuentra, podrá indicarlo
  expresamente sin impedir la presentación.
- El celular será obligatorio como dato mínimo de contacto y verificación. No se
  exigirán motivo, fotografías, documentación ni selección pública de pedidos.
- Toda entrada sintácticamente válida generará una constancia aunque el pedido no
  exista, el celular no coincida o el plazo requiera revisión.
- La constancia y su código público se emitirán inmediatamente. En ningún caso se
  superará el máximo normativo de 24 horas.
- El código será opaco, de alta entropía, no secuencial y no se almacenará en texto
  plano ni en URLs, cookies, logs, analítica o `localStorage`.

## Evaluación y alcance

- Registrar una solicitud acredita su recepción y el ejercicio comunicado. La
  revisión posterior verifica identidad, alcance temporal y excepciones legales;
  no constituye una autorización discrecional del comercio ni modifica por sí
  sola el pedido, el pago o el stock.
- El alcance inicial será la revocación completa de un único pedido. Los
  arrepentimientos parciales quedan fuera del primer incremento.
- La estimación operativa considerará diez días corridos y aplicará el criterio
  más favorable al consumidor entre celebración y entrega. Los vencimientos en
  días inhábiles y los casos sin evidencia de información adecuada requerirán
  revisión administrativa.
- El sistema nunca declarará automáticamente la improcedencia por plazo,
  categoría, uso, estado del pedido ni posible excepción. Toda determinación de
  `not_applicable` exigirá revisión, fundamento legal y una explicación pública
  comprensible con canal de reconsideración o reclamo.
- Los productos estándar actuales quedan alcanzados por el flujo. Una futura
  excepción por personalización, naturaleza, consumo efectivo, perecibilidad o
  destino de reventa se evaluará por pedido y artículo.

## Resolución, devolución y reintegro

- La decisión administrativa, la devolución física y el reintegro económico
  mantendrán estados independientes y un historial append-only.
- Un pedido no entregado podrá cancelarse mediante el flujo vigente, restaurando
  stock exactamente una vez. Un pedido `picked_up` o `delivered` conservará su
  estado histórico.
- Las unidades entregadas solo volverán al stock después de recibirse e
  inspeccionarse. La inspección registrará por producto las unidades recibidas,
  aptas y no aptas; únicamente las aptas para reventa incrementarán existencias.
  Cada solicitud y producto podrá reingresar stock una sola vez. El caso no podrá
  cerrarse hasta registrar esta resolución, incluso cuando ninguna unidad sea apta.
  La inspección de inventario no podrá utilizarse para demorar arbitrariamente
  la restitución recíproca y simultánea de las prestaciones.
- El ejercicio procedente no generará gastos para el consumidor. El negocio
  coordinará o reintegrará el costo razonable de devolución cuando corresponda.
- El reintegro comprenderá todas las sumas efectivamente cobradas por el contrato,
  incluido un eventual costo original de entrega, más el costo de devolución que
  corresponda. Para Mercado Pago, el importe enviado al proveedor se limitará al
  importe efectivamente cobrado por los productos; cualquier envío coordinado por
  separado y el costo de devolución se registrarán y resolverán fuera de ese
  reintegro. Se calculará desde snapshots, nunca desde precios actuales ni
  importes enviados por el Frontend.
- Efectivo y transferencia utilizarán inicialmente un reintegro manual auditado.
  No se almacenarán CBU, alias ni datos bancarios completos del cliente.
- El costo de devolución será siempre un gasto adicional documentado y nunca una
  repetición del total contractual. La confirmación mostrará y validará el
  desglose completo antes de registrar el reintegro.
- Un importe de reintegro ya confirmado solo podrá rectificarse mediante una
  acción compensatoria con motivo, actor y valores anterior y corregido. La
  rectificación no eliminará ni reescribirá el historial previo.
- Una futura integración con Mercado Pago será asíncrona, idempotente y conciliable.
  Sus caídas, límites o rechazos técnicos no podrán alterar una solicitud
  determinada como aplicable;
  el caso continuará por revisión y resolución manual.
- El diseño de Checkout Pro deberá respetar `MP-CHECKOUT-PRO-SDD.md`: el pago
  histórico del pedido, la liquidación del arrepentimiento y la operación técnica
  del proveedor conservarán fuentes de verdad separadas. Ningún Webhook podrá
  decidir aplicabilidad, devolución física o stock.

## Administración y atención

- Solo el administrador autenticado podrá identificar pedidos, determinar si el
  derecho resulta aplicable o no aplicable con fundamento,
  registrar devoluciones, confirmar reintegros, modificar stock o cerrar casos.
- Una solicitud sin pedido identificado seguirá siendo válida. Los candidatos se
  mostrarán exclusivamente en Administración y nunca quedarán preseleccionados.
- WhatsApp será un canal de contingencia cuando el formulario no funcione y podrá
  utilizarse para coordinación posterior. Abrirlo no modificará estados ni probará
  que un mensaje fue enviado o leído.
- El sitio informará el área responsable de Atención al cliente, un canal
  alternativo y horarios compatibles con la normativa y la operación comercial.
- Solicitudes, liquidaciones y eventos no tendrán eliminación desde el Panel.

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

## Transparencia legal y técnica vigente

- La Política de Privacidad identificará los datos, finalidades, proveedores y
  derechos que corresponden al comportamiento implementado.
- Se utilizarán únicamente cookies técnicas necesarias y no se mostrará un banner
  de consentimiento por ahora; esto no constituye una conclusión legal sobre la
  obligación o excepción de un banner.
- Turnstile se cargará solo en flujos sensibles aprobados y se divulgará Cloudflare
  antes o junto al desafío.
- Los períodos de conservación y disparadores de eliminación quedan pendientes de
  confirmación del contador y revisión legal final.
- La documentación distinguirá requisitos, divulgaciones de proveedores,
  recomendaciones y pendientes, sin agregar identidad fiscal no confirmada.

# Administración de Stock

El administrador podrá consultar y ajustar el stock desde el Panel Administrativo. Cada ajuste manual requerirá una cantidad y un motivo. Activar o desactivar un producto no modificará su stock.

# Pagos

Los métodos disponibles en el MVP serán:

- Efectivo.
- Transferencia bancaria.

La transferencia aplicará el descuento configurado por el administrador sobre el
subtotal obtenido después de los descuentos de producto. El Backend calculará
ambos descuentos y el total; nunca confiará en importes calculados por el
Frontend.

Todo pedido se creará con estado `pending` y pago `pending`, independientemente del método elegido. El administrador marcará el pago como recibido después de verificarlo; esa acción no modifica `order_status`.

Antes de confirmar una transferencia se mostrarán el porcentaje de descuento y el total resultante, pero no se solicitará ningún pago todavía.

Después de crear correctamente el pedido se mostrarán en la web número de pedido, importe final, alias, CBU, banco y acciones para copiar. Estos datos no dependerán de WhatsApp.

La confirmación incluirá una acción "Enviar comprobante por WhatsApp" que abrirá una conversación con el negocio y un mensaje predefinido. El cliente deberá adjuntar el comprobante manualmente.

El Panel Administrativo utilizará enlaces `wa.me` para contactar al cliente, avisar que el pedido está listo y recordar un pago pendiente. El envío siempre requerirá una acción manual del administrador y nunca cambiará automáticamente el estado del pedido.

Mercado Pago y WhatsApp Business API no forman parte del MVP.

La incorporación post-MVP de Mercado Pago permanece deshabilitada hasta completar
los prerrequisitos técnicos, operativos y documentales pendientes definidos en
`MP-CHECKOUT-PRO-SDD.md`.
Efectivo y transferencia continúan siendo los únicos métodos vigentes mientras
esa fase no se implemente y habilite expresamente.

Para la futura habilitación de Checkout Pro quedan aprobadas estas reglas:

- Mercado Pago estará disponible para retiro en el local y para envío a
  coordinar.
- La primera habilitación admitirá únicamente dinero disponible en Mercado Pago
  y tarjetas de débito. Se excluirán Rapipago, Pago Fácil, tarjetas de crédito y
  cualquier alternativa de financiación o cuotas sin tarjeta.
- El checkout no exigirá tener una cuenta de Mercado Pago para utilizar una
  tarjeta de débito.
- La reserva inicial de stock durará 40 minutos desde la creación atómica del
  pedido y será calculada por el Backend.
- Checkout Pro utilizará `binary_mode = false` para admitir pagos `pending` o
  `in_process` y favorecer la aprobación de clientes que necesiten más tiempo o
  validaciones adicionales.
- El vencimiento del contador nunca bastará para restaurar stock. El Backend
  consultará y conciliará el último estado de Mercado Pago; un pago todavía
  pendiente o en proceso permanecerá bajo revisión.
- La vigencia de la preferencia impedirá iniciar pagos nuevos después de los 40
  minutos. Un pago iniciado antes del vencimiento se resolverá por Webhook/API.
- El comercio absorberá el costo de Mercado Pago. No se aplicará ningún recargo
  al comprador por utilizar este medio.
- El comercio eligió disponer de los fondos a 18 días. La referencia de tarifa
  y disponibilidad deberá confirmarse en la cuenta, provincia y medio de pago
  concretos al implementar la integración; no se utilizará para calcular ni
  modificar el total del pedido.
- Mercado Pago cobrará únicamente los productos incluidos en el pedido. Para
  envíos, el costo, la coordinación y la forma de pago se acordarán por separado
  entre el dueño del negocio y el cliente, y no formarán parte del importe enviado
  a Mercado Pago.
- Si un pago de Mercado Pago es rechazado, el cliente podrá reintentarlo sobre
  el mismo pedido durante los 40 minutos de reserva. El reintento creará un
  nuevo intento de pago, pero no descontará stock nuevamente. Cumplido ese plazo,
  el pedido se cancelará y el stock se liberará según las reglas de cancelación,
  previa conciliación del estado del proveedor cuando corresponda.
- La primera versión admitirá únicamente reintegros totales. No se procesarán
  reintegros parciales.
- El formulario de arrepentimiento solo iniciará una solicitud y nunca ejecutará
  un reintegro automáticamente. La solicitud, su decisión, la devolución física
  y el reintegro mantendrán estados independientes.
- Para un pedido pagado con Mercado Pago, un arrepentimiento aprobado podrá
  originar un reintegro por el importe efectivamente cobrado por los productos.
  El costo de devolución se registrará por separado y se resolverá manualmente.
  El total económico del caso podrá sumar ambos componentes, pero la API de
  Mercado Pago recibirá únicamente el importe cobrado por los productos.
- El servicio de reintegro será común y podrá invocarse tanto desde un
  arrepentimiento aprobado como desde una cancelación administrativa válida, sin
  duplicar la lógica ni las operaciones financieras.
- Efectivo y transferencia continuarán utilizando un reintegro manual auditado;
  estas reglas de reintegro automático aplican únicamente a pagos de Mercado
  Pago.
- Los contracargos no tendrán un módulo público inicial. Se notificarán y
  registrarán para alertar al administrador; la disputa se gestionará en Mercado
  Pago. Un contracargo no iniciará un reintegro ni restaurará stock
  automáticamente.
