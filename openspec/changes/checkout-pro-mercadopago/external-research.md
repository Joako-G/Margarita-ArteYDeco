# Investigación oficial para Checkout Pro Argentina

```yaml
artifact: gentle-ai.sdd-research/v1
revision: 3
change: checkout-pro-mercadopago
outcome: done
accessed_at: 2026-09-17
language: es-AR-neutral
claim_scope: official-open-web-plus-repository-recommendations
```

## Resumen ejecutivo

La documentación oficial vigente recomienda **Orders API para una integración nueva de Checkout Pro**. El flujo clásico mediante Preferences API continúa documentado, pero Mercado Pago lo identifica como el flujo clásico y deriva las integraciones nuevas a Orders API. Esto obliga a resolver una incompatibilidad documental del repositorio: las reglas actuales hablan de `binary_mode = false` y de vigencia de la preferencia, mientras que Orders API expone `capture_mode`, `expiration_time`, una order propia, idempotencia obligatoria y Webhooks de order.

La arquitectura Vercel Frontend → Vercel Node 22/Express Backend → Supabase es compatible. La integración debe permanecer completamente del lado del Backend, usar la RPC PostgreSQL existente como límite atómico para pedido/stock, persistir intentos e ingreso de Webhooks de forma durable, y ejecutar las llamadas a Mercado Pago fuera de las transacciones PostgreSQL. La liberación de stock no debe depender del redirect ni del mero transcurso de 40 minutos: primero debe conciliarse y, cuando corresponda, cancelarse idempotentemente la order del proveedor y comprobar un estado terminal que permita liberar.

La investigación cubre los siete temas solicitados. Persistir el resultado en `external-research.md` no actualiza por sí solo el estado formal de `preproposal.md`; esa reconciliación queda como siguiente paso del orquestador porque esta ejecución autorizó únicamente este archivo.

## Admisión de evidencia

```yaml
capability:
  schema: gentle-ai.sdd-research-capability/v1
  granted:
    class: open-web
    publishers:
      - publisher: Mercado Pago
        domains:
          - mercadopago.com
          - mercadopago.com.ar
      - publisher: Supabase
        domains:
          - supabase.com
      - publisher: Vercel
        domains:
          - vercel.com
  denied:
    classes:
      - every-other-source-class
    publishers_and_domains:
      - every-other-publisher-or-domain
  observed_tools:
    - web-search
    - web-open
  admission: granted
```

No se usaron blogs, foros, Stack Overflow, GitHub Issues, snippets como evidencia final ni documentación de terceros. Cada fuente del registro fue abierta o leída desde el dominio oficial permitido. Los archivos del repositorio se utilizaron únicamente para evaluar compatibilidad y no como evidencia externa.

## Conclusiones que deben guiar la propuesta

| Decisión técnica recomendada | Base oficial | Naturaleza |
|---|---|---|
| Adoptar Orders API para esta integración nueva. | MP-01, MP-02 | Recomendación directa a partir de documentación oficial actual. |
| Reemplazar el concepto de “preferencia” por una `order` de Mercado Pago en el diseño nuevo. | MP-01, MP-02 | Recomendación de diseño específica del repositorio. |
| No trasladar literalmente `binary_mode = false`; validar `capture_mode: automatic_async` y el mapa de estados de Orders API en sandbox. | MP-02, MP-05 | Inferencia. `binary_mode` está documentado para Preferences API, no para Orders API. |
| Enviar `X-Idempotency-Key` estable por intento al crear o cancelar una order y conservar idempotencia interna independiente. | MP-02, MP-03 | Hecho oficial para el proveedor más recomendación interna. |
| Configurar solo dinero en cuenta y débito mediante exclusiones explícitas, y comprobar la configuración efectiva por ambiente. | MP-04 | Hecho oficial más recomendación del repositorio. |
| Validar firma, persistir un inbox durable y responder rápido; procesar y conciliar después contra GET `/v1/orders/{id}`. | MP-06, MP-07, MP-08, VE-03 | Recomendación derivada de hechos oficiales. |
| Al vencer la reserva, impedir nuevos intentos, conciliar, cancelar idempotentemente si el estado lo permite, verificar el estado final y recién entonces liberar stock. | MP-03, MP-05 | Recomendación específica del dominio. |
| Mantener Access Token y secreto de Webhook solo en Backend/Vercel; usar variables sensibles separadas por ambiente. | MP-09, VE-01, SB-01 | Recomendación respaldada por los tres proveedores. |
| Migrar a la cuenta del cliente como una operación de configuración y despliegue, no como cambio de código. | MP-09, MP-10, VE-01 | Recomendación específica del repositorio. |

