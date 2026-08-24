# Botón de Arrepentimiento — Pruebas manuales

Fecha: 19 de agosto de 2026  
Entorno autorizado: Supabase local

## Preparación

1. Iniciar Docker Desktop.
2. Desde la raíz ejecutar `pnpm dlx supabase@2.113.0 status` y comprobar que la
   API sea `http://127.0.0.1:54321`.
3. Iniciar el Backend con `pnpm dev:local` dentro de `backend/`.
4. Iniciar el Frontend con `pnpm dev` dentro de `frontend/`.
5. Disponer de un administrador local y, para los casos vinculados, crear una
   compra de prueba desde el checkout público. No usar datos personales reales.
6. Conservar el número de pedido, celular, estado, pago y stock iniciales.

## Acceso e información previa

### M01 — Acceso desde cualquier ruta pública

1. Abrir inicio, catálogo, carrito, checkout, términos y privacidad.
2. Comprobar en desktop y móvil que aparece `BOTÓN DE ARREPENTIMIENTO` desde el
   primer acceso, sin abrir menús ni iniciar sesión.

Resultado esperado: el enlace es visible, tiene foco de teclado, contraste AA y
abre `/arrepentimiento`.

### M02 — Información en checkout

1. Completar el checkout hasta antes de confirmar.
2. Revisar el aviso sobre el derecho de revocación.

Resultado esperado: el aviso está destacado antes de confirmar y enlaza al
formulario; no exige marcar una renuncia ni aceptar una restricción del derecho.

## Formulario público

### M03 — Validaciones mínimas

Intentar enviar sucesivamente:

- sin número y sin marcar `No encuentro mi número de pedido`;
- con ambas alternativas a la vez;
- con celular incompleto;
- con comentario mayor a 1.000 caracteres.

Resultado esperado: cada error se muestra junto al campo, se anuncia de forma
accesible y no se envía la solicitud.

### M04 — Solicitud sin número de pedido

1. Marcar `No encuentro mi número de pedido`.
2. Ingresar un celular sintácticamente válido y enviar.

Resultado esperado: se crea la constancia inmediatamente, el estado inicial no
revela si existe una compra y el mensaje indica que se coordinará la identificación.

### M05 — Solicitud con pedido coincidente

1. Ingresar el número y el mismo celular usados en la compra local.
2. Enviar la solicitud.

Resultado esperado: se obtiene una constancia con formato `AR-...`, sin mostrar
datos internos del pedido ni comunicar una aprobación discrecional.

### M06 — Pedido inexistente o celular diferente

1. Repetir con un número inexistente.
2. Repetir con un número existente y otro celular.

Resultado esperado: ambas entradas válidas reciben una constancia equivalente;
la respuesta pública no permite distinguir cuál dato no coincidió.

### M07 — Doble envío e idempotencia

1. En DevTools, repetir exactamente la misma petición con la misma cabecera
   `Idempotency-Key`.
2. Reutilizar luego esa clave cambiando el comentario o el celular.

Resultado esperado: el primer replay devuelve la misma solicitud/código sin
duplicar eventos; cambiar el payload produce conflicto y no crea otra solicitud.

### M08 — Privacidad del código

Después de crear una solicitud revisar URL, historial, cookies, Local Storage,
Session Storage y logs visibles del navegador.

Resultado esperado: el código completo sólo está en la constancia en memoria y
no aparece en URL, cookies o almacenamiento persistente.

## Consulta pública

### M09 — Consulta válida

1. Copiar el código de la constancia.
2. Abrir `/arrepentimiento/consulta` e ingresarlo.

Resultado esperado: se muestran únicamente estado, fechas, explicación y próximo
paso; no aparecen teléfono, pedido, productos, importe, notas ni IDs internos.

### M10 — Código inválido

Consultar un código con formato válido pero inexistente y otro con formato roto.

Resultado esperado: mensaje genérico, sin revelar existencia de datos; la página
no reintenta automáticamente.

### M11 — No aplicabilidad comunicada

Después de completar M17, consultar el código público.

