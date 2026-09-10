# Mercado Pago Checkout Pro — Plan de implementación

> Estado: diseño post-MVP recuperado y alineado con la aplicación vigente; las
> decisiones comerciales marcadas como pendientes requieren aprobación antes de
> modificar código o base de datos.
>
> Alcance geográfico: Argentina (`site_id: MLA`, moneda `ARS`).
>
> Fecha de revisión: 25 de agosto de 2026.

## 1. Objetivo

Integrar Mercado Pago Checkout Pro de extremo a extremo sin romper el flujo de compra existente, manteniendo separadas las responsabilidades de pago, pedido y preparación del pedido.

La solución debe cubrir:

- creación segura del pedido y de la preferencia de pago;
- redirección del comprador a Mercado Pago;
- confirmación autoritativa mediante Webhooks y consulta a la API de Mercado Pago;
- visualización pública del estado real del pago;
- operaciones administrativas de confirmación, preparación, cancelación y reintegro;
- recuperación de stock exactamente una vez;
- conciliación de eventos perdidos o fuera de orden;
- auditoría, privacidad, idempotencia y protección de credenciales.

El Botón de Arrepentimiento ya está implementado como un módulo independiente,
definido en `BOTON-ARREPENTIMIENTO-SDD.md`. Checkout Pro deberá integrarse con su
liquidación y sus estados actuales sin duplicar solicitudes, devoluciones,
reintegros, eventos ni movimientos de stock.

Este documento define el plan. No autoriza por sí mismo cambios de arquitectura, reglas de negocio, base de datos o dependencias.

## 2. Fuentes de verdad y prerrequisitos documentales

La implementación deberá respetar la prioridad documental establecida en `AGENTS.md`.

La documentación vigente describe correctamente el alcance histórico del MVP:
efectivo y transferencia, sin Mercado Pago. Como el MVP ya fue entregado, esta
integración se documentará como una funcionalidad post-MVP sin reescribir esa
historia. `BUSINESS-RULES.md`, `DATABASE-SDD.md` y `BACKEND-SDD.md` ya contienen
el contrato mínimo de extensión para un proveedor asíncrono. Antes de implementar
deberán ampliarse, con aprobación expresa, los siguientes documentos en este orden:

1. `BUSINESS-RULES.md`: habilitar Mercado Pago, establecer disponibilidad por modalidad de entrega, reglas de reserva de stock, reintentos, vencimiento, cancelaciones y reintegros.
2. `DATABASE-SDD.md`: definir entidades, estados, restricciones, RPC y políticas de acceso.
3. `BACKEND-SDD.md`: definir endpoints, servicios, Webhook, conciliación y contratos.
4. `FRONTEND-SDD.md`: incorporar la opción de pago, redirección, retorno y estados públicos.
5. `ADMIN-SDD.md`: incorporar conciliación y reintegros.
6. `DECISIONS.md`: registrar decisiones irreversibles o con impacto transversal.

No se debe iniciar una migración ni modificar código hasta cerrar las decisiones del apartado 5.

## 3. Situación actual relevada

### 3.1 Flujo público actual

1. El cliente agrega productos y cantidades al carrito.
2. El checkout solicita nombre, apellido y celular.
3. Elige retiro o envío a coordinar.
4. Para envío se exige dirección.
5. Elige efectivo o transferencia según las reglas vigentes.
6. El frontend envía `POST /api/orders` con CSRF, validación de origen e idempotency key.
7. El backend vuelve a obtener productos y precios desde la base, valida actividad y stock y calcula los importes.
8. Una operación atómica crea pedido, ítems, movimiento de stock y relación con la sesión pública; el stock se descuenta en ese momento.
9. El backend establece `order_status = pending` y `payment_status = pending`.
10. El frontend limpia carrito y borrador, navega a `/pedido/:orderNumber` y recupera la confirmación desde el backend.

### 3.2 Operación administrativa actual

- El estado del pedido y el estado del pago son independientes.
- El administrador puede confirmar el pago de forma manual.
- El administrador puede confirmar el pedido y avanzar por preparación, listo, retirado o entregado.
- La cancelación restaura el stock mediante una operación atómica y solo una vez.
- Si el pedido está marcado como pagado, el sistema exige actualmente confirmar que el reintegro fue realizado manualmente.
- El Botón de Arrepentimiento ya registra solicitud, decisión, devolución física,
  liquidación, correcciones, eventos y reingreso de stock mediante estados
  independientes.
- `consumer_withdrawal_settlements` es la fuente de verdad económica de una
  solicitud aplicable; una operación técnica del proveedor solo podrá vincularse
  a ella y nunca reemplazarla.

### 3.3 Controles que deben conservarse

- frontend sin acceso directo a Supabase;
- validación Zod en frontend y backend;
- precios, descuentos y stock determinados por el backend;
- sesión pública anónima mediante cookie `HttpOnly`, `Secure` y `SameSite=Lax` en producción;
- CSRF, validación de origen, rate limiting e idempotencia en mutaciones públicas;
- autenticación, rol, CSRF y control de concurrencia en mutaciones administrativas;
- respuestas públicas con `Cache-Control: no-store`;
- transiciones de estado y stock ejecutadas de forma atómica.

## 4. Principios de diseño

