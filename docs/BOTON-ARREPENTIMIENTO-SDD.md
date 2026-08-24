# Botón de Arrepentimiento — SDD y plan de implementación

> Estado: especificación técnica sincronizada con la documentación del proyecto;
> pendiente de revisión jurídica final antes de producción.
>
> Alcance geográfico: República Argentina.
>
> Fecha de revisión: 19 de agosto de 2026.

## 1. Objetivo

Incorporar un canal público, directo, accesible y auditable para que una persona
pueda solicitar la revocación de una compra realizada a distancia en Margarita
Arte & Deco, sin crear una cuenta ni depender de una Guest Session vigente.

La funcionalidad deberá:

- mostrar un enlace denominado exactamente `BOTÓN DE ARREPENTIMIENTO` a simple
  vista, en un lugar destacado y desde el primer acceso;
- registrar una solicitud aunque no pueda asociarse automáticamente a un pedido;
- emitir inmediatamente una constancia con código público;
- permitir una verificación de identidad posterior, razonable y exclusivamente
  orientada a seguridad;
- proporcionar al administrador una bandeja operativa con plazos, historial y
  acciones controladas;
- mantener separados la solicitud, el pedido, la devolución física, el pago y el
  stock;
- conservar evidencia auditable sin exponer datos personales;
- preparar una integración futura con reintegros de Mercado Pago sin depender de
  esa pasarela para funcionar.

Este documento define el contrato funcional y técnico de la mejora. No reemplaza
la revisión jurídica. Antes de crear migraciones o código, sus reglas aprobadas
deberán incorporarse a los documentos de mayor prioridad indicados en el apartado
2; hasta entonces, cualquier contradicción se resolverá a favor de esos documentos.

## 2. Prioridad documental y alcance post-MVP

La funcionalidad es posterior al MVP ya entregado. Antes de programar deberá
formalizarse en los documentos existentes, respetando este orden:

1. `BUSINESS-RULES.md`: derecho de solicitud, datos mínimos, verificación,
   tratamiento, devoluciones, excepciones, stock y pagos.
2. `DATABASE-SDD.md`: entidades, estados, restricciones, índices, RLS y RPC.
3. `BACKEND-SDD.md`: servicios, endpoints, antiabuso, auditoría y contratos.
4. `FRONTEND-SDD.md`: acceso destacado, formulario, constancia y consulta.
5. `ADMIN-SDD.md`: bandeja, detalle, plazos, acciones y resolución.
6. `CONTENT-STRATEGY.md`: textos públicos y administrativos.
7. `CONDICIONES-SDD.md` y páginas legales: condiciones, privacidad y canales de
   atención actualizados al funcionamiento real.
8. `DECISIONS.md`: decisiones transversales o difíciles de revertir.

No se iniciarán migraciones ni cambios de código hasta sincronizar y aprobar esos
documentos. Este SDD no recupera ni presupone el módulo de Postventa ni la
integración de Mercado Pago: ambos permanecen independientes.

Sincronización técnica completada el 19 de agosto de 2026:

- `BUSINESS-RULES.md`, `DATABASE-SDD.md`, `BACKEND-SDD.md`, `FRONTEND-SDD.md` y
  `ADMIN-SDD.md` incorporan el contrato obligatorio de sus respectivas capas;
- `CONTENT-STRATEGY.md`, `CONDICIONES-SDD.md` y `PRIVACIDAD-SDD.md` definen textos
  y actualizaciones que se publicarán junto con la funcionalidad;
- `DECISIONS.md`, `PROJECT-STRUCTURE.md` y `ROADMAP.md` registran arquitectura,
  rutas y secuencia de implementación;
- `DESIGN-SYSTEM.md` y `CONVENTIONS.md` no requieren cambios porque los tokens,
  componentes, accesibilidad y convenciones existentes cubren el alcance.

Permanece pendiente únicamente la revisión jurídica profesional de los textos y
del criterio definitivo de plazo antes de habilitar producción.

## 3. Base normativa relevada

La interpretación definitiva deberá validarse con asesoría jurídica argentina.
A la fecha de este documento, las fuentes oficiales indican:

- La Disposición 954/2025 exige a quienes comercializan bienes o servicios a
  distancia mediante sitios web o formatos similares un enlace denominado
  `BOTÓN DE ARREPENTIMIENTO`, visible, destacado y disponible desde el primer
  acceso.
- El uso del enlace no puede exigir registración previa ni trámites adicionales
  como condición para presentar la solicitud.
- Dentro de las 24 horas siguientes debe informarse, por el mismo medio, un
  código de identificación o registración y adoptarse las medidas necesarias
  para gestionar la petición.
- La Disposición 3/2026 permite mecanismos razonables y habituales destinados
  exclusivamente a verificar identidad y seguridad.
- El artículo 1110 del Código Civil y Comercial reconoce, con carácter general,
  el derecho irrenunciable a revocar contratos celebrados a distancia dentro de
  diez días desde la celebración. Si la aceptación es posterior a la entrega, el
  plazo comienza con la entrega; si vence en día inhábil, se prorroga al primer
  día hábil siguiente.
- Los artículos 1111 a 1115 regulan el deber de informar, la notificación por
  medios electrónicos, la restitución recíproca, la imposibilidad de devolución
  y la ausencia de gastos para el consumidor. Si el derecho no fue informado
  debidamente, no se considerará extinguido por el mero transcurso del plazo.
- Existen excepciones normativas y fácticas que requieren evaluación, incluidas
  las del artículo 1116, los productos utilizados o consumidos, ciertos productos
  perecederos y compras ajenas al destino final de consumo.

El sistema nunca determinará automáticamente que una categoría completa está
exceptuada ni calculará una denegación automática por plazo, uso o estado del
pedido. Una eventual denegación exigirá revisión y fundamento administrativo.

## 4. Situación actual

- El sitio está en producción y permite crear pedidos sin cuenta de cliente.
- El cliente se identifica mediante nombre, apellido y celular.
- Los pedidos conservan snapshots del cliente, productos, importes y entrega.
- La Guest Session permite consultar pedidos, pero no constituye una cuenta.
- La recuperación mediante número de pedido y celular ya incorpora respuestas
  indistinguibles, rate limiting persistente y CAPTCHA adaptativo.
- El Panel dispone de autenticación, auditoría y control de concurrencia.
- Los pagos son efectivo o transferencia y sus reintegros se gestionan
  manualmente.
- Cancelar un pedido no finalizado restaura stock exactamente una vez.
- Un pedido retirado o entregado no puede reabrirse ni convertirse en cancelado.
- No existe actualmente un canal específico ni una entidad para solicitudes de
  arrepentimiento.

## 5. Principios de diseño

1. **Registrar acredita la comunicación, no una aprobación comercial.** La
   constancia acredita la recepción y el ejercicio comunicado. La revisión
   posterior verifica identidad, plazo, alcance y excepciones; no autoriza
   discrecionalmente un derecho que produce efectos cuando corresponde legalmente.
2. **La presentación no depende de una cuenta.** No requiere login, Guest Session
   ni recuperación previa del pedido.
3. **La verificación no bloquea el registro.** La identidad puede verificarse
   razonablemente después de emitir la constancia.
4. **Una falta de coincidencia no descarta la petición.** La solicitud queda
   `verification_pending` para revisión manual.
5. **El navegador no modifica pedidos.** El formulario nunca cancela pedidos,
   reintegra pagos ni restaura stock directamente.
6. **Pedido y solicitud conservan su propia verdad histórica.** Una solicitud
   posterior a la entrega no reescribe el estado `picked_up` o `delivered`.
7. **El stock sigue al producto físico.** Después de una entrega, las unidades
   solo reingresan tras recibir y verificar el producto mediante un movimiento de
   inventario separado.
8. **Toda decisión queda auditada.** Estados, actores, motivos y comunicaciones
   se registran sin edición destructiva.
9. **No se automatizan excepciones legales.** El sistema asiste la revisión, pero
   no sustituye el criterio jurídico y operativo.
10. **Seguridad sin fricción desproporcionada.** Los controles antiabuso no deben
    convertir el ejercicio del derecho en un trámite imposible.
11. **La respuesta pública es mínima.** Un código público solo permite consultar
    estado, fechas y próximos pasos; nunca datos del pedido o del cliente.
12. **La implementación funciona sin Mercado Pago.** Los reintegros iniciales
    continúan siendo manuales y auditados.
13. **Los estados son ortogonales.** La aplicabilidad de la solicitud, la devolución
    física y el reintegro económico evolucionan por separado; una caída o demora
    del proveedor de pagos no altera el derecho determinado como aplicable.
14. **El importe nace de dinero efectivamente cobrado.** El Frontend nunca calcula
    el reintegro y el Backend no lo infiere del precio actual de los productos.
15. **Integraciones externas mediante operaciones recuperables.** Una futura
    llamada a Mercado Pago será idempotente, reintentable y conciliable por
    webhook/API; nunca formará parte de una transacción PostgreSQL abierta.

## 6. Decisiones operativas

