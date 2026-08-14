# Auditoria de Seguridad del Backend - Fase 2

## Alcance

Auditoria de solo lectura sobre el codigo fuente del backend y las migraciones
disponibles. No se corrigio ningun hallazgo. Las lineas corresponden al estado
revisado de los archivos indicados.

## Resumen

No se encontro evidencia directa de SQL Injection, NoSQL Injection, Command
Injection, SSRF controlable por usuario, Path Traversal, XSS server-side,
exposicion de tokens en JSON, almacenamiento de sesiones anonimas en texto
plano ni bypass directo de autorizacion administrativa.

## Hallazgos

### BE-01 - Rate limiting no distribuido

- **Riesgo:** High
- **Evidencia:** `backend/src/middlewares/security.middleware.ts:40-92` crea
  `rateLimit` sin `store`, `keyGenerator` ni persistencia compartida.
- **Archivo:** `backend/src/middlewares/security.middleware.ts:43-55`,
  `:61-73` y `:79-92`.
- **Explicacion:** `express-rate-limit` usa almacenamiento en memoria por
  defecto. Los contadores se pierden al reiniciar el proceso y no se comparten
  entre replicas. Un despliegue horizontal permite repartir solicitudes entre
  instancias y superar los limites de API, pedidos o login.
- **Recomendacion:** Incorporar un store compartido como Redis, conservar
  limites separados por operacion y probar reinicios y multiples instancias.

### BE-02 - Confianza amplia en proxy para identificar IP

- **Riesgo:** High
- **Evidencia:** `backend/src/app.ts:35` configura `trust proxy` en `1` cuando
  `TRUST_PROXY=true`; `public-orders.controller.ts:86` usa `request.ip` para
  controles de recuperacion.
- **Archivo:** `backend/src/app.ts:35`,
  `backend/src/config/env.ts:32` y
  `backend/src/controllers/public-orders.controller.ts:86`.
- **Explicacion:** Si el proceso es accesible sin un proxy confiable, o la
  topologia no coincide con esa configuracion, un atacante puede influir en la
  cadena `X-Forwarded-For`. Esto puede alterar la huella de IP y el rate limit
  de recuperacion.
- **Recomendacion:** Aceptar solo proxies o rangos de red explicitamente
  confiables, documentar la topologia y probar cadenas de forwarding maliciosas.

### BE-03 - Falta de idempotencia en creacion de pedidos

- **Riesgo:** High
- **Evidencia:** `orders.routes.ts:20-26` no exige `Idempotency-Key`.
  `orders.service.ts:58-78` crea una nueva operacion en cada solicitud y
  delega a `createWithStock` sin deduplicar el intento.
- **Archivo:** `backend/src/routes/orders.routes.ts:20-26`,
  `backend/src/services/orders.service.ts:58-78`.
- **Explicacion:** Un doble click o timeout posterior a una respuesta exitosa
  puede generar dos pedidos validos y descontar stock dos veces. El rate limit
  limita frecuencia, pero no distingue reintentos legitimos del mismo checkout.
- **Recomendacion:** Exigir una clave de idempotencia por intento, persistirla
  asociada a la Guest Session y resolver clave, pedido y respuesta dentro de la
  misma transaccion o RPC con restriccion unica.

### BE-04 - Sin limites especificos para operaciones administrativas

- **Riesgo:** Medium
- **Evidencia:** Las rutas administrativas revisadas aplican autenticacion,
  rol, Origin y CSRF, pero no un rate limit especifico para uploads, ajustes de
  inventario, cambios de configuracion, transiciones o cancelaciones. Ejemplos:
  `admin-products.routes.ts:32-65`, `admin-categories.routes.ts:33-53` y
  `admin-settings.routes.ts:33-43`.
- **Archivo:** Los tres archivos anteriores y rutas administrativas de pedidos
  e inventario.
- **Explicacion:** Una sesion administrativa comprometida puede repetir
  operaciones costosas o destructivas sin proteccion de frecuencia por usuario,
  IP y endpoint. El limite de 5 MB por imagen no limita la cantidad de uploads.
- **Recomendacion:** Agregar limites distribuidos por administrador, IP y tipo de
  operacion; usar umbrales mas estrictos para uploads, stock, cancelaciones y
  configuracion; registrar rafagas anormales.