1. **Mercado Pago confirma pagos; el navegador no.** Ni las `back_urls`, ni sus query params, ni una pantalla de éxito pueden marcar un pedido como pagado.
2. **Pedido y pago son procesos distintos.** Se relacionan, pero tienen estados y auditoría propios.
3. **El backend conserva la autoridad comercial.** Los productos, importes, descuentos, moneda y referencia se generan desde datos persistidos por el servidor.
4. **Toda operación externa puede repetirse.** Preferencias, Webhooks, conciliaciones, cancelaciones y reintegros deben ser idempotentes.
5. **No existe una transacción distribuida entre PostgreSQL y Mercado Pago.** Los estados intermedios y la recuperación ante fallos deben modelarse expresamente.
6. **El stock se descuenta y se restaura exactamente una vez.** Ningún Webhook repetido puede duplicar movimientos.
7. **La aprobación del pago no reemplaza la confirmación operativa.** Mercado Pago actualiza el pago a `paid` y el administrador conserva la acción explícita de confirmar el pedido.
8. **Checkout Pro reduce el alcance PCI.** La aplicación nunca solicita, transmite ni almacena datos de tarjeta.
9. **Los retornos públicos muestran información, no ejecutan decisiones financieras.** La pantalla consulta el estado al backend.

## 5. Decisiones de alcance

### 5.1 Invariantes ya aprobadas por la documentación vigente

- Se conservan efectivo y transferencia bancaria; Mercado Pago se incorpora como tercer método de pago.
- Mercado Pago estará disponible tanto para retiro en el local como para envío a
  coordinar.
- La primera versión de Checkout Pro admitirá únicamente dinero disponible en la
  cuenta de Mercado Pago y tarjetas de débito. Se excluirán tarjetas de crédito,
  medios offline tipo `ticket` —incluidos Rapipago y Pago Fácil— y cualquier
  modalidad de financiación o cuotas sin tarjeta expuesta por la cuenta.
- No se utilizará `purpose = wallet_purchase`: esa configuración exigiría que
  todos los compradores tengan una cuenta de Mercado Pago e impediría pagar con
  débito como invitado. La preferencia aplicará exclusiones explícitas y el
  Backend verificará los tipos realmente disponibles en el ambiente antes de
  habilitar el método.
- El descuento configurado para transferencia se aplica exclusivamente a `bank_transfer` y nunca a Mercado Pago.
- Un pago aprobado actualiza el pago a `paid`, pero no confirma automáticamente el pedido: el administrador conserva `Confirmar pedido`.
- La reserva local de stock de Mercado Pago tendrá una duración inicial de 40
  minutos desde la creación atómica del pedido. El valor será configurable desde
  una única fuente del backend y nunca se hardcodeará en el Frontend.
- Checkout Pro utilizará `binary_mode = false`. Los estados `pending` e
  `in_process` forman parte del flujo normal y deberán resolverse mediante Webhook
  y conciliación antes de liberar stock.
- Los intentos, eventos y operaciones técnicas del proveedor se persisten por
  separado. `orders.payment_status` conserva únicamente el resumen histórico de
  cobro y no representa el ciclo de un reintegro.
- Una solicitud de arrepentimiento conserva su liquidación y `refund_status`; una
  operación de Mercado Pago se vincula opcionalmente a esa liquidación y se
  concilia sin reescribirla.
- Las llamadas externas son asíncronas, idempotentes, reintentables y ocurren
  fuera de toda transacción PostgreSQL abierta.
- El stock se restaura exactamente una vez mediante las operaciones atómicas
  vigentes. Un Webhook o reintegro nunca modifica inventario por sí solo.

### 5.2 Decisiones comerciales y operativas pendientes

- Definir cómo se comunicarán y absorberán las comisiones y promociones de
  Mercado Pago. La primera versión no ofrecerá crédito, financiación ni cuotas;
  el total del pedido no debe alterarse ni incorporar recargos no documentados y
  cualquier costo comercial deberá quedar fuera de los cálculos confiados al
  frontend.
- Confirmar que, para envíos a coordinar, Mercado Pago cobrará inicialmente solo los productos y que el costo de envío continuará acordándose y abonándose por separado, de forma explícita para el cliente.
- Definir si un intento rechazado puede reintentarse sobre el mismo pedido y bajo
  qué vigencia, sin volver a descontar stock.
- Confirmar si el primer incremento automatiza únicamente reintegros totales. El
  Botón de Arrepentimiento vigente resuelve la revocación completa y no debe
  ampliarse implícitamente a devoluciones parciales.

### 5.3 Decisiones técnicas pendientes

- Elegir el mecanismo de procesamiento confiable de eventos. Recomendación compatible con la arquitectura actual: persistir el evento antes de responder y procesarlo mediante una bandeja durable en PostgreSQL, con reintentos y conciliación programada.
- Elegir el programador de tareas permitido. Vercel Cron o Supabase Cron solo
  podrán despertar un endpoint interno firmado del backend; no ejecutarán reglas
  comerciales ni RPC financieras directamente. No agregar infraestructura sin
  aprobación.
- Definir las URLs HTTPS públicas para Webhook y retornos en desarrollo, staging y producción. `localhost` no es suficiente para el flujo completo; en desarrollo se necesita un túnel HTTPS o un entorno preview controlado.
- Decidir si se utiliza el Wallet Brick de `@mercadopago/sdk-react` o una redirección backend-validada a `init_point`. Recomendación: Wallet Brick para la integración soportada, manteniendo un enlace de continuación accesible como alternativa.
- Aprobar la matriz definitiva que mapea estados y detalles del proveedor al resumen financiero local, incluidos pago tardío, contracargo y reintegro iniciado fuera de la aplicación.
- Definir responsables, ambientes, URLs HTTPS, credenciales, rotación de secretos, monitoreo y respuesta ante incidentes antes de habilitar producción.

## 6. Modelo funcional propuesto

### 6.1 Estados del pedido

Se conservan los estados operativos actuales:

- `pending`
- `confirmed`
- `preparing`
- `ready`
- `picked_up`
- `delivered`
- `cancelled`

No se utilizará el estado del pedido para representar `approved`, `rejected`, `refund_pending` ni otros estados financieros.