## 1. Cuentas de prueba y tarjetas

### Hechos oficiales

1. Checkout Pro genera cuentas/credenciales de prueba asociadas a la aplicación. Las pruebas requieren, como mínimo, vendedor y comprador; ambos deben pertenecer al mismo país. Mercado Pago permite hasta 15 cuentas de prueba simultáneas y actualmente no permite eliminarlas. [MP-11]
2. La cuenta de prueba puede disponer de saldo ficticio y sus datos incluyen usuario, contraseña y código de verificación. [MP-11]
3. Mercado Pago indica realizar compras de prueba con una cuenta de comprador y una ventana de incógnito para evitar conflictos de credenciales. [MP-12]
4. Las tarjetas oficiales publicadas al 2026-09-17 son:

| Tipo | Marca | Número | CVV | Vencimiento |
|---|---|---:|---:|---:|
| Crédito | Mastercard | `5031 7557 3453 0604` | `123` | `11/30` |
| Crédito | Visa | `4509 9535 6623 3704` | `123` | `11/30` |
| Crédito | American Express | `3711 803032 57522` | `1234` | `11/30` |
| Débito | Mastercard | `5287 3383 1025 3304` | `123` | `11/30` |
| Débito | Visa | `4002 7686 9439 5619` | `123` | `11/30` |

5. El nombre del titular simula resultados. Los casos mínimos relevantes son `APRO` (aprobado), `CONT` (pendiente), `OTHE` (rechazo general), `FUND` (fondos insuficientes), `SECU` (CVV inválido), `DUPL` (duplicado) y `CTNA` (tipo de tarjeta no permitido). [MP-12]

### Recomendaciones para este repositorio

- Crear la aplicación de prueba bajo control del equipo durante el desarrollo, con vendedor y comprador argentinos separados. No usar la cuenta real del cliente hasta el gate de migración.
- Probar, como mínimo: saldo de Mercado Pago aprobado; débito aprobado; pendiente/en proceso; rechazo; duplicado; medio excluido; reintento sobre el mismo pedido; expiración; cancelación; Webhook repetido; Webhook inválido.
- No persistir números de tarjetas, CVV, contraseñas o códigos de test en el repositorio, logs, fixtures compartidos ni reporte de ejecución. Los datos públicos de tarjeta de esta sección son una referencia documental, no secretos configurables.
- Confirmar en sandbox que la exclusión de crédito, prepaga, offline y cuotas sin tarjeta deja exactamente `account_money` y `debit_card`. La lista efectiva depende de país/cuenta y debe verificarse, no asumirse.

## 2. Webhooks, autenticidad, conciliación y reintentos

### Hechos oficiales

1. Mercado Pago configura Webhooks por aplicación con URL HTTPS y genera un secreto exclusivo. La documentación recomienda separar URL de prueba y URL productiva. [MP-06]
2. Para Checkout Pro vía Orders API, la configuración actual solicita el evento de order y permite simular una notificación desde “Tus integraciones”. [MP-07]
3. La firma llega en `x-signature`; la validación oficial utiliza también `x-request-id` y `data.id`. El SDK oficial realiza validación HMAC. [MP-06]
4. El manifiesto documentado por Mercado Pago es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, con HMAC-SHA-256 hexadecimal y comparación en tiempo constante. [MP-13]
5. Mercado Pago espera HTTP `200` o `201` dentro de 22 segundos. Si no lo recibe, reintenta cada 15 minutos; después del tercer intento amplía el intervalo y continúa enviando. [MP-06]
6. Después de acusar recibo, la integración debe consultar el recurso notificado en la API. Para Orders API corresponde GET `/v1/orders/{id}`; para el flujo clásico de Payments, GET `/v1/payments/{id}`. [MP-06, MP-07]
7. La documentación de estado de Orders API pide esperar el Webhook antes de ejecutar acciones irreversibles. [MP-05]