Resultado esperado: se muestra `No corresponde`, la explicación pública cargada
por Administración y el canal para pedir revisión o formular un reclamo; nunca
se muestran notas internas.

## Administración

### M12 — Protección de rutas

Abrir `/admin/arrepentimientos` sin sesión y probar los endpoints admin sin cookie.

Resultado esperado: redirección al login o `401/403`; ninguna solicitud ni
teléfono queda expuesto.

### M13 — Bandeja y responsive

1. Iniciar sesión y abrir la bandeja.
2. Probar búsqueda, estado, vinculación, cumplimiento y orden urgente.
3. Repetir a 360, 768, 1024 y 1280 px.

Resultado esperado: filtros reflejados en URL, contador/alertas coherentes, tabla
en desktop y fichas sin scroll horizontal por debajo de 1024 px.

### M14 — Identificación y vinculación

1. Abrir una solicitud sin pedido.
2. Consultar candidatos.
3. Confirmar que ninguno esté preseleccionado.
4. Elegir el pedido correcto, escribir nota y vincular.

Resultado esperado: sólo se vincula el pedido elegido, aumenta `version`, aparece
un evento y no cambian pedido, pago ni stock.

### M15 — Concurrencia

1. Abrir el mismo detalle en dos pestañas.
2. Ejecutar una acción en la primera.
3. Intentar otra acción con la versión vieja en la segunda.

Resultado esperado: la segunda recibe conflicto, solicita recargar y no duplica
eventos ni efectos.

### M16 — Determinar aplicabilidad

1. Iniciar revisión de una solicitud vinculada.
2. Seleccionar `Determinar que corresponde` con el fundamento operativo requerido.

Resultado esperado: estado `Corresponde`; devolución y reintegro se inicializan
independientemente según entrega y pago. La UI habla de aplicabilidad, no de una
aprobación comercial. Si el pedido aún no fue entregado, queda cancelado y el
stock se repone exactamente una vez; si ya fue entregado, conserva su estado.

### M17 — Determinar no aplicabilidad

1. Iniciar revisión de otra solicitud.
2. Intentar determinar que no corresponde sin fundamento o sin explicación pública.
3. Completar ambos textos y confirmar.

Resultado esperado: los intentos incompletos fallan; el válido queda auditado y
la consulta pública muestra sólo la explicación destinada a la persona.

### M18 — Restitución y stock

Para un pedido pagado y entregado:

1. Determinar aplicabilidad.
2. Coordinar una restitución recíproca y simultánea.
3. Registrar recepción y reintegro manual con referencia no sensible.
4. Inspeccionar y clasificar el producto para el stock.

En la inspección, comprobar que los campos comiencen vacíos, que cada producto
exija `aptas + no aptas = vendidas` y probar tanto una clasificación mixta como
una con cero unidades aptas.

Resultado esperado: la inspección no bloquea arbitrariamente el reintegro; sólo
las unidades aptas vuelven al stock una vez; pedido histórico, devolución y pago
mantienen estados separados. Cada reposición crea un movimiento específico ligado
al pedido y a la solicitud; cero aptas resuelve el caso sin cambiar stock.

### M19 — Cierre con obligaciones pendientes

Intentar cerrar antes y después de completar devolución/reintegro aplicables.

Resultado esperado: el primer intento se rechaza; el segundo cierra y agrega un
único evento.

### M20 — Idempotencia administrativa

Repetir una acción, vínculo o reintegro con la misma `Idempotency-Key`; luego
reutilizarla con otro payload.

Resultado esperado: el replay idéntico no duplica versión, evento, stock ni
dinero; la reutilización distinta produce conflicto.

### M21 — Contingencia por WhatsApp

Registrar desde Administración una solicitud recibida por WhatsApp indicando la
fecha/hora real.

Resultado esperado: genera código, conserva `acknowledgement_due_at`, advierte si
se aproxima o superó el máximo de 24 horas y no afirma que WhatsApp fue enviado o leído.
La fecha visible corresponde al horario de Argentina y se persiste como el mismo
instante UTC, sin depender de la zona horaria del navegador.

## Seguridad, accesibilidad y regresión