### 6.2 Estado resumido del cobro en `orders`

Se conserva el enum vigente mientras no exista una decisión superior que lo
amplíe:

- `pending`: todavía no existe un cobro aprobado y confirmado;
- `paid`: cobro aprobado y conciliado con el pedido local;
- `rejected`: no existe un cobro aprobado y el último resultado definitivo fue
  rechazado.

Los estados específicos de Mercado Pago (`status` y `status_detail`), incluidos
procesamiento, cancelación, vencimiento, reintegro y contracargo, se almacenarán
en operaciones del módulo de pagos y se mapearán de forma explícita. No se
copiarán ciegamente al enum interno ni se utilizará `orders.payment_status` para
representar el ciclo de devolución económica.

### 6.3 Entidades de persistencia

Los nombres definitivos se resolverán en `DATABASE-SDD.md`; el siguiente modelo expresa responsabilidades.

#### `payment_transactions`

Una fila por intento o transacción externa:

- `id`, `order_id`, `provider`, `environment`;
- `provider_preference_id` y `provider_payment_id`, únicos cuando existan;
- `external_reference` controlada por el backend;
- estado normalizado, `provider_status` y `provider_status_detail`;
- importe esperado, importe informado y moneda;
- fechas de creación, aprobación, actualización y vencimiento;
- identificador/fingerprint de idempotencia, sin guardar secretos;
- datos técnicos mínimos y saneados para conciliación.

La relación será uno-a-muchos desde `orders`: cada reintento crea una transacción nueva y nunca vuelve a descontar stock.

No se almacenarán Access Token, Webhook Secret, datos de tarjeta, headers completos ni payloads con información personal innecesaria.

#### `payment_events`

Bandeja durable y append-only para Webhooks:

- identificador único del evento o clave compuesta de deduplicación;
- tópico, acción y resource ID;
- fecha de recepción y resultado de verificación de firma;
- estado `received`, `processing`, `processed`, `retryable_error` o `dead_letter`;
- cantidad de intentos, próxima ejecución y código de error saneado;
- fechas de procesamiento.

#### `payment_provider_operations`

Registro técnico independiente para crear/cancelar una preferencia, conciliar un
pago o ejecutar/consultar un reintegro:

- pedido y transacción de origen;
- tipo de operación y origen: `checkout`, `admin`, `withdrawal` o `system`;
- vínculo nullable a `consumer_withdrawal_settlements` cuando la obligación
  económica provenga del Botón de Arrepentimiento;
- importe, moneda e identificador externo cuando corresponda;
- estado `pending`, `processing`, `succeeded`, `failed` o `manual_review`;
- clave de idempotencia estable;
- administrador o solicitud de arrepentimiento que lo originó;
- auditoría y error saneado.

La operación técnica no reemplaza ni reescribe la liquidación. Su resultado
actualiza de forma idempotente el `refund_status` de la solicitud mediante el
contrato existente. La primera versión podrá limitarse a un reintegro total por
liquidación si esa decisión comercial es aprobada.

### 6.4 Restricciones e índices mínimos

- IDs de preferencia, pago, evento y reintegro únicos por proveedor y ambiente.
- Moneda `ARS` para esta integración.
- Importes positivos y reintegros acumulados no superiores al importe capturado.
- Una única restauración de stock por cancelación.
- Una única transición financiera efectiva por evento deduplicado.
- Índices por `order_id`, IDs del proveedor, estado y próxima fecha de reintento.
- Foreign keys y checks que impidan asociaciones cruzadas entre pedidos.
- RLS habilitado y default-deny en todas las tablas nuevas.
- Sin permisos directos para `anon` o `authenticated`; permisos mínimos para `service_role`.
- Las RPC serán `SECURITY INVOKER` por defecto. Si una operación requiere
  justificadamente `SECURITY DEFINER`, vivirá en un esquema no expuesto, fijará
  `search_path = ''`, calificará todos los nombres y revocará `EXECUTE` a
  `PUBLIC`, `anon` y `authenticated`.

## 7. Flujo público objetivo

### 7.1 Inicio del checkout

1. Incorporar `mercado_pago` a los schemas y contratos solo después de actualizar las reglas superiores.
2. Mostrar la opción con descripción clara: el cliente será redirigido a Mercado Pago y el pedido se confirma cuando el proveedor notifique el pago.
3. No aplicar el descuento configurado para transferencia.
4. Mantener el resumen final antes de confirmar.
5. Reemplazar el texto actual que afirma que no se cobrará desde esa página por un mensaje compatible con la redirección.
6. Mantener React Hook Form y Zod; no recibir ni renderizar campos de tarjeta.

### 7.2 Creación de pedido y preferencia

1. El frontend envía el pedido con `paymentMethod = mercado_pago` y una idempotency key.
2. El backend valida sesión, CSRF, origen, payload, productos, stock y modalidad de entrega.
3. El backend recalcula el total usando datos de la base.
4. En una transacción local crea el pedido, descuenta stock, crea la relación con la sesión pública y registra un intento de pago `preference_creating`.
5. Después del commit, el backend crea la preferencia con el SDK/API oficial y una idempotency key estable asociada al intento.
6. La preferencia incluye únicamente datos server-side validados:
   - ítems, cantidades y precios del pedido persistido;
   - moneda `ARS`;
   - `external_reference` opaca que vincule el pedido;
   - `notification_url` HTTPS;
   - `back_urls` de éxito, pendiente y fallo;
   - `auto_return = approved`;
   - `binary_mode = false`;
   - vigencia de la preferencia de 40 minutos mediante `expires`,
     `expiration_date_from` y `expiration_date_to`, alineada con
     `reservation_expires_at`; `date_of_expiration` no se utilizará como sustituto
     porque pertenece al vencimiento de medios offline;
   - exclusión de medios offline si se aprueba la recomendación del apartado 5.2;
   - metadata mínima, sin celular, dirección ni datos sensibles.