### Diseño recomendado para este repositorio

1. El endpoint Express debe aceptar solo `POST`, limitar tamaño, conservar los query params exactos requeridos por la firma y no requerir sesión pública ni JWT administrativo.
2. Validar `x-signature` antes de cualquier efecto. Preferir el validador del SDK oficial fijado a una versión concreta; si se implementa manualmente, usar el manifiesto oficial y comparación constante.
3. Dentro de una RPC corta, registrar un inbox mínimo y durable con: proveedor, ambiente, aplicación, ID de notificación si está presente, `data.id`, tipo, acción, fecha recibida, digest del payload, estado de procesamiento y versión. No guardar secretos ni datos de tarjeta.
4. Aplicar unicidad por identidad de notificación cuando sea estable y, además, idempotencia por transición/recurso. No depender únicamente del ID de entrega: la conciliación por `data.id` debe tolerar entregas repetidas, eventos fuera de orden y re-procesamiento de jobs.
5. Responder `200` solo después de validar y persistir el inbox. No esperar la consulta a Mercado Pago ni toda la lógica comercial dentro del request de Webhook.
6. Un job durable recupera GET `/v1/orders/{id}`, valida que `user_id`, `application_id`, `live_mode`, moneda, importe y `external_reference` correspondan al intento esperado, y aplica una transición idempotente mediante RPC.
7. El cuerpo del Webhook y el redirect son señales, no la fuente de verdad financiera. La fuente externa se obtiene de la API autenticada; la fuente interna sigue siendo el ledger de intentos/eventos y sus transiciones auditadas.

### Límite de autenticidad no resuelto

La documentación consultada describe la firma y contiene `ts`, pero no establece una ventana oficial de tolerancia temporal para Checkout Pro. Por lo tanto, no se valida como hecho una regla del tipo “rechazar firmas mayores a N minutos”. La propuesta puede agregar una política defensiva propia, pero debe documentarla como control interno, probarla contra reintentos legítimos y no sustituir la deduplicación durable.

## 3. Idempotencia

### Hechos oficiales

- Orders API exige `X-Idempotency-Key` al crear una order; Mercado Pago indica un UUID único por intento y documenta una longitud máxima de 128 caracteres. [MP-02]
- Cancelar una order también exige `X-Idempotency-Key` y solo está permitido para estados `created` o `action_required`. [MP-03]
- La documentación del flujo clásico de Preferences API no muestra `X-Idempotency-Key` en el endpoint de creación de preferencia. No debe suponerse que ofrece el mismo contrato que Orders API. [MP-14]

### Recomendación de capas idempotentes

| Capa | Clave recomendada | Regla |
|---|---|---|
| Crear pedido interno | Idempotency key pública existente + fingerprint canónico | Reutilizar respuesta previa o rechazar reutilización con payload distinto. |
| Crear order Mercado Pago | UUID estable por `order_id + attempt_no + create` | Reenviar la misma clave ante timeout o resultado incierto. |
| Cancelar order Mercado Pago | UUID estable por `provider_order_id + cancel` | No generar una clave nueva para el mismo reintento lógico. |
| Webhook inbox | Identidad de entrega + aplicación/ambiente | Inserción única; entrega repetida devuelve éxito sin duplicar efectos. |
| Aplicar estado conciliado | `provider_order_id + provider_version/status` | Transición condicional y auditada. |
| Job/outbox | `operation + aggregate + attempt` | Una sola ejecución lógica con lease, reintentos y backoff acotados. |

La clave del proveedor no reemplaza la idempotencia interna: Mercado Pago protege su operación; la base local debe proteger stock, pedido, ledger y jobs. Las claves completas no deben exponerse al Frontend ni registrarse en logs; puede conservarse un hash y una referencia opaca, siempre que el Backend pueda reproducir el valor estable necesario para reintentar la misma operación.

## 4. Reserva de stock y vencimiento

### Hechos oficiales relevantes