### BE-05 - Cookies Secure incompatibles con HTTP local

- **Riesgo:** Medium
- **Evidencia:** `utils/cookies.ts:8-12` fija `secure: true` para CSRF, Guest
  Session y cookies administrativas, sin distinguir `NODE_ENV`.
- **Archivo:** `backend/src/utils/cookies.ts:8-12`.
- **Explicacion:** En `http://localhost` el navegador no enviara estas cookies
  como en un entorno HTTPS. Esto rompe sesiones y CSRF en desarrollo y puede
  inducir excepciones manuales inseguras.
- **Recomendacion:** Mantener `Secure=true` obligatoriamente en produccion y
  definir una estrategia explicita para desarrollo/test, preferentemente HTTPS
  local. Validar que nunca se desactive en produccion.

### BE-06 - Validacion acoplada a Controllers

- **Riesgo:** Low
- **Evidencia:** `orders.controller.ts:23` y controllers administrativos
  ejecutan directamente `schema.parse(request.body)` en lugar de recibir datos
  ya validados por middleware.
- **Archivo:** `backend/src/controllers/orders.controller.ts:23-40` y
  `backend/src/controllers/admin-products.controller.ts:22-176` como ejemplos.
- **Explicacion:** La validacion existe y no constituye un bypass por si misma,
  pero se aparta del flujo del SDD (`Route -> Validation Middleware ->
  Controller`) y dificulta uniformidad, reutilizacion y pruebas transversales.
- **Recomendacion:** Crear middleware generico para body, params y query,
  mantener schemas Zod centralizados y dejar al Controller la adaptacion HTTP.

### BE-07 - Defaults de entorno y separacion criptografica insuficientes

- **Riesgo:** Low
- **Evidencia:** `env.ts:16` usa `development` por defecto; `env.ts:27` hace
  opcional `SECURITY_HMAC_SECRET`; `env.ts:37-43` solo lo exige en produccion;
  `env.ts:151` usa `SUPABASE_SECRET_KEY` como fallback HMAC.
- **Archivo:** `backend/src/config/env.ts:16`, `:27`, `:37-43` y `:151`.
- **Explicacion:** Una configuracion incompleta puede iniciar con un entorno no
  previsto y reutilizar una credencial de Supabase para CSRF y huellas HMAC.
  Mezclar dominios criptograficos aumenta el impacto de una filtracion y reduce
  la claridad operacional.
- **Recomendacion:** Exigir un secreto HMAC dedicado fuera de tests, fallar ante
  invariantes de produccion y no reutilizar la clave de Supabase para otros
  propositos.

## Matriz de categorias revisadas

- **Broken Authentication:** no se observo bypass directo; persisten riesgos
  operativos asociados a BE-01, BE-02 y BE-07.
- **Broken Authorization / IDOR / Privilege Escalation:** no se observo acceso
  administrativo sin middleware ni consulta publica fuera de la sesion asociada.
- **CSRF:** hay validacion de Origin, cookie y header; no se observo bypass en
  el flujo revisado.
- **SSRF:** no se observo URL controlable usada para solicitudes arbitrarias;
  las URLs de configuracion se validan como HTTPS.
- **XSS:** no se encontro renderizado HTML ni reflejo server-side de entrada.
- **SQL/NoSQL/Command Injection:** acceso encapsulado en repositorios y RPC;
  no se encontro concatenacion peligrosa en la superficie revisada.
- **Path Traversal / File Upload:** rutas de Storage generadas por UUID y
  validacion de tipo, firma y tamano; no se observo traversal.
- **Race Conditions:** stock y cancelacion usan operaciones transaccionales;
  BE-03 deja riesgo funcional de pedidos duplicados.
- **Session Fixation:** rotacion y revocacion de sesiones anonimas presentes;
  cookies no exponen tokens en JSON.
- **Information Disclosure / Secrets Exposure:** no se observaron secretos o
  datos bancarios en DTO publico; revisar BE-07 en despliegue.
- **Rate Limiting Bypass:** BE-01 y BE-02.
- **Business Logic Flaws:** BE-03; las RPC mantienen la autoridad sobre precios,
  stock y totales.