7. El backend persiste `preference_id`, vencimiento y ambiente.
8. Devuelve al frontend solo los datos públicos necesarios para inicializar Checkout Pro.
9. El frontend limpia el carrito únicamente cuando el pedido y el intento quedaron persistidos y existe una respuesta recuperable. Si falla la navegación, debe poder continuar el pago desde el detalle del pedido.

La creación de la preferencia configurará `payment_methods` para excluir todos
los tipos distintos de dinero en cuenta y débito. Antes de habilitar la
integración en cada ambiente, el Backend consultará `/v1/payment_methods` con las
credenciales correspondientes, registrará los identificadores y tipos ofrecidos
y verificará mediante una prueba de Checkout Pro que no aparezcan crédito,
`ticket`, financiación ni cuotas sin tarjeta. Esta comprobación evita depender de
una lista histórica de identificadores del proveedor.

### 7.3 Fallos distribuidos al crear la preferencia

- **Error definitivo antes de crearla:** cancelar el pedido mediante una compensación atómica y restaurar el stock una sola vez, o permitir reintento según la decisión comercial.
- **Timeout o respuesta incierta:** no crear otra preferencia ni restaurar stock de inmediato. Marcar el intento para conciliación y reutilizar la misma idempotency key.
- **Preferencia creada pero respuesta perdida:** la conciliación debe recuperar el intento o crear nuevamente con la misma clave idempotente.
- **Múltiples clics:** devolver el mismo pedido/intento para la misma idempotency key y fingerprint de payload.

### 7.4 Redirección y retorno

1. Inicializar el Wallet Brick con la Public Key y el `preferenceId`, o abrir un `init_point` validado.
2. Si se expone una URL de redirección, validar que use HTTPS y un host permitido de Mercado Pago antes de entregarla al navegador.
3. Crear páginas públicas diferenciadas o una ruta común para éxito, pendiente y fallo.
4. Ignorar cualquier `status`, `payment_id` o `external_reference` de la URL como prueba de pago.
5. Consultar el pedido al backend mediante la sesión pública vigente.
6. Mostrar `Procesando pago` hasta recibir el estado confirmado; realizar polling acotado con TanStack Query y ofrecer actualización manual.
7. Si el intento es recuperable y la reserva sigue vigente, ofrecer `Continuar pago` sin generar un pedido nuevo.
8. Nunca exponer IDs internos, Access Token ni respuestas completas del proveedor.

## 8. Webhook y confirmación autoritativa

### 8.1 Endpoint

Crear `POST /api/webhooks/mercado-pago` con estas particularidades:

- no usa cookie de sesión, CSRF ni validación de origen porque Mercado Pago es un emisor externo;
- sí aplica límite de tamaño, JSON estricto, observabilidad, protección contra abuso compatible con reintentos y validación criptográfica;
- recibe `x-signature`, `x-request-id` y `data.id` según la documentación vigente;
- valida HMAC SHA-256 usando el Webhook Secret, comparación en tiempo constante y el manifiesto exacto documentado por Mercado Pago;
- normaliza los campos exactamente como indica la documentación y define una tolerancia segura de timestamp si la especificación vigente la requiere;
- rechaza firmas ausentes, malformadas o inválidas sin registrar secretos;
- persiste el evento deduplicado antes de confirmar recepción;
- responde `200` o `201` rápidamente una vez que la recepción durable está asegurada.

El algoritmo exacto no debe copiarse de ejemplos de terceros: se implementará y probará contra la documentación oficial vigente al comenzar esa fase.

### 8.2 Procesamiento del evento

1. Reclamar el evento con bloqueo transaccional para impedir procesamiento concurrente.
2. Consultar el pago directamente en la API de Mercado Pago usando el resource ID.
3. Validar antes de aplicar el resultado:
   - firma y tópico aceptados;
   - `external_reference` correspondiente a un pedido existente;
   - aplicación/cuenta receptora esperada;
   - ambiente `test` o producción coherente;
   - moneda `ARS`;
   - importe exactamente igual al total pendiente del pedido;
   - pago no asociado previamente a otro pedido.
4. Mapear el estado externo al estado interno mediante una tabla explícita.
5. Aplicar una transición monotónica: un evento viejo no puede degradar `paid` a `pending`.
6. Actualizar pago, resumen del pedido, evento y auditoría dentro de una transacción.
7. Marcar errores recuperables para reintento con backoff y jitter.
8. Enviar errores agotados a `dead_letter` y mostrarlos en administración/observabilidad.

### 8.3 Resultado sobre el pedido

- `approved`: `orders.payment_status = paid`; el pedido continúa `pending` hasta
  confirmación administrativa.
- `pending` o `in_process`: resultado normal con `binary_mode = false`; conservar
  `orders.payment_status = pending`, registrar el estado del proveedor y conciliar.
  Al vencer los 40 minutos no se liberará stock mientras el proveedor confirme
  que la operación todavía puede aprobarse.
- `rejected`: `orders.payment_status = rejected` solo cuando no exista otro
  intento vigente o aprobado; permitir reintento únicamente si la política
  aprobada y la reserva lo permiten.
- `cancelled` o vencido: conservar el resultado técnico en la transacción;
  cancelar el pedido y restaurar stock cuando no exista otro intento válido.
- reintegro: actualizar la operación técnica y, cuando exista, el
  `consumer_withdrawal_settlements.refund_status`; no reescribir el pago histórico
  del pedido.
- contracargo: registrarlo en el módulo de pagos, bloquear automatismos peligrosos
  y generar alerta administrativa sin inventar un estado operativo del pedido.

