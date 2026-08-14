# Plan de Remediacion de Seguridad

## Alcance

Este plan deriva de `SECURITY_AUDIT_PHASE1.md` y
`SECURITY_AUDIT_PHASE2.md`. Describe prioridades, orden, impacto y esfuerzo.
No implementa correcciones y no incluye la Fase 4 del SDD de auditoria.

## Prioridades

| Prioridad | Hallazgo | Impacto principal | Esfuerzo |
| --- | --- | --- | --- |
| P0 | BE-02 Proxy/IP | Bypass de limites por IP y controles de abuso | Bajo-Medio |
| P0 | BE-01 Rate limiting distribuido | Bypass entre replicas y reinicios | Medio |
| P0 | BE-03 Idempotencia de pedidos | Pedidos duplicados y sobreconsumo de stock | Alto |
| P1 | BE-04 Limites administrativos | Abuso de operaciones costosas o destructivas | Medio |
| P2 | BE-07 Endurecimiento de entorno | Reutilizacion de secretos y arranque inseguro | Bajo |
| P3 | BE-05 Cookies en desarrollo | Fallos locales y excepciones inseguras | Bajo |
| P3 | BE-06 Middleware de validacion | Inconsistencia arquitectonica y mantenimiento | Medio |

## Orden de implementacion

### 1. Normalizar la confianza en proxy y la identidad de cliente

- **Hallazgo:** BE-02.
- **Acciones:** reemplazar el booleano generico por una configuracion de
  proxies confiables; validar la topologia de despliegue; definir el
  comportamiento cuando la IP no pueda verificarse; agregar pruebas con
  `X-Forwarded-For` simple y multiple.
- **Impacto:** protege recuperacion, login y todos los limites basados en IP.
- **Esfuerzo:** Bajo-Medio, principalmente configuracion, middleware y pruebas.
- **Criterio de aceptacion:** una cabecera enviada por un cliente directo no
  cambia arbitrariamente la IP efectiva; el proxy aprobado conserva la IP real.

### 2. Migrar rate limiting a almacenamiento compartido

- **Hallazgo:** BE-01.
- **Acciones:** incorporar store Redis o equivalente; mantener limites separados
  para publico, pedidos, login y recuperacion; definir TTL y disponibilidad;
  observar eventos 429 sin registrar datos sensibles.
- **Impacto:** evita bypass por replicas y reinicios.
- **Esfuerzo:** Medio, incluyendo infraestructura, configuracion, pruebas y
  estrategia de degradacion.
- **Criterio de aceptacion:** los contadores se comparten entre instancias y no
  se reinician al reiniciar una instancia; una falla del store tiene politica
  fail-closed para recuperacion y login.

### 3. Implementar idempotencia transaccional de pedidos

- **Hallazgo:** BE-03.
- **Acciones:** aceptar una clave de idempotencia por intento; limitar formato y
  tamano; asociarla a Guest Session; persistir estado y respuesta necesaria;
  agregar unicidad y resolver reintentos dentro de la RPC o transaccion.
- **Impacto:** evita pedidos duplicados ante doble envio, timeout o reintento.
- **Esfuerzo:** Alto, porque requiere contrato HTTP, tipos, schema, repository,
  migracion/RPC, Service y pruebas de concurrencia.
- **Criterio de aceptacion:** la misma clave y sesion devuelven la confirmacion
  original; una clave usada con distinto payload se rechaza; solicitudes
  concurrentes no crean mas de un pedido.

### 4. Aplicar limites a operaciones administrativas

- **Hallazgo:** BE-04.
- **Acciones:** crear limites por administrador, IP y endpoint para uploads,
  inventario, cancelaciones, transiciones y Settings; usar el store compartido;
  registrar solo identificadores internos y resultado.
- **Impacto:** reduce abuso posterior al robo de una sesion administrativa.
- **Esfuerzo:** Medio.
- **Criterio de aceptacion:** cada familia sensible tiene limite documentado,
  respuestas consistentes y pruebas de autorizacion mas rate limiting.

### 5. Endurecer invariantes de entorno y secretos

- **Hallazgo:** BE-07.
- **Acciones:** exigir `SECURITY_HMAC_SECRET` dedicado; eliminar el fallback a
  la clave de Supabase; validar invariantes de produccion (origins, HTTPS,
  proxy y cookies); evitar asumir `development` fuera de ejecuciones locales
  explicitas.
- **Impacto:** reduce impacto de filtracion y errores de despliegue.
- **Esfuerzo:** Bajo.
- **Criterio de aceptacion:** un entorno de produccion incompleto falla al
  arrancar y nunca deriva secretos criptograficos entre dominios.

### 6. Definir estrategia segura de cookies para desarrollo

- **Hallazgo:** BE-05.
- **Acciones:** documentar HTTPS local como opcion preferida; si se habilita una
  excepcion para test, condicionarla estrictamente a `development`/`test` y
  rechazarla en produccion; cubrir login, CSRF y Guest Session.
- **Impacto:** evita fallos de desarrollo sin debilitar produccion.
- **Esfuerzo:** Bajo.
- **Criterio de aceptacion:** produccion siempre emite cookies Secure y los
  tests locales verifican el comportamiento elegido de forma explicita.

### 7. Extraer validacion a middleware

- **Hallazgo:** BE-06.
- **Acciones:** crear middleware reutilizable para body, params y query; mapear
  errores Zod al formato estandar; conservar schemas estrictos y mantener
  reglas de negocio en Services.
- **Impacto:** mejora consistencia y reduce duplicacion; no cambia la autoridad
  de validacion del backend.
- **Esfuerzo:** Medio por la cantidad de rutas.
- **Criterio de aceptacion:** todas las rutas declaran schemas en middleware,
  rechazan campos desconocidos segun contrato y conservan respuestas existentes.

## Dependencias y riesgos

- BE-01 debe resolverse antes de confiar en limites administrativos de BE-04.
- BE-02 debe resolverse antes de evaluar correctamente limites por IP.
- BE-03 puede requerir cambios coordinados en Frontend, API y base de datos.
- La migracion a un store compartido requiere decidir disponibilidad y politica
  de falla antes del despliegue.
- Ninguna correccion debe relajar autenticacion, CSRF, aislamiento de sesiones,
  transacciones de stock ni DTOs publicos.

## Verificacion posterior

Para cada incremento de remediacion:

- ejecutar `pnpm lint`;
- ejecutar `pnpm typecheck`;
- ejecutar `pnpm test`;
- ejecutar `pnpm build`;
- probar CORS, CSRF, cookies, expiracion, rotacion y revocacion;
- probar aislamiento entre sesiones y enumeracion de pedidos;
- probar concurrencia de checkout y limites tras reinicio y entre instancias;
- revisar que logs no contengan tokens, cookies, celulares, CBU ni alias.

## Fuera de alcance

La implementacion de cualquier correccion, migracion, cambio de dependencia o
ajuste de configuracion pertenece exclusivamente a la Fase 4 y no se realizo
en esta entrega.