Las siguientes decisiones quedan aprobadas como alcance funcional. Los textos
jurídicos y el cómputo definitivo de plazos deberán revisarse profesionalmente
antes de habilitar producción.

### 6.1 Política comercial y jurídica

- Todos los productos comercializados actualmente son estándar y quedan
  alcanzados por el flujo. Margarita Arte & Deco todavía no vende productos
  personalizados.
- Si en el futuro se incorporan productos personalizados o confeccionados según
  especificaciones del cliente, la excepción se evaluará por artículo y pedido.
  Una categoría, el carácter artesanal o la fabricación posterior a la compra no
  producirán un rechazo automático.
- Toda presentación válida se registrará y recibirá constancia, incluso cuando
  aparente estar fuera del plazo. El sistema la marcará como `Requiere revisión
  de plazo`; nunca la rechazará automáticamente.
- La inspección verificará identidad, integridad, componentes, uso o consumo
  efectivo y daños atribuibles al cliente. No se exigirá ausencia absoluta de
  toda marca ni packaging perfecto como regla automática.
- Los textos de Términos y Condiciones, Política de Privacidad, formulario,
  constancia y comunicaciones se aprobarán mediante revisión jurídica final.

### 6.2 Devolución física, pago y stock

- Un pedido retirado se devolverá en el mismo local, dentro de la dirección y
  horarios públicos obtenidos desde Settings.
- En pedidos enviados, la devolución se coordinará hacia el local. Cuando
  corresponda el derecho legal, se priorizará retiro o etiqueta prepagada. Solo
  si la persona lo elige de forma realmente voluntaria podrá adelantar el costo
  razonable de un medio acordado, con reintegro inmediato; ese costo no se
  trasladará al consumidor.
- Sin integración logística inicial, el propietario acordará previamente el
  transportista y el importe. El cliente conservará el comprobante y el negocio
  reintegrará ese costo junto con el reintegro de los productos.
- El propietario coordinará la devolución desde el sistema. WhatsApp podrá
  utilizarse manualmente después de registrar la solicitud, cualquiera sea su
  origen, sin reemplazar el formulario ni modificar estados automáticamente.
- La inspección se completará el día de recepción o, como objetivo máximo
  interno, dentro de los dos días hábiles siguientes.
- La restitución de prestaciones se coordinará sin demoras injustificadas. La
  secuencia exacta entre devolución física y reintegro deberá respetar la
  simultaneidad prevista por el artículo 1113 y el procedimiento jurídico
  aprobado; la inspección no podrá utilizarse para imponer una espera arbitraria.
- Efectivo y transferencia continuarán con reintegro manual documentado mediante
  fecha, importe, medio, referencia no sensible y observación.
- Una compra pagada por transferencia se reintegrará mediante transferencia. Una
  compra en efectivo retirada en el local podrá reintegrarse allí en efectivo si
  el cliente está de acuerdo; si existió envío, se acordará una transferencia.
- El sistema no almacenará CBU, alias ni otros datos bancarios completos. Solo
  conservará importes, medio, fecha, referencia no sensible y actor.
- El alcance inicial será la revocación completa de un pedido. Una devolución
  parcial podrá existir técnicamente en Mercado Pago, pero no se habilitará como
  regla de este flujo sin una decisión comercial y jurídica posterior.
- Al finalizar la inspección, cada unidad se clasificará como apta o no apta para
  reventa. Solo las unidades aptas incrementarán el stock disponible y lo harán
  exactamente una vez mediante una operación auditada.

### 6.3 Operación y niveles de servicio

- El propietario será el único responsable administrativo en la primera etapa.
- El sistema generará la constancia y su código automáticamente en la misma
  transacción que registra la solicitud, y notificará inmediatamente al
  propietario mediante un contador en la navegación, una alerta persistente en
  el Dashboard y prioridad visible en la bandeja.
- No se define reemplazo inicial por tratarse de un emprendimiento unipersonal.
  El propietario deberá revisar el Panel al menos una vez por día. Las solicitudes
  de contingencia conservarán `acknowledgement_due_at` y alertas escalonadas antes
  de las 24 horas; la revisión diaria no sustituye ese plazo obligatorio.
- WhatsApp será el canal alternativo de presentación únicamente cuando el
  formulario no funcione. No reemplazará el formulario público principal.
- Si una solicitud llega por WhatsApp durante una contingencia, el propietario
  la registrará desde Administración, el sistema generará el código y este se
  comunicará al cliente por el mismo canal dentro del plazo aplicable.
- Si el pedido no puede identificarse o el teléfono no coincide, la solicitud
  permanecerá válida en `verification_pending`; el propietario intentará
  identificarla después sin revelar públicamente qué dato falló.
- Cuando la persona indique que no encuentra el número de pedido, el sistema no
  intentará elegir uno automáticamente. Administración podrá obtener candidatos
  internos por coincidencia exacta del celular normalizado y el propietario
  confirmará por WhatsApp cuál es la compra antes de vincularla.
- Si existen varios candidatos, ninguno quedará preseleccionado. El propietario
  corroborará con la persona datos razonables como fecha aproximada, productos,
  modalidad de entrega o medio de pago, sin exigir que repita toda la compra.
- La vinculación manual asociará la solicitud con un único pedido, registrará
  actor, fecha y nota breve de verificación, y no cancelará el pedido ni
  modificará pago o stock.
- La coordinación posterior podrá continuar manualmente por WhatsApp para toda
  solicitud ya registrada. Se conservarán en el timeline únicamente los hitos y
  referencias no sensibles; no se afirmará que el mensaje fue enviado o leído.
- En la primera versión no habrá eliminación ni anonimización automática de
  solicitudes, liquidaciones o eventos. Una política de retención validada
  jurídicamente será requisito previo para incorporar cualquier purga futura.

### 6.4 Controles públicos

- El formulario solicitará el número de pedido para facilitar la identificación,
  pero ofrecerá junto al campo la opción visible `No encuentro mi número de
  pedido`. La validación exigirá una de las dos alternativas y nunca bloqueará la
  presentación por no recordar el número.
- El celular será obligatorio y el comentario opcional. No se solicitarán motivo,
  fotografías, cuenta, inicio de sesión ni selección pública de pedidos.
- Toda presentación sintácticamente válida generará una constancia aunque el
  pedido no exista, el teléfono no coincida o el plazo aparente requiera revisión.
- Se reutilizarán rate limiting persistente y CAPTCHA adaptativo. Si Turnstile no
  está disponible, el Backend conservará límites estrictos y permitirá registrar
  la solicitud en lugar de convertir la indisponibilidad en una barrera general.
- Mostrar WhatsApp como canal alternativo de contingencia si una persona no
  puede utilizar el formulario o este se encuentra indisponible.

## 7. Alcance funcional inicial

### Incluido

- acceso público destacado en todas las rutas públicas;
- formulario público sin autenticación;
- asociación automática opcional con un pedido;
- constancia inmediata con código público de alta entropía;
- consulta pública mínima mediante ese código;
- bandeja administrativa con búsqueda, filtros y alertas de plazo;
- detalle con timeline inmutable;
- verificación, vinculación, determinación fundamentada de aplicabilidad o no
  aplicabilidad y cierre;
- registro administrativo de contingencias recibidas por WhatsApp;
- coordinación manual posterior mediante el compositor de WhatsApp existente;
- integración con cancelación e inventario existentes cuando corresponda;
- registro estructurado del reintegro manual y del costo de devolución;
- actualización de textos legales, privacidad, metadata y navegación;
- métricas, auditoría y runbook operativo.

### Fuera del primer incremento

- reintegros automáticos por Mercado Pago;
- WhatsApp Business API, email transaccional o notificaciones externas
  automáticas;
- generación de etiquetas logísticas o retiro automatizado;
- firma electrónica o carga documental compleja;
- decisiones automáticas sobre excepciones legales;
- arrepentimientos parciales de un pedido;
- devolución automática de stock de productos ya entregados.

## 8. Modelo funcional

### 8.1 Estados ortogonales

`request_status` representa únicamente el expediente jurídico y administrativo:

- `received`: solicitud registrada y constancia emitida;
- `verification_pending`: requiere corroboración razonable;
- `under_review`: identidad suficiente y caso en evaluación;
- `applicable`: se determinó que la revocación resulta aplicable y se definieron
  las obligaciones posteriores;
- `not_applicable`: se determinó una excepción o improcedencia con fundamento
  legal/fáctico, explicación pública y canal de revisión;
- `closed`: expediente finalizado sin obligaciones pendientes.

`return_status` representa la devolución física:

- `not_required`;
- `pending`;
- `received`;
- `inspected`.

`refund_status` representa la restitución económica:

- `not_required`;
- `pending`;
- `processing`;
- `succeeded`;
- `failed`;
- `manual_review`.

Esta separación evita estados combinatorios y permite que un reintegro futuro de
Mercado Pago continúe procesándose sin alterar la decisión `applicable`.
`not_applicable`
y `closed` son terminales. Corregir una decisión terminal exigirá una acción
administrativa compensatoria y auditada; nunca se editará el historial anterior.