## 9. Reserva de stock, vencimiento y conciliación

### 9.1 Vencimiento

1. Guardar `reservation_expires_at = created_at + 40 minutos`, calculado por la
   operación atómica en la base de datos.
2. Configurar la vigencia de la preferencia con el mismo límite de 40 minutos.
   Esto impide iniciar un pago nuevo después del vencimiento, pero no demuestra
   que un pago iniciado anteriormente haya terminado.
3. Ejecutar un proceso periódico que busque reservas vencidas.
4. Antes de liberar stock, consultar Mercado Pago. Un estado `pending` o
   `in_process` mantiene la reserva en revisión y nunca se interpreta como impago.
5. Si existe pago aprobado, conservar el pedido y aplicar el pago.
6. Si el pago sigue no capturado y puede cancelarse, solicitar la cancelación al proveedor.
7. Cancelar localmente el pedido y restaurar stock en una única transacción idempotente.
8. Impedir que un pago tardío reactive silenciosamente un pedido cuyo stock ya fue liberado; enviarlo a conciliación y, si fue capturado, iniciar resolución/reintegro.
9. Mostrar un contador informativo de 40 minutos basado en
   `reservation_expires_at`; el backend continúa siendo la autoridad aunque el
   reloj del navegador difiera. Al agotarse, la UI mostrará `Estamos verificando
   tu pago` hasta recibir el resultado autoritativo.
10. Una reserva vencida no se prorroga: un nuevo checkout vuelve a validar stock y crea un pedido nuevo.

### 9.2 Conciliación

Crear un proceso programado y una acción administrativa `Sincronizar con Mercado Pago` que:

- consulte intentos pendientes, inciertos, Webhooks fallidos y reintegros en proceso;
- use locks para evitar ejecuciones duplicadas;
- aplique la misma lógica de validación y transición que el Webhook;
- no permita editar manualmente IDs ni estados del proveedor;
- registre actor, origen y resultado;
- alerte diferencias de importe, moneda, cuenta o referencia sin autoaprobarlas.

## 10. Panel administrativo objetivo

### 10.1 Lista y detalle

Mostrar por separado:

- estado operativo del pedido;
- medio y estado resumido del cobro histórico;
- último estado de Mercado Pago y fecha de actualización;
- importe cobrado/reintegrado;
- estado de conciliación;
- solicitud de arrepentimiento vinculada, si existe, consultada desde el módulo
  definido en `BOTON-ARREPENTIMIENTO-SDD.md`.

Los detalles técnicos sensibles y payloads del proveedor no deben aparecer en la UI.

### 10.2 Acciones

- Para Mercado Pago, ocultar o deshabilitar `Confirmar pago` manualmente.
- Ofrecer `Sincronizar con Mercado Pago` con rate limit y auditoría.
- Habilitar `Confirmar pedido` solo si el pago está `paid`, salvo una regla comercial explícita distinta.
- Bloquear preparación y entrega cuando exista una operación de reintegro en
  proceso, contracargo o inconsistencia financiera, sin representar esos casos en
  `orders.payment_status`.
- Conservar optimistic concurrency/versionado en toda mutación.
- Mostrar acciones según una matriz calculada en backend, nunca solo en frontend.
- Mostrar `Cancelar y reintegrar` únicamente para pagos Mercado Pago confirmados, reintegrables y sin otro reintegro efectivo o en curso.

### 10.3 Matriz operativa mínima

| Pedido | Pago | Acción principal permitida |
|---|---|---|
| `pending` | `pending`/`processing` | Sincronizar o esperar; no preparar |
| `pending` | `rejected` | Reintentar dentro de la reserva o cancelar |
| `pending` | `paid` | Confirmar pedido o solicitar reintegro/cancelación |
| `confirmed`/`preparing`/`ready` | `paid` | Continuar operación o iniciar cancelación con reintegro |
| cualquiera no final | operación de reintegro pendiente | Esperar/conciliar; bloquear avance |
| `cancelled` | reintegro confirmado o cobro no capturado | Solo consulta y auditoría |
| `picked_up`/`delivered` | `paid` | No usar cancelación normal; gestionar arrepentimiento/devolución |
| cualquiera | contracargo registrado | Bloquear automatismos y escalar revisión |

## 11. Cancelación y reintegro de pagos

Mercado Pago distingue conceptualmente:

- **cancelación:** pago todavía no completado, normalmente `pending` o `in_process`;
- **reintegro:** devolución de un pago ya aprobado/capturado.

No se debe reutilizar la confirmación manual de reintegro existente para pagos de Mercado Pago.

### 11.1 Pedido no pagado

1. Bloquear el pedido para cancelación mediante versión/lock.
2. Consultar el estado actual en Mercado Pago.
3. Si existe un pago no capturado que admite cancelación, cancelarlo con idempotencia.
4. Si solo existe una preferencia, vencerla o impedir reutilización según las capacidades oficiales vigentes.
5. Cancelar el pedido localmente y restaurar stock una vez.
6. Si la respuesta externa es incierta, no finalizar localmente hasta conciliar.

### 11.2 Pedido pagado y aún no entregado

1. El administrador inicia `Cancelar y reintegrar`, ingresa una razón obligatoria y confirma que se reintegrará el importe total.
2. El backend consulta nuevamente el pago y valida que admita reintegro.
3. Crea una operación técnica de reintegro `pending` con actor, motivo e
   idempotency key estable; si proviene del Botón de Arrepentimiento, la vincula a
   su liquidación. Desde ese momento bloquea avances operativos incompatibles.