- Orders API permite `expiration_time` como duración ISO 8601 y documenta estados no terminales y terminales de la order. [MP-02, MP-05]
- Una order no pagada puede cancelarse por API solo cuando está en `created` o `action_required`, con idempotencia obligatoria. [MP-03]
- La expiración de pagos offline de Preferences API es un concepto separado y Mercado Pago recomienda plazos amplios por compensación; no es un temporizador apropiado para inventario de 40 minutos. [MP-15]
- Mercado Pago no prescribe cómo reservar inventario del comercio. El diseño de stock siguiente es una recomendación del repositorio, no un hecho del proveedor.

### Compatibilidad con la regla local de 40 minutos

El repositorio ya crea el pedido y descuenta stock en una RPC (`create_order_with_stock`). Ese descuento puede seguir representando la reserva comercial: no debe descontarse otra vez al crear un intento de pago ni al reintentar un rechazo.

Flujo recomendado:

1. **Transacción local:** crear pedido, snapshots, movimiento de inventario, `reservation_expires_at`, primer `payment_attempt` y outbox de creación en una única RPC. El inicio de los 40 minutos se toma del reloj PostgreSQL.
2. **Llamada externa:** fuera de la transacción, el worker crea la order de Mercado Pago con `external_reference` opaca, importe autoritativo del pedido y clave idempotente estable.
3. **Persistencia:** guardar `provider_order_id`, estado y `checkout_url` mediante una RPC condicional. El Frontend recibe solo la URL y datos públicos necesarios.
4. **Reintento:** un rechazo puede crear otro intento para el mismo pedido mientras la reserva siga vigente; no genera otro movimiento de inventario.
5. **Vencimiento:** marcar “expiry due” y bloquear nuevos intentos. Consultar el estado actual del proveedor fuera de la transacción.
6. **Cancelación externa:** si la order está en un estado cancelable, solicitar cancelación con la misma clave idempotente de esa operación y volver a consultar el estado.
7. **Liberación:** una RPC con bloqueo/versionado restaura stock exactamente una vez solo después de evidencia terminal no cobrada. Si el estado es `processing`, incierto, no consultable o no cancelable, mantener conciliación y no liberar.
8. **Aprobación tardía:** si aparece un pago acreditado antes de la liberación, convertir la reserva en venta sin nuevo descuento. Si aparece una contradicción después de una liberación confirmada, bloquear automatismos y abrir revisión/compensación; no permitir stock negativo.

### Punto que requiere prueba de proveedor

Orders API declara `expiration_time` como duración ISO 8601 y muestra `P1D`, pero la documentación consultada no confirma explícitamente el valor exacto `PT40M` ni sus límites para Argentina. La propuesta debe exigir una prueba sandbox del valor de 40 minutos. Si el proveedor no lo admite, el temporizador local seguirá siendo autoritativo para iniciar nuevos intentos, acompañado por cancelación/conciliación externa.

## 5. Límites de seguridad y secretos

### Límite por componente

| Componente | Puede conocer | No puede conocer |
|---|---|---|
| Frontend Vercel | Capacidad habilitada, URL de checkout, estado público normalizado | Access Token, secreto Webhook, Supabase secret key, payload administrativo del proveedor. |
| Backend Vercel | Access Token, secreto Webhook, clave idempotente operativa, Supabase secret key | Datos de tarjeta/CVV; no son necesarios en Checkout Pro alojado. |
| Supabase | Intentos, eventos mínimos, hashes, estados, jobs, auditoría | Access Token de Mercado Pago y secreto Webhook en tablas. |
| Logs | IDs opacos, estado, duración, correlación | Headers de autorización, firmas, claves, PII completa, cuerpo sin redacción. |

### Hechos oficiales

- Mercado Pago indica que el Access Token es privado, debe enviarse en `Authorization` y nunca exponerse en frontend o parámetros públicos. [MP-09]
- Vercel permite variables separadas para Development, Preview, Production y ambientes personalizados; los valores sensibles pueden marcarse como no legibles. Los cambios solo aplican a despliegues nuevos. [VE-01]
- Supabase indica usar una secret key solo en componentes controlados del Backend; omite RLS, nunca debe llegar al navegador y recomienda una clave separada por componente. [SB-01]
- Las tablas expuestas deben tener grants mínimos y RLS; una secret key opera con `service_role` y bypass RLS, por lo que el Backend debe aplicar autorización propia. [SB-01, SB-02]

### Recomendaciones adicionales