### 8.2 Transiciones mínimas

| `request_status` actual | Acción | Estado siguiente |
|---|---|---|
| `received` | Requiere corroboración | `verification_pending` |
| `received` | Iniciar revisión | `under_review` |
| `verification_pending` | Verificación suficiente | `under_review` |
| `under_review` | Determinar aplicabilidad | `applicable` |
| `under_review` | Determinar no aplicabilidad con fundamento | `not_applicable` |
| `applicable` | Cerrar con obligaciones satisfechas | `closed` |

Determinar aplicabilidad inicializará `return_status` y `refund_status` según el estado real del
pedido y del cobro. El cierre solo será válido cuando la cancelación necesaria se
haya completado, la devolución esté en `not_required` o `inspected`, y el
reintegro esté en `not_required` o `succeeded`. La matriz real será calculada por
el Backend. El Frontend nunca inventará acciones.

### 8.3 Relación con el pedido

- `order_id` será opcional.
- La vinculación automática exigirá coincidencia completa del número normalizado
  y el celular del snapshot histórico.
- Si el número fue omitido mediante la alternativa explícita del formulario, la
  solicitud iniciará en `verification_pending` aunque el celular coincida con un
  solo pedido. El Backend nunca seleccionará el pedido más reciente ni cualquier
  otro candidato por defecto.
- La búsqueda de candidatos existirá solo en Administración. Primero devolverá
  pedidos con coincidencia exacta del celular normalizado y permitirá continuar
  con la búsqueda administrativa existente si no hay resultados.
- Los candidatos se mostrarán exclusivamente al propietario autenticado. La API
  pública nunca devolverá listas, cantidades ni indicios sobre pedidos asociados
  a un celular.
- Cada solicitud podrá vincularse con un único pedido. Si una persona desea
  arrepentirse de dos pedidos, se registrarán y gestionarán dos solicitudes.
- Una solicitud no vinculada seguirá siendo válida y visible en Administración.
- Vincular o desvincular un pedido será una acción auditada y protegida contra
  concurrencia. Una corrección posterior exigirá fundamento y conservará el
  vínculo anterior en el timeline.
- Un pedido podrá tener más de una solicitud; la interfaz destacará posibles
  duplicados sin fusionarlos ni eliminarlos automáticamente.

### 8.4 Evaluación de plazo

- La fecha de presentación será siempre la hora del servidor en UTC; el Panel la
  mostrará en `America/Argentina/Buenos_Aires`.
- La estimación operativa utilizará diez días corridos y, cuando exista entrega o
  retiro, tomará la fecha más favorable al consumidor entre celebración y entrega.
- Si el vencimiento estimado cae en día inhábil, el caso quedará
  `review_required` hasta aplicar el calendario aprobado. No se incorporará una
  dependencia externa de feriados en el primer incremento.
- Si no existe evidencia de que el derecho fue informado debidamente, se usará
  `right_not_properly_informed` y no se calculará vencimiento terminal.
- La estimación ayuda a priorizar; nunca impedirá registrar, emitir constancia ni
  iniciar revisión. El criterio definitivo se validará jurídicamente antes de
  producción.

## 9. Persistencia propuesta

### 9.1 `consumer_withdrawal_requests`

Responsabilidad: representar la solicitud y su estado vigente.

Campos mínimos:

- `id` UUID;
- `public_code_hash` de 32 bytes, único;
- `public_code_suffix` solo para identificación administrativa;
- `public_code_key_version` para rotación controlada del secreto de derivación;
- `order_id` nullable con `ON DELETE RESTRICT`;
- `order_reference_input` normalizada y nullable;
- `order_reference_unavailable` boolean, para conservar la elección explícita de
  la persona sin inferirla a partir de un valor vacío;
- `contact_phone_normalized` como dato mínimo de contacto;
- `contact_fingerprint` HMAC para deduplicación y antiabuso;
- `request_status`;
- `return_status`;
- `refund_status`;
- `version` bigint positivo para concurrencia optimista;
- `customer_comment` nullable y acotado;
- `resolution_reason` nullable;
- `source`, enum `web` o `admin_whatsapp_contingency`;
- `submitted_at`;
- `acknowledgement_issued_at`;
- `owner_notified_at` nullable;
- `legal_time_status`, enum `unknown`, `apparently_in_time` o `review_required`;
- snapshots nullable `contract_concluded_at`, `right_informed_at` y
  `right_notice_version`, obtenidos del pedido o determinados manualmente;
- `legal_time_basis`, nullable y explícita (`contract_concluded_at`,
  `picked_up_at`, `delivered_at`, `right_not_properly_informed` o `manual_review`);
- `legal_deadline_at` nullable, solo como ayuda operativa y nunca como rechazo
  automático;
- `deadline_reviewed_at` nullable;
- `return_received_at`, `inspection_due_at` e `inspected_at` nullable;
- `first_review_due_at`;
- `first_reviewed_at` nullable;
- `applicable_at`, `not_applicable_at` y `closed_at` nullable;
- `created_at` y `updated_at`.

El código original se entregará una sola vez y nunca se almacenará en texto
plano. Para consultar, el Backend aplicará el mismo hash y comparará la huella.
Para que un reintento idempotente pueda devolver la misma constancia sin guardar
el código, el Backend lo derivará con HMAC-SHA-256 a partir de una clave de
idempotencia aleatoria, el fingerprint canónico del payload, un secreto versionado
y separación de dominio; expondrá al menos 128 bits de esa salida. La tabla de
idempotencia almacenará solo hashes, fingerprint, `withdrawal_request_id`, versión
de clave y vencimiento. Reutilizar la key con otro payload será un conflicto.

Las mutaciones administrativas usarán una tabla de idempotencia separada. La
acción, su fingerprint y el resultado se resolverán dentro de la misma
transacción que modifica el expediente, para que un replay no duplique versiones,
eventos, cancelaciones, stock ni liquidaciones.

### 9.2 `consumer_withdrawal_events`

Responsabilidad: timeline append-only.

Campos mínimos:

- `id` UUID;
- `withdrawal_request_id`;
- `actor_profile_id` nullable para eventos de sistema o cliente;
- `event_type`;
- `previous_status` y `next_status` nullable;
- `reason` o nota operativa nullable;
- `metadata` JSONB saneada y sin duplicación de datos personales;
- `created_at`.

No admitirá `UPDATE` ni `DELETE`. Eventos mínimos:

- `withdrawal_submitted`;
- `acknowledgement_issued`;
- `owner_notified`;
- `deadline_review_required` y `deadline_review_completed`;
- `contingency_request_registered` cuando el origen sea WhatsApp;
- `order_linked`;
- `order_link_corrected` cuando un vínculo deba reemplazarse con fundamento;
- `verification_requested`;
- `verification_completed`;
- `review_started`;
- `withdrawal_determined_applicable`;
- `withdrawal_determined_not_applicable`;
- `return_coordinated`;
- `return_received`;
- `return_inspected`;
- `refund_requested`;
- `refund_processing`;
- `refund_failed`;
- `refund_manual_review_required`;
- `refund_confirmed_manual`;
- `return_shipping_reimbursed`;
- `stock_reentered`;
- `withdrawal_closed`.

### 9.3 `consumer_withdrawal_settlements`

Responsabilidad: registrar de manera estructurada la liquidación económica de
una solicitud aplicable, separada de los eventos narrativos y del pago histórico
del pedido.

Campos mínimos:

- `id` UUID;
- `withdrawal_request_id` único en el primer incremento;
- `order_id` con `ON DELETE RESTRICT`;
- `currency`, inicialmente y obligatoriamente `ARS`;
- `order_total_snapshot` y `captured_amount_snapshot`, obtenidos por el Backend
  desde el pedido y sus registros de cobro, nunca desde el formulario;
- `contract_refund_amount` mayor o igual a cero, incluyendo todos los conceptos
  contractuales efectivamente cobrados;
- `original_shipping_refund_amount` mayor o igual a cero;
- `return_shipping_refund_amount` mayor o igual a cero;
- `total_refund_amount`, igual a la suma de los conceptos anteriores;
- `method`, inicialmente `cash` o `bank_transfer`; `payment_provider` queda
  reservado para una integración posterior;
- `status`, `pending` o `completed`;
- `reference` nullable, acotada y sin datos bancarios completos;
- `notes` nullable y saneada;
- `completed_by_profile_id` y `completed_at` nullable;
- `created_at` y `updated_at`.

El primer incremento admite una única liquidación completa por solicitud. La
tabla representa la obligación comercial y no el intento técnico de un proveedor.
El total nunca podrá superar el importe efectivamente capturado más los gastos
reintegrables documentados.

### 9.4 Contrato de extensión para proveedores de pago

Cuando se incorpore Mercado Pago, el módulo de pagos agregará operaciones de
reintegro técnicas con relación nullable a esta liquidación. Cada operación
conservará como mínimo:

- proveedor (`mercado_pago`), identificador interno y `payment_id` externo;
- importe y moneda;
- `idempotency_key` propia, estable por operación y no reutilizada con otro
  payload;