4. Solicita el reintegro total a Mercado Pago. Para la primera versión no se enviará importe cuando la API oficial indique que el cuerpo vacío representa reintegro total.
5. Si el reintegro se confirma, una transacción local marca la operación
   `succeeded`, actualiza la liquidación vinculada cuando exista y ejecuta la
   cancelación/restauración de stock que corresponda exactamente una vez. No
   cambia `orders.payment_status` de `paid` a un estado de reintegro.
6. Si la respuesta es incierta, mantiene la operación `processing`, bloquea el
   avance operativo y concilia; no repite con otra clave.
7. Si falla definitivamente, marca la operación `failed` o `manual_review`,
   conserva el pedido pagado y evita restaurar stock por un efecto financiero no
   confirmado. El reintento controlado reutiliza la identidad lógica de la misma
   operación.
8. Si Mercado Pago confirmó el reintegro pero falló la actualización local, Webhook/conciliación completa la transición sin emitir un segundo reintegro.

### 11.3 Pedido retirado o entregado

No se debe convertir automáticamente un pedido entregado en `cancelled`, porque eso borraría la verdad histórica de la entrega. El flujo será:

1. registrar una solicitud de arrepentimiento/devolución independiente;
2. analizar plazo, información suministrada, estado del bien y excepciones legales;
3. coordinar devolución cuando corresponda;
4. iniciar el reintegro en el momento definido por la política aprobada;
5. mantener `picked_up` o `delivered` y `orders.payment_status = paid` como verdad
   histórica; reflejar el reintegro en la operación técnica y el estado
   correspondiente en la solicitud;
6. registrar el reingreso de unidades al stock solo después de verificar su devolución y aptitud, mediante un movimiento separado, no mediante la RPC de cancelación previa a la entrega.

### 11.4 Límites y fallos del proveedor

- Verificar al momento de implementar el plazo vigente de Mercado Pago para reintegros; la documentación consultada indica hasta 180 días desde la aprobación.
- Verificar saldo disponible y tratar el saldo insuficiente como error recuperable/operativo.
- Informar que el plazo de acreditación al cliente depende del medio de pago y de su entidad financiera.
- Nunca prometer un reintegro completo hasta que Mercado Pago lo confirme.
- Registrar y conciliar reintegros iniciados desde el panel de Mercado Pago fuera de la aplicación.

## 12. Integración con el Botón de Arrepentimiento

El modelo, las rutas, la experiencia pública, la bandeja y las reglas de
devolución pertenecen a `BOTON-ARREPENTIMIENTO-SDD.md` y ya están implementados.

Esta integración agregará únicamente:

- origen `withdrawal` en `payment_provider_operations`;
- vínculo opcional entre un reintegro de Mercado Pago y una solicitud aceptada;
- actualización conciliada de la solicitud cuando el reintegro sea confirmado o
  falle;
- navegación administrativa entre el pedido, el reintegro y la solicitud;
- conservación del estado histórico `picked_up` o `delivered` cuando corresponda.

Checkout Pro no duplicará formularios, estados, endpoints ni eventos del Botón de
Arrepentimiento.

Los cambios, garantías, daños y productos incorrectos permanecen fuera del
alcance de este SDD mientras no exista una especificación de Postventa vigente.
Checkout Pro no inventará sus entidades ni estados. Una extensión futura deberá
documentarse primero y reutilizar las operaciones del proveedor sin reescribir el
pago histórico ni repetir movimientos de inventario.

## 13. Seguridad integral

### 13.1 Credenciales y ambientes

- `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` solo en variables secretas del backend.
- La Public Key puede llegar al frontend mediante configuración pública específica del ambiente.
- Separar estrictamente credenciales de prueba y producción, cuentas de prueba y Webhook URLs.
- Rotar secretos, documentar responsables y evitar exponerlos en Git, logs, errores, Supabase o respuestas HTTP.
- El MCP de Mercado Pago sirve para consultar documentación y asistir el desarrollo; no reemplaza las credenciales runtime del SDK/API.

### 13.2 Integridad e idempotencia

- Claves idempotentes distintas y estables para crear preferencia, cancelar pago y reintegrar.
- Restricciones únicas en base de datos y locks transaccionales.
- Comparar fingerprint del payload al reutilizar una clave.
- Procesamiento de Webhooks deduplicado y monotónico.
- Ninguna mutación de stock basada solamente en una respuesta del frontend.
- Validar importe, moneda, referencia, ambiente y cuenta receptora en cada conciliación.

### 13.3 Superficie HTTP

- Cliente de Mercado Pago con timeout, TLS, reintentos solo para operaciones seguras/idempotentes y circuit breaker básico.
- No aceptar URLs arbitrarias; limitar llamadas salientes a hosts oficiales.
- Validar cualquier `init_point` antes de exponerlo.
- Límites de body y schemas estrictos.
- Rate limiting separado para checkout, reintento, sincronización y Webhook.
- Webhook autenticado por firma, sin CSRF; endpoints del usuario y admin conservan sus protecciones actuales.
- CSP actualizada solo con los dominios mínimos requeridos por el SDK oficial.

### 13.4 Datos, privacidad y logs

- No almacenar tarjeta, CVV, documento del pagador ni respuesta completa de Mercado Pago salvo necesidad legal documentada.
- No incluir PII en `external_reference`, metadata, URLs, logs ni nombres de idempotency key.
- Saneamiento centralizado de errores y headers.
- Actualizar términos y privacidad para informar la intervención de Mercado Pago.
- Definir retención y eliminación de eventos e intentos según obligaciones contables/legales.
- Limitar respuestas públicas a un DTO seguro.

### 13.5 Supabase/PostgreSQL

- RLS default-deny en toda tabla nueva, incluso si actualmente solo accede el backend.
- Grants explícitos y mínimos; no confiar únicamente en RLS.
- `service_role` solo en backend.
- RPC financieras `SECURITY INVOKER` por defecto. Cualquier excepción
  `SECURITY DEFINER` deberá justificarse, ubicarse en un esquema no expuesto,
  usar `search_path = ''`, validar argumentos y revocar permisos públicos.