- Agregar un perfil validado `MERCADOPAGO_ENV=test|production` y exigir que todas las variables de ese perfil estén completas. Fallar al iniciar ante mezcla, ausencia o ambiente desconocido.
- Separar por ambiente: Access Token, application/user ID esperado, secreto Webhook, URL Webhook, origins de retorno y feature flag.
- Habilitar producción solo con flag explícito y comprobación de `live_mode`, application/user ID, moneda e importe en cada conciliación.
- Rotar secretos mediante despliegue nuevo. Mercado Pago documenta una superposición de 12 horas para Access Token antiguo al renovar credenciales productivas; probar ambos lados del despliegue antes de retirar la clave anterior. [MP-09]
- La configuración CSP actual bloquea frames externos (`frame-src 'none'`). El flujo recomendado es redirect externo mediante `checkout_url`; si se elige modal/iframe habrá que revisar CSP de forma explícita, no relajarla de manera general.

## 6. Migración segura a la cuenta del cliente

La migración debe ser reversible y sin cambios de código:

1. El cliente crea o selecciona su aplicación en su propia cuenta Mercado Pago Argentina y mantiene la propiedad de las credenciales.
2. Compartir acceso solo por el Dashboard oficial; no enviar secretos por chat, correo o tickets. Retirar permisos de terceros al finalizar. [MP-09]
3. En ambiente Preview/Staging, cargar el conjunto completo del cliente como variables sensibles y mantener el feature flag apagado.
4. Configurar la URL Webhook de prueba, generar su secreto propio y simular recepción. Los secretos pertenecen a cada aplicación/ambiente y no se copian desde la cuenta del desarrollador. [MP-06, MP-07]
5. Ejecutar la matriz de sandbox con comprador/vendedor argentinos, medios permitidos, idempotencia, firma, conciliación, expiración, cancelación y reintentos.
6. Activar credenciales productivas desde “Tus integraciones”; Mercado Pago exige sitio web e HTTPS para producción. [MP-10]
7. Configurar URL y secreto Webhook productivos, Access Token productivo, IDs esperados y origins productivos en el ambiente Production de Vercel. Desplegar con el flag apagado.
8. Ejecutar smoke tests no destructivos: health, configuración completa, obtención de medios de pago, firma simulada y validación de IDs/ambiente. Luego realizar una compra real controlada y su conciliación.
9. Habilitar gradualmente el feature flag, observar inbox, jobs, latencias, errores y reconciliaciones. Conservar cash/transfer como fallback independiente.
10. Revocar/eliminar las credenciales de desarrollo de los ambientes del cliente y documentar ownership, rotación, responsables y rollback.

### Contradicción oficial que exige validación

La documentación de creación de Orders API habla de Access Token de prueba, pero la referencia de cancelación devuelve un error documentado que indica que esa operación no soporta credenciales de prueba y menciona usuarios de prueba con credenciales productivas para sandbox. [MP-02, MP-03] No se debe elegir una interpretación. La cuenta/app seleccionada debe validar el flujo real de cancelación antes de aprobar el diseño y la salida a producción.

## 7. Compatibilidad con Vercel, Express y Supabase

### Evaluación

| Área | Estado | Evidencia del repositorio | Acción necesaria |
|---|---|---|---|
| Node 22 en Vercel | Compatible | `backend/package.json` declara Node `>=22`; Vercel soporta 22.x. | Fijar `22.x` para evitar que `>=22` seleccione otro major. [VE-02] |
| Express como Vercel Function | Compatible | `backend/src/app.ts` exporta handler y carga dependencias en runtime. | Agregar ruta pública dedicada de Webhook y mantener inicialización sin secretos en logs. |
| Límite Frontend → Backend | Compatible | El Frontend reescribe `/api/*` al Backend; Supabase se instancia en Backend. | Mantener Mercado Pago fuera del Frontend. |
| Atomicidad de pedido/stock | Base sólida | `OrderRepository.createWithStock()` llama `create_order_with_stock`; la RPC valida/descuenta stock. | Extender la RPC de forma aditiva con reserva, intento y outbox. |
| Idempotencia de pedido | Base sólida | Servicio calcula fingerprint y la migración `202608060012_order_idempotency.sql` agrega idempotencia. | No reutilizar esa clave como única protección del pago; agregar scope por operación/intento. |
| Restauración única | Base existente | `cancel_order_with_stock` y movimientos de inventario evitan restauraciones repetidas. | Condicionar la cancelación automática a conciliación terminal del proveedor. |
| Modelo de pago | Incompatible todavía | Tipos y schemas solo aceptan `cash` y `bank_transfer`; `payment_status` es resumen simple. | Agregar intento/ledger de proveedor separado; no expandir `orders.payment_status` con todos los estados externos. |
| Jobs durables | Faltante | No existe inbox/outbox de pagos ni scheduler del proveedor. | Elegir Supabase Cron o Vercel Cron y diseñar leases/backoff/alertas. |
| Credenciales | Parcial | `env.ts` valida secretos y `supabase.ts` usa secret key solo en Backend. | Agregar perfil Mercado Pago completo y fail-closed por ambiente. |
| CSP/redirect | Compatible con ajuste | `frontend/vercel.json` usa `frame-src 'none'` y `form-action 'self'`. | Preferir redirect por URL; revisar `connect-src`/navegación solo con evidencia de la implementación final. |