- estado `pending`, `processing`, `succeeded`, `failed` o `manual_review`;
- identificador y estado externo, cantidad de intentos, último error saneado y
  marcas temporales;
- payload mínimo de conciliación, sin credenciales ni datos completos del pagador.

La operación externa se ejecutará fuera de la transacción PostgreSQL mediante un
job/outbox recuperable. Los webhooks solo despertarán la conciliación: el Backend
validará su autenticidad y consultará el recurso a la API de Mercado Pago antes de
cambiar estados. Un timeout se tratará como resultado desconocido y se conciliará
antes de reintentar. La falta de saldo, el límite operativo del proveedor o el
vencimiento de su ventana de reembolso no alterarán una solicitud determinada
como aplicable; el caso pasará a `manual_review` para completar la restitución por un
medio permitido.

### 9.5 Antiabuso

Reutilizar el diseño probado de recuperación de pedidos sin mezclar sus datos.
Se propone una tabla específica `consumer_withdrawal_limits` con huellas HMAC por
IP y contacto, ventanas, conteos y bloqueos temporales. Los umbrales serán
configurables y sus registros tendrán retención corta.

### 9.6 Restricciones e índices

- `public_code_hash` y `contact_fingerprint` con longitud exacta de 32 bytes;
- claves de idempotencia hasheadas, fingerprint canónico y expiración con purga
  independiente; nunca se almacenará la clave original;
- constraint XOR entre identificación y alternativa: debe existir
  `order_reference_input` con `order_reference_unavailable = false`, o no existir
  referencia con `order_reference_unavailable = true`, nunca ambas opciones ni
  ninguna;
- `acknowledgement_issued_at` no anterior a `submitted_at`;
- fechas terminales coherentes con su estado;
- liquidaciones con importes no negativos, suma consistente y una única
  finalización efectiva;
- `request_status`, `return_status` y `refund_status` coherentes mediante checks
  y guards de RPC, sin intentar codificar toda la máquina en un único enum;
- comentario y fundamentos con límites estrictos;
- índice por estado y `submitted_at`;
- índice parcial por `first_review_due_at` para solicitudes abiertas;
- índice parcial por `legal_time_status = 'review_required'` para casos sin
  revisión de plazo;
- índice por `order_id` cuando no sea NULL;
- índice por `contact_fingerprint` para detectar duplicados;
- RLS habilitado y sin políticas para `anon` o `authenticated`;
- privilegios directos revocados y acceso solo desde el Backend;
- tablas de solicitudes, liquidaciones y eventos sin eliminación desde el Panel.

Las tablas nuevas necesitan acceso desde el Backend mediante `service_role`, pero
no exposición a `anon` ni `authenticated`. La migración incluirá grants y revokes
explícitos, RLS como defensa en profundidad y verificación con Security Advisor;
no dependerá de los valores predeterminados de exposición de Supabase.

## 10. Operaciones atómicas

Crear RPC invocadas únicamente por repositories del Backend:

- `create_consumer_withdrawal`: recibe del Backend el hash y sufijo de un código
  derivado de una clave de idempotencia generada con CSPRNG, registra la solicitud, vincula el pedido cuando exista
  coincidencia completa, genera los eventos iniciales y persiste la constancia en
  una sola transacción; el código original nunca ingresa en la base;
- `transition_consumer_withdrawal`: bloquea la fila, valida `version`, verifica
  la transición, registra actor/fundamento y agrega el evento;
- `link_consumer_withdrawal_order`: vincula un único pedido de forma controlada,
  exige `expectedVersion`, actor y nota de verificación, y no modifica el
  pedido, su pago ni su stock;
- `record_consumer_withdrawal_settlement`: bloquea solicitud y liquidación,
  verifica importes, impide una segunda finalización y agrega los eventos de
  reintegro correspondientes;
- `correct_consumer_withdrawal_settlement`: permite corregir un gasto adicional
  mal cargado después de completar el reintegro, valida el total confirmado y
  agrega una corrección y un evento append-only con los valores anterior y nuevo;
- `purge_consumer_withdrawal_security_data`: elimina únicamente límites
  antiabuso vencidos, nunca solicitudes, liquidaciones ni eventos.

Las RPC serán `SECURITY INVOKER` por defecto y recibirán acceso explícito solo para
`service_role`; `EXECUTE` se revocará a `PUBLIC`, `anon` y `authenticated`. No se
utilizará `SECURITY DEFINER` para resolver errores de permisos. Si una necesidad
excepcional lo justificara, deberá documentarse y auditarse antes de modificar
este contrato, con `search_path` vacío, nombres calificados y validación interna.

La determinación de aplicabilidad sobre un pedido todavía no entregado invocará
la cancelación existente dentro de la misma transacción y restaurará stock una
sola vez. Un reintegro manual se confirmará en una RPC local; un
reintegro externo se solicitará mediante outbox y se conciliará de forma
asíncrona. Ninguna llamada de red ocurrirá dentro de una RPC o transacción abierta.

`transition_consumer_withdrawal` no bloqueará ni actualizará directamente la
tabla `orders` como `service_role`. La RPC de cancelación existente conservará el
bloqueo de fila, la validación de concurrencia y la reposición de stock con sus
privilegios acotados. No se ampliarán permisos directos sobre pedidos para
resolver esta coordinación.

## 11. Backend

### 11.1 Capas

- `ConsumerWithdrawalController`;
- `ConsumerWithdrawalService`;
- `AdminConsumerWithdrawalService`;
- `ConsumerWithdrawalRepository`;
- schemas Zod públicos y administrativos;
- tipos y mapeadores de DTO;
- reutilización de normalización telefónica, HMAC, CSRF, origen, rate limiting,
  Turnstile, auditoría y errores existentes.

### 11.2 Registro público

`POST /api/public/consumer-withdrawals`

Entrada propuesta:

```json
{
  "orderNumber": "MAD-AAAAMMDD-000001",
  "orderNumberUnavailable": false,
  "phone": "3511234567",
  "comment": "Comentario opcional",
  "captchaToken": "solo cuando fue solicitado"
}
```

`phone` será obligatorio y se normalizará en el Backend. `comment` será opcional.
El schema exigirá exactamente una de estas alternativas: `orderNumber` completo,
o `orderNumberUnavailable: true` sin número. Ni el cliente ni el Frontend enviarán
`orderId`, estado, motivo obligatorio, fotografías, candidatos o decisiones
legales.

Respuesta `201`:

```json
{
  "requestCode": "AR-7K9M-Q4TX-V8NP-2C6R",
  "submittedAt": "ISO-8601",
  "status": "received",
  "message": "Recibimos tu solicitud.",
  "nextStep": "Guardá este código para consultar el estado."
}
```

El código tendrá al menos 128 bits de entropía efectiva, será legible por grupos y
usará un alfabeto que evite caracteres ambiguos. No será secuencial ni derivado
del UUID, pedido, teléfono o fecha. La misma entrada e idempotency key devolverá
la misma constancia mientras la
operación sea recuperable. Una key reutilizada con payload distinto será
rechazada.

El endpoint:

- no exige sesión ni cookie de pedido;
- conserva CSRF, `Origin`, tamaño máximo, JSON estricto e idempotencia;
- genera la constancia aunque no encuentre una coincidencia;
- inicia en `verification_pending` cuando la persona no informa el número, sin
  buscar ni elegir automáticamente un pedido por el solo celular;
- marca para revisión manual los casos aparentemente fuera de plazo sin
  rechazarlos;
- nunca revela si existe el pedido o coincide el celular;
- utiliza `Cache-Control: no-store` y `Referrer-Policy: no-referrer`;
- no registra pedido, teléfono, comentario ni código en logs.

### 11.3 Consulta pública

`POST /api/public/consumer-withdrawals/status`

El código se enviará en el body para evitar URLs, historial, analytics y
referrers. La respuesta contendrá únicamente:

- estado público;
- fecha de presentación;
- fecha de última actualización;
- explicación breve y próximo paso.

Los estados públicos serán una proyección estable (`received`, `under_review`,
`applicable`, `action_required`, `not_applicable`, `closed`) con etiquetas en
español. `not_applicable` incluirá una explicación pública comprensible y un
canal de revisión o reclamo, sin exponer fallos internos del proveedor de pagos,
verificaciones de seguridad ni notas administrativas.

No devolverá pedido, cliente, teléfono, productos, importe, fundamento interno,
actor ni notas. Un código inválido producirá una respuesta genérica y rate
limited, sin reintentos automáticos.

La consulta será puntual y completamente independiente de las Guest Sessions de
pedidos:

- no creará una cuenta ni una sesión de arrepentimiento;
- no emitirá, renovará, rotará ni extenderá cookies o credenciales anónimas;
- no leerá ni utilizará una Guest Session de pedidos, aunque el navegador envíe
  su cookie técnica existente;
- la respuesta no incluirá `Set-Cookie` y utilizará `Cache-Control: no-store`;
- al recargar, cerrar o volver a la ruta, la persona deberá ingresar nuevamente
  el código;