- Revocar explícitamente grants a `anon` y `authenticated` aunque el proyecto ya
  utilice el nuevo comportamiento de Supabase que deja de autoexponer tablas; RLS
  y grants son controles distintos y ambos deben probarse.
- Auditoría append-only para cambios financieros y de stock.
- Pruebas específicas de concurrencia, replay y bypass de RLS.

## 14. API y contratos previstos

Los paths finales se confirmarán en `BACKEND-SDD.md`.

### 14.1 Público

- `POST /api/orders`: extiende el contrato para `mercado_pago` y devuelve un intento recuperable.
- `POST /api/public/orders/:orderNumber/payment-attempts`: reintenta el pago si
  la Guest Session vigente está vinculada al pedido y la reserva sigue activa.
- `GET /api/public/orders/:orderNumber`: extiende la confirmación vigente con el
  estado público del intento y la acción segura siguiente.

### 14.2 Proveedor e internos

- `POST /api/webhooks/mercado-pago`: recepción firmada.
- endpoint interno firmado para procesar/conciliar, solo si el mecanismo de cron elegido lo requiere.

### 14.3 Administración

- `POST /api/admin/orders/:id/sync-payment`.
- `POST /api/admin/orders/:id/refunds`.

Todos los comandos financieros deben aceptar versión/idempotency key, devolver estados asíncronos cuando corresponda y nunca simular éxito ante un resultado incierto.

## 15. Plan de implementación por fases

### Fase 0 — Aprobación y documentación

1. Registrar las decisiones aprobadas del apartado 5.1 y resolver las decisiones pendientes de los apartados 5.2 y 5.3 con negocio, administración y asesoría legal cuando corresponda.
2. Actualizar los SDD en el orden de prioridad.
3. Definir ambientes, URLs, credenciales y responsables.
4. Crear una matriz aprobada de estados y acciones.

**Criterio de salida:** no existen contradicciones documentales y están aprobadas la política de reserva, cancelación, devolución y reintegro.

### Fase 1 — Modelo de datos y operaciones atómicas

1. Diseñar migraciones forward-only para enums/tablas/índices.
2. Crear entidades de pagos, eventos y reintegros.
3. Crear o adaptar RPC para pedido + reserva + intento.
4. Crear transiciones idempotentes de pago, cancelación y stock.
5. Aplicar RLS, grants y hardening de funciones.
6. Generar tipos y adaptar repositorios sin exponer Supabase al frontend.

**Criterio de salida:** migraciones funcionan sobre una base vacía y una copia representativa; concurrencia no duplica pagos ni stock.

### Fase 2 — Adaptador backend de Mercado Pago

1. Crear configuración validada por ambiente.
2. Encapsular SDK/API en un servicio del proveedor.
3. Implementar preferencia, consulta de pago, cancelación y reintegro.
4. Aplicar timeouts, idempotencia, saneamiento y mapeo de errores.
5. Verificar los contratos contra la documentación oficial actual.

**Criterio de salida:** pruebas unitarias cubren éxito, rechazo, timeout, respuesta incierta y credenciales inválidas sin filtrar secretos.

### Fase 3 — Checkout público

1. Extender schemas y cálculo de totales.
2. Crear pedido e intento de pago mediante el flujo distribuido definido.
3. Integrar Wallet Brick/redirección.
4. Crear páginas de retorno autoritativas por consulta al backend.
5. Implementar continuación/reintento de pago.
6. Actualizar mensajes, accesibilidad y estados de carga/error.

**Criterio de salida:** un comprador puede pagar, volver, recargar y recuperar su pedido sin duplicarlo ni confiar en la URL.

### Fase 4 — Webhook, worker y conciliación

1. Registrar Webhook en la aplicación de Mercado Pago.
2. Implementar validación exacta de firma.
3. Persistir eventos y responder rápidamente.
4. Procesar y mapear estados con transiciones monotónicas.
5. Implementar reintentos, dead letter, conciliación y vencimiento de reservas.
6. Agregar métricas y alertas.

**Criterio de salida:** replays, eventos duplicados/fuera de orden y Webhooks perdidos convergen al mismo estado correcto.

### Fase 5 — Administración, cancelaciones y reintegros

1. Mostrar estado financiero separado del operativo.
2. Deshabilitar confirmación manual para Mercado Pago.
3. Implementar sincronización auditada.
4. Implementar cancelación de pagos no capturados.
5. Implementar reintegro total de pagos aprobados.
6. Bloquear acciones incompatibles durante estados inciertos.
7. Conciliar operaciones hechas fuera del sistema.

**Criterio de salida:** ningún administrador puede preparar un pedido no pagado ni duplicar un reintegro o movimiento de stock.

### Fase 6 — Integración con solicitudes y gestiones aceptadas

1. Reutilizar las entidades y el flujo ya implementados por
   `BOTON-ARREPENTIMIENTO-SDD.md`.
2. Permitir originar un reintegro total de Mercado Pago desde una solicitud
   aceptada cuando la matriz operativa lo habilite.
3. Vincular solicitud, reintegro, pedido y auditoría sin duplicar estados.
4. Conciliar el resultado financiero y reflejarlo en el timeline de la solicitud.

**Criterio de salida:** una solicitud aceptada puede originar y seguir un
reintegro de Mercado Pago sin perder la historia del pedido ni crear otro
expediente.

### Fase 7 — Pruebas, despliegue y monitoreo