### Implicancias operativas de Vercel

- Una tarea iniciada sin `await` puede quedar congelada al responder. `waitUntil()` también queda limitada por el timeout de la Function. Por lo tanto, el procesamiento financiero durable no puede depender de un “fire and forget” en memoria. [VE-03]
- Vercel Cron invoca una URL productiva por GET y puede autenticarse con `CRON_SECRET`; en Hobby, la frecuencia máxima efectiva es diaria, insuficiente para una reserva de 40 minutos. [VE-04]
- Supabase Cron usa `pg_cron`, puede ejecutar funciones SQL o HTTP y registra ejecuciones; es compatible con conciliaciones frecuentes, pero su adopción es una decisión de diseño y configuración. [SB-03]
- Para lógica multi-sentencia atómica vía `supabase-js`, Supabase recomienda una Database Function/RPC; el cliente JS no agrupa consultas separadas en una transacción. [SB-04]

### Recomendación de scheduler

Preferir inicialmente **Supabase Cron + RPC de claiming** para localizar jobs vencidos y marcar leases, mientras el Backend Vercel ejecuta las llamadas externas mediante un endpoint protegido; alternativamente, usar Vercel Cron solo si el plan garantiza la frecuencia requerida. Ninguna opción debe ejecutar HTTP a Mercado Pago dentro de la transacción que bloquea pedido/stock.

Esta recomendación no es una exigencia oficial de Mercado Pago. La propuesta debe decidir frecuencia, lease, backoff, jitter, cantidad máxima de intentos, dead-letter/manual review, retención y alertas.

## Mapeo de claims validados

| Claim | Afirmación validada | Fuentes |
|---|---|---|
| C-01 | Las integraciones nuevas de Checkout Pro deben usar Orders API; Preferences es el flujo clásico. | MP-01 |
| C-02 | Crear una order exige idempotency key y devuelve `checkout_url`; admite `expiration_time`. | MP-02 |
| C-03 | Cancelar una order no pagada es idempotente y está limitado a estados específicos. | MP-03 |
| C-04 | Orders API permite excluir tipos/medios de pago; todos están disponibles por defecto. | MP-04 |
| C-05 | Orders API tiene estados no terminales y exige esperar Webhook antes de acciones irreversibles. | MP-05 |
| C-06 | Webhooks se firman con HMAC y requieren `x-signature`, `x-request-id` y `data.id`. | MP-06, MP-13 |
| C-07 | Mercado Pago reintenta Webhooks no confirmados; el receptor debe consultar el recurso. | MP-06 |
| C-08 | Checkout Pro dispone de cuentas y tarjetas oficiales para escenarios aprobados, pendientes y rechazados. | MP-11, MP-12 |
| C-09 | Access Token es privado y debe permanecer fuera del Frontend. | MP-09 |
| C-10 | La salida a producción reemplaza credenciales de prueba, requiere aplicación/configuración productiva y HTTPS. | MP-10 |
| C-11 | Vercel separa variables por ambiente y soporta Node 22.x. | VE-01, VE-02 |
| C-12 | El trabajo asíncrono en Vercel queda acotado por el ciclo/timeout de la Function. | VE-03 |
| C-13 | Supabase secret key omite RLS y debe permanecer en Backend; las operaciones multi-sentencia deben encapsularse en RPC. | SB-01, SB-02, SB-04 |
| C-14 | Supabase Cron puede ejecutar funciones/HTTP y registrar ejecuciones. | SB-03 |