- el Frontend conservará el resultado solo en memoria durante la vista actual y
  no persistirá el código ni la respuesta.

### 11.4 Administración

- `GET /api/admin/consumer-withdrawals`;
- `GET /api/admin/consumer-withdrawals/:requestId`;
- `GET /api/admin/consumer-withdrawals/:requestId/order-candidates` para obtener
  candidatos por coincidencia exacta del celular normalizado, solo cuando todavía
  no exista un pedido vinculado;
- `POST /api/admin/consumer-withdrawals/contingency` para registrar una petición
  recibida por WhatsApp cuando el formulario esté indisponible;
- `POST /api/admin/consumer-withdrawals/:requestId/actions`;
- `POST /api/admin/consumer-withdrawals/:requestId/order-link` si la vinculación
  manual resulta necesaria.

Las mutaciones exigirán autenticación, rol, `Origin`, CSRF, schema Zod,
`expectedVersion` e idempotencia. El Backend devolverá `availableActions` y no
aceptará saltos de estado.

El endpoint de candidatos será exclusivamente administrativo, paginado y con
`Cache-Control: no-store`. Devolverá solo lo necesario para identificar la compra:
ID interno, número, fecha, estado, productos resumidos, total, entrega y medio de
pago. Nunca se llamará desde el formulario público, no preseleccionará resultados
y no se incluirán candidatos ni criterios de búsqueda en logs o analytics.

La vinculación manual exigirá `orderId`, `expectedVersion` y una nota breve de
verificación. El Backend comprobará que la solicitud siga abierta, que el pedido
exista y que no haya otro vínculo vigente. Su respuesta actualizará únicamente la
solicitud y el timeline; la cancelación, devolución, el reintegro y el stock
continuarán como acciones posteriores independientes.

El alta administrativa de contingencia exigirá indicar la fecha y hora real de
recepción, el teléfono, el número de pedido si fue informado y una nota mínima.
El control usará exclusivamente el horario de Argentina
(`America/Argentina/Buenos_Aires`) y el Backend recibirá el instante ISO equivalente.
Generará la misma constancia que el canal web y auditará al propietario como
actor. No será una orden de cancelación: primero creará una solicitud y luego se
aplicará la matriz de pedido, devolución, pago y stock.

### 11.5 Turnstile y rate limiting

Generalizar `TurnstileService` para admitir acciones permitidas explícitas, como
`order_recovery` y `consumer_withdrawal`, sin aceptar nombres arbitrarios.

El CAPTCHA será adaptativo, no inicial. Si Turnstile está indisponible, el Backend
aplicará rate limiting persistente más estricto, registrará la incidencia y
permitirá la presentación válida. Nunca se perderá una solicitud ni se comunicará
un falso rechazo por una caída del proveedor.

## 12. Experiencia pública

### 12.1 Descubrimiento

El `PublicLayout` mostrará un acceso con el texto exacto
`BOTÓN DE ARREPENTIMIENTO` en una franja de utilidad compacta inmediatamente
debajo del Header, visible sin abrir menús y en todos los breakpoints. También se
mantendrá un enlace en el Footer dentro de Información.

La franja:

- utilizará los tokens existentes de superficie crema, texto verde oscuro y
  foco oficial;
- tendrá un área interactiva mínima de 44 px;
- no será flotante ni ocultará contenido;
- no utilizará animaciones decorativas;
- permanecerá disponible en Landing, catálogo, legales, checkout y pedidos.

### 12.2 Ruta `/arrepentimiento`

Será pública, lazy-loaded y `noindex, nofollow`. Tendrá un único `h1`:
`Solicitá el arrepentimiento de una compra`.

Contenido recomendado:

- explicación breve de qué permite el canal;
- aclaración de que la constancia acredita recepción y que la revisión posterior
  verifica identidad, alcance y excepciones sin constituir autorización discrecional;
- datos mínimos y motivos por los que se solicitan;
- formulario React Hook Form + Zod;
- acceso secundario a consultar una solicitud existente;
- canal alternativo de atención aprobado;
- enlaces a Términos y Privacidad.

Campos:

- `Número de pedido` con ayuda `Si lo tenés, nos ayuda a encontrar tu compra más
  rápido`;
- opción `No encuentro mi número de pedido`, asociada al campo. Al marcarla se
  limpiará y deshabilitará el número, y el formulario podrá enviarse sin él;
- `Celular utilizado en la compra`, obligatorio;
- `Comentario` opcional, aclarando que no es necesario justificar la solicitud;
- Turnstile solo cuando el Backend lo solicite.

No se mostrarán pedidos asociados al dispositivo o al celular, aunque exista una
sesión anónima vigente. Tampoco se solicitarán motivo, fotografías, cuenta ni
inicio de sesión. Los detalles o evidencias que resulten necesarios se coordinarán
únicamente después de emitir la constancia.

Acción principal: `Enviar solicitud`.

### 12.3 Constancia

Después de un `201`, la misma ruta reemplazará el formulario por una confirmación
perceptible y enfocará su encabezado:

- título `Recibimos tu solicitud`;
- código completo, por ejemplo `AR-7K9M-Q4TX-V8NP-2C6R`, en una superficie legible;
- acción `Copiar código`;
- fecha y hora local de presentación;
- explicación `Guardá este código para consultar el estado de tu solicitud.`;
- si no se informó el número: `Nos comunicaremos por WhatsApp para identificar la
  compra que querés cancelar o devolver.`;
- aclaración permanente: `La constancia acredita que recibimos tu solicitud.
  Verificaremos identidad, alcance y próximos pasos para coordinar las restituciones.`;
- acción `Consultar estado`;
- acción secundaria `Volver a la tienda`.

El código no se guardará en `localStorage`, query strings, analytics ni logs.
La confirmación será idéntica respecto de la existencia o coincidencia del pedido;
solo variará el mensaje ya conocido por la persona cuando ella misma haya marcado
que no encuentra el número.

### 12.4 Consulta

La ruta `/arrepentimiento/consulta` utilizará un formulario para ingresar el
código en el body de una petición Axios. Contemplará loading, error genérico,
rate limit, CAPTCHA adaptativo y resultado mínimo. Nunca confirmará la existencia
de un pedido.

El resultado mostrará solamente estado público, fecha de presentación, última
actualización y próximo paso. Para `verification_pending` utilizará, por ejemplo:
`Estamos identificando tu pedido` y `Tu solicitud fue registrada correctamente.
Nos comunicaremos con vos si necesitamos confirmar información.` No mostrará
productos, importes, datos del cliente ni resultados de búsquedas administrativas.

`Consultar estado` no iniciará sesión. La pantalla no ofrecerá recordar el código
y, después de recargar o abandonar la ruta, exigirá ingresarlo nuevamente.

### 12.5 Diseño y accesibilidad

- reutilizar `PublicLayout`, `Container`, `Section`, `Typography`, `Input`,
  `TextArea`, `Button`, `FieldMessage` y Turnstile;
- no reutilizar la composición de lectura extensa de páginas legales como si el
  formulario fuera un documento;
- limitar el ancho del formulario a una lectura cómoda y mantener el próximo
  paso junto a la acción;
- estados anunciados con `role=status` o `role=alert` según corresponda;
- labels visibles, ayudas asociadas y errores por campo;
- agrupar número y alternativa mediante semántica de formulario accesible; el
  error indicará `Ingresá el número de pedido o marcá que no lo encontrás`;
- navegación completa por teclado y foco programático tras éxito;
- contraste AA y controles de al menos 44 × 44 px;
- funcionamiento sin desbordamiento desde 360 px;
- respetar `prefers-reduced-motion`.

La aplicación de `impeccable` conserva el Design System y evita introducir una
estética legal fría o ajena a la marca: el texto será cercano, claro y preciso,
sin decoración que compita con la acción.

## 13. Panel administrativo

### 13.1 Navegación y dashboard

Agregar `Arrepentimientos` como módulo propio del AdminLayout, ubicado después de
`Pedidos`. Si en el futuro existe otro módulo de atención posterior a la venta,
ambos conservarán navegación, persistencia y responsabilidades independientes. Su
acceso mostrará un contador de solicitudes nuevas. El Dashboard incluirá una
alerta persistente con solicitudes sin revisar y vencimientos próximos dentro de
la superficie de actividad, sin crear una métrica decorativa aislada.

### 13.2 Listado

Ruta: `/admin/arrepentimientos`.

Filtros en URL:

- búsqueda por código visible o número de pedido;
- estado;
- vinculación: todos, vinculados o sin identificar;
- cumplimiento: en plazo o requiere atención;
- orden: más urgentes, más recientes o más antiguos;
- página y tamaño.

Desktop utilizará tabla semántica. Por debajo de 1024 px cada fila se convertirá
en ficha etiquetada, sin scroll horizontal. Columnas/datos:

- sufijo/código administrativo;
- fecha de presentación;
- estado;
- pedido vinculado o `Sin identificar`;
- tiempo hasta primera revisión;
- última actualización.