1. Ejecutar pruebas unitarias, integración, migración, E2E, accesibilidad y seguridad.
2. Probar con usuarios de prueba comprador/vendedor y tarjetas oficiales de prueba.
3. Verificar Webhook, retorno aprobado, pendiente, rechazado y vencido.
4. Ejecutar pilotos en staging con túnel/URL HTTPS estable.
5. Desplegar migraciones compatibles antes del backend y frontend.
6. Habilitar la opción mediante feature flag/configuración.
7. Monitorear conciliaciones, Webhooks, reservas vencidas, reintegros y SLA.

**Criterio de salida:** checklist oficial de integración aprobado, observabilidad activa y procedimiento de rollback probado.

## 16. Estrategia de pruebas

### 16.1 Casos funcionales

- pago aprobado, pendiente, en proceso, rechazado y cancelado;
- vencimiento a los 40 minutos y contador desfasado en el navegador;
- `binary_mode = false` con estados aprobado, pendiente, en proceso y rechazado;
- reintento dentro y fuera de la reserva;
- retorno antes y después del Webhook;
- cierre del navegador durante el pago;
- preferencia creada con respuesta perdida;
- pedido pagado confirmado y preparado;
- cancelación antes del pago;
- reintegro de pago aprobado;
- reintegro con saldo insuficiente o timeout;
- reintegro confirmado externamente con fallo local y recuperación por conciliación;
- vencimiento y liberación de stock.

### 16.2 Concurrencia e idempotencia

- doble clic en confirmar;
- misma idempotency key con mismo y distinto payload;
- Webhook duplicado y fuera de orden;
- conciliación simultánea con Webhook;
- dos administradores cancelando/reintegrando;
- pago aprobado mientras vence la reserva;
- reintegro iniciado desde el panel de Mercado Pago y desde la aplicación.

### 16.3 Seguridad

- firma inexistente, inválida, antigua o manipulada;
- resource ID ajeno y `external_reference` alterada;
- importe, moneda, cuenta o ambiente incorrectos;
- replay de Webhook y de comandos administrativos;
- CSRF/origen en endpoints públicos y admin;
- acceso sin rol, sesión pública ajena y enumeración;
- bypass de RLS/grants;
- filtrado de secretos/PII en logs, errores y URLs;

### 16.4 Calidad

- `pnpm lint` y `pnpm build` sin errores ni warnings;
- pruebas backend y migraciones en Supabase local;
- responsive y accesibilidad AA;
- navegación por teclado y mensajes anunciados por lector de pantalla;
- documentación y contratos sincronizados.

## 17. Observabilidad y operación

Medir y alertar, sin PII:

- preferencias creadas/fallidas/inciertas;
- tasa y latencia de Webhooks;
- firmas inválidas;
- eventos con reintentos o en dead letter;
- diferencias de importe, moneda o referencia;
- reservas vencidas y pagos tardíos;
- reintegros pendientes/fallidos;
- discrepancias entre Mercado Pago y estado local;

Crear runbooks para credenciales inválidas, caída del proveedor, cola detenida, pago tardío, contracargo, reintegro fallido, Webhook comprometido y rotación de secretos.

## 18. Despliegue y rollback

1. Aplicar migraciones aditivas compatibles con la versión anterior.
2. Desplegar backend capaz de leer los estados nuevos sin habilitar Mercado Pago.
3. Configurar Webhook y validar firma en staging.
4. Desplegar frontend y admin detrás de una feature flag/configuración.
5. Habilitar primero a un porcentaje controlado o en horario supervisado.
6. No revertir migraciones destructivamente ante un incidente.
7. Para rollback, deshabilitar nuevos checkouts de Mercado Pago, mantener Webhook/conciliación activos y terminar los pagos/reintegros en curso.
8. No eliminar registros financieros ni reutilizar IDs.

## 19. Definición de terminado

La integración se considerará completa únicamente cuando:

- los documentos prioritarios estén actualizados y sin contradicciones;
- el flujo nunca confíe en el navegador para aprobar pagos;
- Webhook y conciliación converjan de forma idempotente;
- stock y reintegros no puedan duplicarse;
- los estados financiero y operativo estén separados;
- la reserva inicial dure 40 minutos y ningún pago `pending` o `in_process` pierda
  stock sin conciliación autoritativa;
- el administrador no pueda confirmar manualmente un pago de Mercado Pago;
- cancelaciones, pagos tardíos y reintegros fallidos tengan resolución definida;
- la integración reutilice solicitudes aceptadas sin duplicar el Botón de
  Arrepentimiento;
- no se almacenen datos de tarjeta ni secretos;
- las pruebas funcionales, de concurrencia, seguridad y accesibilidad sean satisfactorias;
- lint, build y suites de prueba finalicen sin errores ni warnings;
- métricas, alertas, runbooks y rollback estén operativos.

## 20. Documentación oficial consultada

### Mercado Pago

- [Descripción general de Checkout Pro](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/overview)
- [Crear preferencia de pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/create-payment-preference)
- [Agregar SDK de frontend](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/web-integration/add-frontend-sdk)
- [Configurar URLs de retorno](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/configure-back-urls)
- [Modo binario](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-settings/binary-mode)
- [Vigencia de la preferencia](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/additional-settings/term-of-preference)
- [Vencimiento de pagos offline](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-settings/expiration-date)
- [Notificaciones de pagos](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/payment-notifications)
- [Reembolsos y cancelaciones](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-settings/refunds-and-cancellations)
- [Prueba de integración](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test)
- [Realizar compras de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-purchases)
- [Credenciales](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/credentials)

### Supabase

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Cambios de seguridad y permisos de base de datos](https://supabase.com/changelog)

Las capacidades, parámetros, plazos y algoritmos criptográficos deberán volver a verificarse en estas fuentes oficiales al iniciar cada fase, porque pueden cambiar.