## Riesgos, contradicciones y preguntas no respaldadas

### Riesgos altos

1. **Contrato desactualizado:** las reglas del repositorio fijan Preferences (`binary_mode`, preferencia), mientras la documentación vigente recomienda Orders API para integraciones nuevas.
2. **Liberación prematura:** 40 minutos no prueban ausencia de cobro. Una consulta fallida o estado `processing` debe conservar la reserva en conciliación.
3. **Duplicación:** proveedor, Webhook, job y RPC requieren idempotencia independiente; resolver solo una capa deja efectos repetibles.
4. **Worker efímero:** Vercel no ofrece un proceso en memoria continuamente vivo; sin inbox/outbox y scheduler, los eventos pueden quedar sin procesar.
5. **Mezcla de ambientes:** el prefijo `APP_USR` puede aparecer en tokens de prueba y productivos; no sirve por sí solo para clasificar el ambiente. [MP-11, MP-10]
6. **Medios no permitidos:** Checkout Pro habilita todos los medios por defecto; una exclusión incompleta contradiría las reglas de negocio.

### Contradicciones o ambigüedades oficiales

- Preferences y Orders coexisten en la documentación, pero la referencia actual dirige nuevas integraciones a Orders API. El diseño debe escoger una y no mezclar DTOs, Webhooks o estados.
- La creación de Orders API menciona credenciales de prueba; la cancelación documenta una restricción distinta para sandbox. Debe probarse con la aplicación concreta.
- La documentación general de Webhooks habla de tópico `payment` para Checkout Pro clásico; la documentación nueva de Orders usa eventos/order. La ruta y conciliación deben seguir exclusivamente la API elegida.
- La página de Preferences señala limitaciones para notificaciones de pagos creados con credenciales de prueba, mientras las páginas de Webhooks ofrecen simulación. No debe asumirse entrega real hasta comprobarla.

### Preguntas no respaldadas por las fuentes consultadas

- Ventana oficial de tolerancia/replay para el timestamp de `x-signature` en Checkout Pro.
- Garantía de orden de entrega de eventos y estabilidad del ID de notificación entre reintentos.
- Límites exactos aceptados por `expiration_time`, incluido `PT40M`, para la cuenta argentina del cliente.
- Frecuencia y plazo máximo total de reintentos Webhook después del tercer intento.
- Disponibilidad exacta de tarifas, acreditación a 18 días y medios efectivos para la cuenta/provincia del cliente.
- Semántica completa de reintentos del comprador en Orders API y cómo interactúa con `config.online.retries` para este caso.
- SLA de conciliación, cuotas de API y límites operativos de la cuenta concreta.

Estas preguntas deben convertirse en pruebas sandbox, comprobaciones de cuenta o decisiones operativas; no deben rellenarse por inferencia.

## Frescura

- Fecha de acceso de todas las fuentes: **2026-09-17**.
- Mercado Pago y Supabase cambian con frecuencia. La propuesta debe fijar la API y versión de SDK, y repetir esta verificación antes del go-live.
- Vercel documenta 24.x como default actual y 22.x como soportado. El repositorio debe fijar 22.x si esa es su versión objetivo.
- Supabase documenta la deprecación de las claves legacy `anon`/`service_role` hacia fines de 2026. El repositorio ya usa `SUPABASE_SECRET_KEY`; debe confirmarse que sea la nueva `sb_secret_...` y no registrar su valor. [SB-01]

## Registro de fuentes oficiales

Todas las fuentes fueron accedidas el 2026-09-17.