### 13.3 Detalle

Ruta: `/admin/arrepentimientos/:requestId`.

Mostrar:

- estado y plazo destacado;
- indicador `Requiere revisión de plazo` cuando corresponda, sin rechazo
  automático;
- pedido vinculado con acceso al detalle;
- teléfono solo cuando sea necesario para operar;
- si no existe vínculo, un bloque `Identificar pedido` con candidatos obtenidos
  por coincidencia exacta del celular, seguido por la búsqueda administrativa
  manual cuando no haya resultados;
- comentario original sin renderizar HTML;
- evaluación y fundamento;
- devolución, liquidación económica y stock como bloques separados;
- desglose de importe de productos, costo de devolución y total reintegrado;
- timeline inmutable;
- compositor manual de WhatsApp para coordinar una solicitud ya registrada,
  reutilizando el patrón existente en pedidos;
- acciones devueltas por el Backend.

Los candidatos se presentarán como una lista de selección accesible, no como una
colección de cards anidadas. Cada opción mostrará número, fecha, productos
resumidos, total, estado, entrega y medio de pago. Ninguna aparecerá seleccionada
por defecto, incluso cuando exista un solo resultado.

Antes de vincular, el propietario utilizará el compositor de WhatsApp dirigido al
celular de la solicitud para confirmar cuál es la compra mediante datos razonables
como fecha aproximada, productos, entrega o medio de pago. La interfaz aclarará
que abrir WhatsApp no confirma la identidad ni cambia el estado. Después de la
coordinación, `Vincular pedido` abrirá una confirmación con el código de solicitud,
el número elegido y una nota breve obligatoria. El éxito mostrará el vínculo y el
evento auditado, sin ejecutar todavía ninguna cancelación.

### 13.4 Acciones

- `Iniciar revisión`;
- `Solicitar verificación`;
- `Vincular pedido`;
- `Corregir vínculo`, solo con fundamento y conservando ambos pedidos en el
  timeline;
- `Determinar que corresponde`;
- `Determinar que no corresponde`, con fundamento legal/fáctico interno y
  explicación pública;
- `Registrar coordinación de devolución`;
- `Registrar producto recibido`;
- `Finalizar inspección`, indicando aptitud de cada unidad para reventa;
- la inspección exigirá cantidades aptas y no aptas para todos los productos,
  sin valores preseleccionados, y las validará contra las unidades vendidas;
- `Registrar reintegro pendiente`;
- `Confirmar reintegro manual`;
- `Registrar reintegro del envío` como concepto separado dentro de la
  liquidación;
- `Rectificar importe registrado`, solo como acción compensatoria auditada y sin
  representar una segunda devolución de dinero;
- `Registrar reingreso de stock` mediante el flujo de inventario apropiado;
- `Cerrar`.

Determinar aplicabilidad, confirmar devolución, reintegro o reingreso de stock requerirá
confirmación explícita. Ninguna acción financiera o de inventario se resolverá
con un único clic.

## 14. Integración con pedidos, pagos y stock

Matriz operativa aprobada:

| Situación | Acción posterior a validar la solicitud |
|---|---|
| Pedido pendiente y no entregado | Cancelar el pedido y restaurar el stock exactamente una vez |
| Pedido retirado o entregado | Coordinar la devolución y registrar la recepción |
| Pedido pagado y producto entregado | Coordinar restitución recíproca y simultánea; inspeccionar para decidir únicamente el reingreso de cada unidad |

Registrar la solicitud nunca ejecutará por sí solo una cancelación, un reintegro
ni una modificación de stock.

Identificar y vincular el pedido tampoco ejecutará esos efectos. Únicamente
habilitará las acciones posteriores que el Backend determine para el estado real
del pedido.

### Pedido no finalizado

- Si la solicitud resulta aplicable y el pedido continúa pendiente y no fue
  entregado, la acción administrativa invocará el flujo de cancelación existente
  dentro de la misma transacción.
- La RPC existente seguirá siendo responsable de restaurar stock una sola vez y
  el replay idempotente no repetirá ese efecto.
- El evento de cancelación se relacionará con la solicitud mediante auditoría.

### Pedido pagado

- Efectivo o transferencia continuarán con reintegro manual.
- Si el producto ya fue entregado, devolución y reintegro se coordinarán de modo
  recíproco y simultáneo. La inspección objetiva posterior decidirá el stock, sin
  usarse para demorar arbitrariamente la restitución económica.
- Para transferencia, el reintegro se realizará mediante transferencia. Para
  efectivo retirado en el local, podrá realizarse en efectivo con acuerdo del
  cliente; si hubo envío se coordinará una transferencia.
- El administrador registrará importe de productos, costo de devolución, total,
  fecha, medio, referencia no sensible y observación en la liquidación.
- CBU, alias y demás datos bancarios completos no se persistirán.
- Confirmar el reintegro actualizará la solicitud, no reescribirá el método de
  pago histórico.
- El `payment_status` histórico del pedido no se reutilizará para representar el
  ciclo del reintegro. Cuando exista Mercado Pago, sus pagos y reintegros tendrán
  entidades y estados propios; un pedido cobrado puede conservar `paid` mientras
  el reintegro asociado queda trazado por separado.

### Compatibilidad futura con Mercado Pago Checkout Pro

- La solicitud se registrará y evaluará aunque Mercado Pago esté caído o todavía
  no esté integrado.
- El Backend resolverá el importe reintegrable desde el importe efectivamente
  capturado y conciliado, incluyendo descuentos aplicados; nunca desde precios
  actuales ni valores enviados por el navegador.
- Un pago pendiente o `in_process` podrá requerir cancelación; un pago capturado,
  reintegro. La decisión se tomará con el estado confirmado por la API y no con el
  retorno del navegador.
- Las llamadas de cancelación o reintegro usarán `X-Idempotency-Key`, credenciales
  solo de servidor, timeout acotado y conciliación posterior.
- Un webhook no será autoridad suficiente por sí solo: se validará su autenticidad
  y se consultará el pago o reintegro a Mercado Pago antes de persistir el resultado.
- La operación soportará éxito, rechazo, demora y resultado desconocido sin doble
  reintegro. Los reintentos reutilizarán la clave de la misma operación.
- La ventana operativa informada por Mercado Pago, actualmente de hasta 180 días
  desde la aprobación y sujeta a saldo disponible, se verificará al integrar y no
  se transformará en una limitación del derecho del consumidor.
- La primera versión del botón seguirá utilizando reintegros manuales; reservar
  este contrato no autoriza todavía endpoints, credenciales ni migraciones de
  Mercado Pago.

### Pedido retirado o entregado

- Se conservará `picked_up` o `delivered`.
- La devolución física se registrará en la solicitud.
- La inspección se completará el mismo día o dentro de los dos días hábiles
  siguientes y dejará resultado, observaciones y evidencia cuando corresponda.
- El producto solo vuelve a stock después de inspección y mediante un movimiento
  específico, nunca mediante `cancel_order_with_stock`.
- Si no es apto para venta, el expediente puede resolverse sin incrementar stock.
- La clasificación, el incremento exclusivo de unidades aptas, el movimiento
  relacionado con pedido y solicitud y el evento se ejecutarán atómicamente e
  impedirán una segunda reposición para la misma solicitud y producto.
- El cierre permanecerá bloqueado hasta clasificar todas las unidades, incluso
  cuando la cantidad apta sea cero.

### Costo de devolución

- El propietario acordará previamente el transportista y el importe.
- El cliente conservará el comprobante del medio acordado.
- Cuando corresponda legalmente, el costo razonable se reintegrará junto con los
  productos y se registrará como concepto separado.
- No se automatizarán etiquetas, retiros ni integraciones logísticas en el primer
  incremento.

## 15. Seguridad y privacidad

- Nunca persistir el código público original, solo su hash y sufijo.
- No incluir teléfono, pedido, comentario o código en logs, URLs, analytics,
  mensajes técnicos o breadcrumbs.
- Cifrar comunicaciones y exigir HTTPS en producción.
- Sanitizar texto libre y renderizarlo siempre como texto.
- Limitar tamaños, caracteres y frecuencia de solicitudes.
- Aplicar HMAC a fingerprints y rotar su secreto mediante procedimiento
  documentado.
- Respuestas indistinguibles respecto de la existencia y coincidencia del pedido.
- La búsqueda y lista de pedidos candidatos serán exclusivamente administrativas;
  nunca se expondrán por celular, cookie anónima o código público.
- El celular por sí solo no autorizará una vinculación automática. El propietario
  deberá confirmar la compra y ejecutar una acción administrativa auditada.