### M22 — Antiabuso y CAPTCHA

Enviar solicitudes repetidas desde la misma IP/celular hasta alcanzar umbral y
bloqueo.

Resultado esperado: primero se solicita CAPTCHA; al superar el máximo responde
`429` con espera. La indisponibilidad de Turnstile no elimina los límites locales.

### M23 — Teclado y lector de pantalla

Recorrer acceso, formulario, errores, constancia, consulta, filtros, modal y
acciones sólo con teclado y con lector de pantalla.

Resultado esperado: orden lógico, foco visible, labels/errores asociados, foco en
el título de éxito y cierre de modal con Escape devolviendo el foco.

### M24 — Regresión comercial

Crear, consultar, confirmar y cancelar un pedido común; revisar catálogo, carrito,
checkout, configuración, productos y categorías.

Resultado esperado: los flujos existentes siguen funcionando y cancelar restaura
stock exactamente una vez.

### M25 — Pedido pendiente, pago confirmado y reintegro manual

1. Crear un pedido en estado `Pendiente` y confirmar su pago.
2. Registrar una solicitud, identificar ese pedido, comenzar la revisión y
   determinar que corresponde.
3. Verificar que el pedido quede `Cancelado`, el pago conserve `Pago confirmado`
   y el resumen muestre el total cobrado como importe a devolver.
4. Marcar el reintegro en proceso.
5. Realizar el reintegro fuera del sistema.
6. Abrir `Confirmar que devolviste el dinero`, comprobar el importe mostrado e
   ingresar una referencia no sensible.
7. Confirmar y luego finalizar el caso.

Resultado esperado: no aparece `403`; el reintegro pasa a `Dinero devuelto`, el
pedido conserva su estado de pago histórico y el caso puede finalizarse. La
referencia y el evento se registran una sola vez.

### M26 — Ayudas de los modales

Abrir todas las acciones disponibles en distintos estados y comprobar que cada
modal muestre propósito, consecuencia, label visible, placeholder con un ejemplo
válido, salida sin guardar y un botón que describa el resultado. El modal de
reintegro debe mostrar importe, medio original y ejemplos de referencia sin
solicitar CBU, alias ni datos bancarios completos.

### M27 — Reintegro sin gasto adicional de devolución

1. Abrir `Confirmar dinero devuelto` para una compra pagada por $8.910.
2. No marcar `La persona pagó un gasto extra para devolver el producto`.
3. Verificar que el total a confirmar sea $8.910.
4. Completar referencia y nota, marcar la confirmación del importe y guardar.

Resultado esperado: el gasto adicional queda en $0 y el total registrado es
$8.910. El formulario nunca solicita volver a escribir el total de la compra.

### M28 — Reintegro con gasto adicional real

1. Abrir el reintegro de una compra pagada por $8.910.
2. Marcar que la persona pagó un gasto extra de devolución.
3. Ingresar $2.500 en el campo que aparece.
4. Verificar el cálculo $8.910 + $2.500 = $11.410 y confirmarlo.

Resultado esperado: el sistema registra $2.500 como gasto adicional y $11.410
como total. Si el total enviado no coincide con el desglose, el Backend rechaza
la operación sin modificar el caso.

### M29 — Rectificación auditada de un importe mal cargado

1. Abrir un caso completado donde figure $8.910 como compra y $8.910 como gasto
   adicional por error.
2. Elegir `Rectificar importe registrado`.
3. Desmarcar el gasto adicional, escribir un motivo claro y confirmar $8.910.
4. Revisar el resumen y el historial.

Resultado esperado: el resumen vigente muestra gasto adicional $0 y total
$8.910. El historial conserva la confirmación original y agrega
`Importe del reintegro rectificado` con actor, fecha y motivo; no se registra un
nuevo movimiento de dinero ni se reabre el caso.

## Evidencia recomendada

Para cada caso registrar fecha, navegador, viewport, datos ficticios usados,
resultado, captura y código de solicitud parcial. No incluir teléfonos completos,
códigos públicos completos, tokens, cookies ni claves en tickets o capturas.