| ID | Editor | Título | URL | Extracto breve | Claims |
|---|---|---|---|---|---|
| MP-01 | Mercado Pago | API de Checkout Pro: overview | https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-orders/overview | “Si estás comenzando una integración nueva, usa Orders API.” | C-01 |
| MP-02 | Mercado Pago | Crear y configurar una order de pago | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/create-order?scope=prod | Exige idempotencia por intento y devuelve `checkout_url`. | C-02 |
| MP-03 | Mercado Pago | Cancelar order por ID | https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro/cancel-order/post | Cancela orders no pagadas en estados permitidos. | C-03 |
| MP-04 | Mercado Pago | Excluir medios de pago | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/additional-settings/exclude-payment-methods?scope=prod | Configura `not_allowed_types` y `not_allowed_ids`. | C-04 |
| MP-05 | Mercado Pago | Estado de la order | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-management/status/order-status?scope=prod | Describe `created`, `processing`, `processed`, `failed` y cancelación. | C-05 |
| MP-06 | Mercado Pago | Webhooks | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/additional-content/notifications/webhooks | Firma, respuesta en 22 segundos, reintentos y consulta posterior. | C-06, C-07 |
| MP-07 | Mercado Pago | Configurar notificaciones de pago | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/payment-notifications?scope=prod | Configura evento y simulación para Orders API. | C-05, C-06 |
| MP-08 | Mercado Pago | Configurar URLs de retorno | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/web-integration/configure-back-urls?scope=prod | Los redirects representan success, failure o pending. | C-05 |
| MP-09 | Mercado Pago | Mantén tus credenciales seguras | https://www.mercadopago.com.ar/developers/es/docs/checkout-api-payments/best-practices/credentials-best-practices/secure-credentials?scope=prod | Access Token privado; rotación y sharing por Dashboard. | C-09 |
| MP-10 | Mercado Pago | Salir a producción | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-orders/go-to-production?scope=prod | Activa credenciales productivas, HTTPS y checklist. | C-10 |
| MP-11 | Mercado Pago | Cuentas de prueba | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/test-accounts | Vendedor y comprador del mismo país. | C-08 |
| MP-12 | Mercado Pago | Realizar compras de prueba | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases | Tarjetas y nombres simulan resultados. | C-08 |
| MP-13 | Mercado Pago | Validación opcional de notificaciones | https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders/optional-notifications | Documenta manifiesto y HMAC-SHA-256 constante. | C-06 |
| MP-14 | Mercado Pago | Crear preferencia | https://www.mercadopago.com.ar/developers/es/reference/online-payments/checkout-pro-preferences/create-preference/post | La referencia clásica solo exige Authorization. | C-01, C-02 |
| MP-15 | Mercado Pago | Cambiar fecha de vencimiento | https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/additional-settings/expiration-date | El vencimiento offline contempla compensación posterior. | C-05 |
| SB-01 | Supabase | API keys | https://supabase.com/docs/guides/getting-started/api-keys | Secret key solo en componentes controlados. | C-13 |
| SB-02 | Supabase | Row Level Security | https://supabase.com/docs/guides/database/postgres/row-level-security | `service_role` omite RLS; mantener server-side. | C-13 |
| SB-03 | Supabase | Cron | https://supabase.com/docs/guides/cron | `pg_cron` ejecuta SQL, funciones o HTTP. | C-14 |
| SB-04 | Supabase | JavaScript rollback / transacciones | https://supabase.com/docs/reference/javascript/using-modifiers-rollback | Para varias sentencias transaccionales, usar RPC. | C-13 |
| VE-01 | Vercel | Variables por ambiente | https://vercel.com/docs/environment-variables/manage-across-environments | Separa Production, Preview, Development y sensibles. | C-11 |
| VE-02 | Vercel | Versiones Node.js soportadas | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions | Vercel soporta Node 22.x. | C-11 |
| VE-03 | Vercel | Tareas asíncronas en Functions | https://vercel.com/kb/guide/troubleshooting-inconsistent-logs-in-vercel-functions | El trabajo posterior sigue sujeto al timeout. | C-12 |
| VE-04 | Vercel | Gestión de Cron Jobs | https://vercel.com/docs/cron-jobs/manage-cron-jobs | `CRON_SECRET`; Hobby ejecuta como máximo una vez al día. | C-12 |

## Estado de preparación

```yaml
research_complete: true
evidence_valid: true
research_outcome: done
preproposal_updated: false
preproposal_update_reason: this-run-authorized-only-external-research.md
product_decisions: pending
proposal_ready: false
next_action: orchestrator-reconciles-preproposal-and-confirms-orders-api-plus-operational-decisions
```