- `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y metadata `noindex` en
  formulario, consulta y respuestas.
- El endpoint de estado no emitirá `Set-Cookie`, no leerá ni modificará Guest
  Sessions y no permitirá que consultar un código renueve una sesión de pedidos.
- RLS default-deny y grants mínimos en todas las tablas nuevas.
- `service_role` únicamente en Backend; Frontend sin Supabase.
- No incluir datos completos en `audit_logs.metadata`.
- Revisar acceso del administrador a PII y redactar logs de soporte.
- No ejecutar eliminación ni anonimización automática de solicitudes,
  liquidaciones o eventos en la primera versión. Solo los registros técnicos de
  rate limiting tendrán purga por vencimiento.
- Probar replay, enumeración, IDOR/BOLA, CSRF, XSS almacenado, rate limit y bypass
  de RLS.

## 16. Contenido y documentos legales

El Botón de Arrepentimiento y la Política de Cambios y Devoluciones serán piezas
relacionadas pero distintas:

- el botón es el canal directo para presentar la revocación legal de una compra
  a distancia y obtener una constancia;
- la política explica cambios comerciales, productos fallados o enviados por
  error, garantía, derecho de arrepentimiento, logística, inspección, reintegro y
  excepciones;
- una falla, un error de preparación o un cambio voluntario no se registrarán
  automáticamente como arrepentimiento;
- una devolución voluntaria por gusto o preferencia para recuperar el dinero se
  presentará mediante el Botón;
- WhatsApp será un canal de contingencia para esta presentación únicamente cuando
  el formulario no funcione; el propietario la registrará en Arrepentimientos,
  y conservará la fecha del primer contacto;
- otros reclamos o cambios comerciales quedarán fuera de este módulo. Si se
  implementan en el futuro, conservarán tablas, endpoints, estados y auditorías
  independientes y no se convertirán automáticamente en arrepentimientos;
- la política podrá enlazar al formulario, pero su lectura o aceptación no será
  un requisito para presentar la solicitud.

Textos públicos iniciales a validar:

- acceso: `BOTÓN DE ARREPENTIMIENTO`;
- título: `Solicitá el arrepentimiento de una compra`;
- introducción: `Completá estos datos para registrar tu solicitud. No necesitás
  crear una cuenta ni explicar el motivo.`;
- ayuda del pedido: `Si lo tenés, nos ayuda a encontrar tu compra más rápido.`;
- alternativa: `No encuentro mi número de pedido`;
- validación: `Ingresá el número de pedido o marcá que no lo encontrás.`;
- éxito: `Recibimos tu solicitud`;
- constancia: `Guardá este código para consultar el estado de tu solicitud.`;
- aclaración de constancia: `La constancia acredita que recibimos tu solicitud.
  Verificaremos identidad, alcance y próximos pasos para coordinar las restituciones.`;
- acciones de constancia: `Copiar código`, `Consultar estado` y `Volver a la
  tienda`;
- estado sin identificación: `Estamos identificando tu pedido`;
- detalle de estado: `Tu solicitud fue registrada correctamente. Nos comunicaremos
  con vos si necesitamos confirmar información.`;
- contingencia: `Si el formulario no funciona, escribinos por WhatsApp para que
  registremos tu solicitud y te informemos el código.`;
- coordinación: `Después de registrar la solicitud podremos contactarte para
  coordinar la devolución o verificar datos.`;
- solicitud sin número: `Recibimos tu solicitud. Nos comunicaremos para identificar
  el pedido que querés cancelar o devolver.`;
- error genérico: `No pudimos procesar la solicitud en este momento. Intentá
  nuevamente.`;
- rate limit: `Recibimos varios intentos. Esperá unos minutos o utilizá el canal
  alternativo de atención.`;

Actualizar:

- Términos y Condiciones con derecho, plazos, procedimiento, excepciones y
  devoluciones validados;
- Política de Privacidad con finalidad, datos, seguridad, retención y consulta;
- Footer y canal de atención;
- Content Strategy para formulario, constancia, estados y Administración.

El sitio también informará un canal alternativo para consultas o reclamos, el
área responsable (`Atención al cliente`) y su horario. Ese horario no será menor
al horario comercial; si la atención fuera exclusivamente telefónica o
electrónica, se validará antes de producción el mínimo normativo aplicable de ocho
horas por día hábil, de lunes a viernes.

No publicar textos jurídicos generados sin revisión profesional.

## 17. SEO, rendimiento y despliegue web

- La presencia del enlace no dependerá de JavaScript cargado tardíamente.
- El shell de rutas transaccionales incluirá `noindex, nofollow` y
  `X-Robots-Tag` coherente.
- No agregar `/arrepentimiento` al sitemap comercial.
- Lazy-load de formulario y bandeja admin; la franja de acceso será parte liviana
  del `PublicLayout`.
- Evitar que React Hook Form, Zod o Turnstile ingresen al bundle inicial de la
  Landing hasta navegar al formulario.
- Actualizar CSP únicamente para Turnstile ya aprobado; no agregar nuevos
  proveedores.
- Verificar visualmente producción en entradas directas desde Google, rutas de
  catálogo y dispositivos móviles.

## 18. Observabilidad y operación

Medir sin PII:

- solicitudes creadas y fallidas;
- latencia de registro y emisión de constancia;
- solicitudes sin pedido vinculado;
- cantidad de búsquedas administrativas de candidatos, sin registrar criterios ni
  resultados con PII;
- solicitudes abiertas por estado y antigüedad;
- primera revisión dentro/fuera del objetivo;
- bloqueos y desafíos CAPTCHA;
- transiciones rechazadas por concurrencia;
- devoluciones, reintegros y reingresos de stock pendientes;
- errores de auditoría o persistencia.

Crear runbooks para:

- solicitud no identificada;
- varios pedidos candidatos para un mismo celular;
- ausencia de candidatos por coincidencia de celular;
- corrección de un pedido vinculado por error;
- duplicados;
- persona sin código;
- plazo próximo a vencer;
- solicitud aparentemente fuera de plazo;
- producto personalizado o posible excepción;
- producto ya entregado;
- reintegro manual pendiente;
- abuso automatizado;
- indisponibilidad del formulario o Turnstile;
- incidente de privacidad.

## 19. Plan de implementación

### Fase 0 — Política y documentación

1. Incorporar las decisiones aprobadas del apartado 6 en los documentos
   prioritarios y someter los textos jurídicos a revisión profesional.
2. Actualizar documentos prioritarios en el orden indicado.
3. Aprobar los textos finales de formulario, condiciones, privacidad y
   comunicaciones.
4. Verificar que la matriz aprobada de estados, acciones y efectos sobre
   pedido/pago/stock no contradiga los documentos de mayor prioridad.
5. Definir evidencia de que el derecho fue informado en checkout y confirmación,
   el criterio de cómputo de plazo y el horario/canal de atención al cliente.

**Criterio de salida:** existe una política ejecutable y sin contradicciones; el
administrador sabe qué hacer desde la recepción hasta el cierre.

### Fase 1 — Datos y seguridad

1. Crear la migración mediante Supabase CLI.
2. Agregar enums, solicitudes, liquidaciones, eventos, límites, constraints e
   índices.
3. Implementar RPC atómicas y auditoría append-only.
4. Configurar RLS, grants y hardening de funciones.
5. Regenerar tipos y probar migración sobre base vacía y copia representativa.
6. Ejecutar advisors de seguridad y rendimiento.
7. Verificar idempotencia recuperable de la constancia sin persistir el código
   público original y concurrencia mediante `version`.

**Criterio de salida:** una solicitud y su constancia se persisten una sola vez;
no existen accesos directos públicos ni modificaciones del timeline.

### Fase 2 — Backend público

1. Crear schemas, repository, service, controller y routes.
2. Implementar registro siempre recibido para entradas válidas.
3. Implementar asociación opcional y respuesta indistinguible.
4. Implementar constancia con código hasheado e idempotencia.
5. Implementar consulta mínima por body.
6. Adaptar rate limiting y Turnstile.
7. Agregar redacción de logs y headers `no-store`/`no-referrer`.
8. Validar la alternativa exclusiva entre número informado y número no encontrado,
   sin vinculación automática basada solo en el celular.

**Criterio de salida:** una persona sin cuenta ni sesión puede obtener una
constancia sin revelar si su pedido fue identificado.

### Fase 3 — Frontend público

1. Incorporar la franja destacada y el enlace del Footer.
2. Crear rutas lazy `/arrepentimiento` y `/arrepentimiento/consulta`.
3. Implementar formulario, constancia, copia y consulta.
4. Integrar errores, rate limit y CAPTCHA adaptativo.
5. Actualizar metadata, legales, privacidad y contenido.
6. Validar responsive, teclado, lector de pantalla y contraste.
7. Implementar `No encuentro mi número de pedido` sin mostrar pedidos ni depender
   de la sesión anónima de compra.

**Criterio de salida:** el acceso es visible desde el primer ingreso y el flujo
completo funciona desde 360 px sin login ni dependencia de una sesión.

### Fase 4 — Administración

1. Crear endpoints administrativos y matriz de acciones.
2. Agregar módulo, navegación, listado, filtros y detalle.
3. Implementar timeline, concurrencia y confirmaciones.
4. Integrar pedido, WhatsApp manual posterior, contingencia, devolución,
   liquidación, reintegro y stock.
5. Incorporar alertas en Dashboard y estados operativos.
6. Implementar candidatos privados por celular, confirmación manual por WhatsApp,
   selección sin valor predeterminado y vinculación auditada de un único pedido.

**Criterio de salida:** toda solicitud puede gestionarse de punta a punta sin
editar base de datos manualmente ni perder trazabilidad.

### Fase 5 — Pruebas y producción

1. Ejecutar pruebas unitarias, integración, E2E, seguridad y accesibilidad.
2. Probar solicitudes identificadas, no identificadas, duplicadas y abusivas.
3. Probar pedidos pendientes, pagados, cancelados, retirados y entregados.
4. Validar migración forward-only y rollback mediante feature flag.
5. Desplegar base, Backend y Frontend en orden compatible.
6. Activar monitoreo y ejecutar un simulacro operativo completo.
7. Realizar revisión jurídica y visual final sobre producción.

**Criterio de salida:** el canal está visible, emite constancia, el administrador
puede resolver casos reales y existe un procedimiento de contingencia.

## 20. Estrategia de pruebas

### Funcionales

- solicitud con pedido y celular coincidentes;
- solicitud sin número de pedido;
- validación que exige número o la alternativa explícita, pero nunca ambos;
- solicitud sin número que queda en `verification_pending` aunque el celular tenga
  un único pedido candidato;
- pedido inexistente o celular no coincidente;
- comentario vacío y en longitud máxima;
- doble envío con igual y distinta idempotency key;
- número de pedido omitido mediante `orderNumberUnavailable: true`, teléfono
  obligatorio y comentario omitido;
- pedido inexistente, teléfono no coincidente y solicitud aparentemente fuera de
  plazo con constancia emitida en todos los casos;
- copia y consulta de código válido/inválido;
- constancia con código, fecha y hora, aclaración de revisión, las tres acciones y
  el mensaje condicional cuando no se informó el número;
- respuesta visual indistinguible para número coincidente, inexistente o teléfono
  no coincidente;
- consulta puntual que no crea, renueva ni rota sesiones o cookies, no devuelve
  `Set-Cookie` y exige reingresar el código después de recargar;
- resultado de consulta conservado solo en memoria y sin persistencia del código;
- vinculación manual y detección de duplicados;
- cero, uno y varios candidatos administrativos sin selección automática;
- confirmación de que los candidatos nunca aparecen en endpoints o pantallas
  públicas;
- vínculo de un único pedido, corrección fundamentada y concurrencia entre dos
  intentos administrativos;
- vinculación sin efectos sobre pedido, pago o stock;
- determinación fundamentada de aplicabilidad o no aplicabilidad y cierre;
- devolución antes y después de la entrega;
- reintegro manual con desglose de productos y costo de devolución;
- efectivo, transferencia y stock apto/no apto;
- indisponibilidad de Turnstile con rate limiting reforzado y registro válido;
- separación entre `request_status`, `return_status` y `refund_status`;
- cierre bloqueado mientras exista devolución o reintegro obligatorio pendiente;
- cálculo desde snapshots y monto capturado, nunca desde precios vigentes;
- contrato futuro de Mercado Pago: idempotencia, timeout ambiguo, webhook
  duplicado/desordenado, conciliación y fallback manual, mediante dobles de prueba
  sin realizar llamadas reales en este incremento.

### Seguridad

- enumeración de pedidos y códigos;
- brute force y rate limiting por IP/contacto;
- CAPTCHA adaptativo y proveedor indisponible;
- CSRF y `Origin` inválido;
- XSS en comentario y fundamentos;
- acceso administrativo sin sesión/rol;
- concurrencia y replay de acciones;
- RLS/grants y ejecución pública de RPC;
- PII en logs, URLs, cache, analytics y errores.

### Accesibilidad y responsive

- enlace visible y operable en 360, 390, 480, 768, 1024 y 1280 px;
- un único `h1`, jerarquía y landmarks;
- navegación por teclado y foco tras envío;
- errores asociados, estados anunciados y CAPTCHA accesible;
- zoom 200 %, contraste AA y `prefers-reduced-motion`;
- tabla administrativa convertida en fichas sin scroll horizontal.

### Calidad

- pruebas backend y frontend;
- migraciones locales y remotas verificadas;
- `pnpm lint` y `pnpm build` sin errores ni warnings;
- contratos y documentación sincronizados;
- revisión visual en producción sin afectar indexación comercial.

## 21. Despliegue y rollback

1. Aplicar migraciones aditivas sin cambiar pedidos existentes.
2. Desplegar Backend compatible con la funcionalidad deshabilitada.
3. Desplegar Frontend y Admin detrás de feature flag/configuración.
4. Ejecutar smoke test con solicitud de prueba y borrado únicamente de datos de
   prueba mediante procedimiento controlado.
5. Habilitar el acceso público en horario supervisado.
6. Si ocurre un incidente, mantener un canal alternativo visible, deshabilitar el
   formulario sin eliminar registros y conservar la bandeja administrativa.
7. Nunca revertir destructivamente solicitudes o eventos ya creados.

## 22. Definición de terminado

La funcionalidad estará terminada únicamente cuando:

- el enlace exacto sea visible, destacado y accesible desde el primer ingreso;
- no se exija cuenta, sesión ni coincidencia previa para emitir constancia;
- el código se entregue inmediatamente y no se almacene en texto plano;
- la constancia muestre código, fecha, próximos pasos, aclaración de revisión y
  acciones para copiar, consultar y volver a la tienda;
- consultar el estado sea una operación puntual sin creación, lectura, renovación
  o modificación de sesiones y cookies;
- las respuestas no permitan enumerar pedidos;
- el administrador pueda gestionar solicitudes identificadas y no identificadas;
- una solicitud sin número pueda vincularse manualmente con un único pedido desde
  Administración, sin exponer candidatos al público ni elegir uno automáticamente;
- estados y acciones sean coherentes y auditables;
- expediente, devolución física y reintegro tengan estados independientes;
- ninguna solicitud pública modifique por sí sola pedidos, pagos o stock;
- devoluciones e inventario respeten el estado físico del producto;
- existan textos y procedimiento aprobados jurídicamente;
- privacidad, términos, canales y horarios estén actualizados;
- RLS, grants, rate limiting, CSRF y concurrencia hayan sido probados;
- la interfaz sea responsive y WCAG AA;
- métricas, alertas, runbooks y rollback estén activos;
- lint, build y suites finalicen sin errores ni warnings;
- `BUSINESS-RULES.md`, `DATABASE-SDD.md`, `BACKEND-SDD.md`, `FRONTEND-SDD.md`,
  `ADMIN-SDD.md`, `CONTENT-STRATEGY.md` y `DECISIONS.md` hayan sido sincronizados
  antes de comenzar la implementación.

## 23. Fuentes oficiales consultadas

### Normativa argentina

- [Disposición 954/2025 — Derecho de arrepentimiento](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-954-2025-417152/texto)
- [Disposición 3/2026 — Verificación razonable de identidad y seguridad](https://www.argentina.gob.ar/normativa/nacional/disposici%C3%B3n-3-2026-423007/texto)
- [Código Civil y Comercial de la Nación — texto actualizado](https://www.argentina.gob.ar/normativa/nacional/ley-26994-235975/actualizacion)

### Supabase

- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Seguridad de la Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Breaking change de exposición de tablas](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)

### Mercado Pago

- [Checkout Pro — Reembolsos y cancelaciones](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/additional-settings/refunds-and-cancellations)
- [API de reembolsos de Checkout Pro](https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/get-refunds/get)
- [Uso obligatorio de idempotencia en pagos y reembolsos](https://www.mercadopago.com.ar/developers/es/news/2023/01/04/Idempotency-key-usage-will-be-mandatory)

Las normas, plazos y capacidades técnicas deberán verificarse nuevamente al
iniciar la implementación y antes de habilitar producción.

## Revisión jurídica orientativa de implementación

El 19 de agosto de 2026 se contrastó el diseño con fuentes oficiales vigentes.
Esta revisión técnica-jurídica no constituye asesoramiento profesional ni
reemplaza el dictamen de una persona matriculada en Argentina. Como resultado:

- `accepted` y `rejected` se reemplazaron por `applicable` y `not_applicable` para
  evitar presentar el derecho como una autorización discrecional del comercio;
- `not_applicable` exige fundamento interno, explicación pública comprensible y
  canal de revisión o reclamo;
- la restitución se coordina de manera recíproca y simultánea; la inspección
  posterior decide stock, pero no puede imponer una demora arbitraria al reintegro;
- se conservan evidencia y snapshots de celebración del contrato, información
  del derecho y entrega/retiro, sin usar `order_created_at` como prueba suficiente;
- la liquidación incluye todas las sumas contractuales efectivamente cobradas,
  un eventual costo original de entrega y el costo de retorno aplicable;
- se prioriza retiro o envío prepagado y se controla el plazo de 24 horas también
  para solicitudes recibidas por contingencia.

Antes de habilitar producción, un abogado o abogada matriculada deberá revisar
los textos públicos, el procedimiento operativo, las excepciones y el cómputo de
plazos aplicado al modelo comercial real.
