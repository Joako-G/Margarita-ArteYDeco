# Auditoria de Seguridad del Backend - Fase 1

## Alcance y metodo

Revision de solo lectura realizada sobre `backend/src`, la configuracion del
backend, sus pruebas y las migraciones SQL presentes en `supabase/migrations`.
Se excluyo `backend/dist` como artefacto generado. No se modifico codigo,
configuracion ni base de datos.

La revision cubrio arquitectura, estructura, middleware, rutas publicas y
privadas, autenticacion, autorizacion, validacion, variables de entorno,
Helmet, CORS, cookies y rate limiting.

## Arquitectura y estructura

La aplicacion se inicializa en `backend/src/app.ts` y sigue el flujo:

```text
Request -> Routes -> Middleware -> Controllers -> Services -> Repositories -> Supabase
```

La estructura observada es:

- `config`: entorno, logger, Supabase y dependencias.
- `routes`: health, API publica, pedidos y rutas administrativas.
- `middlewares`: seguridad, autenticacion administrativa, logging y errores.
- `controllers`: adaptacion HTTP por dominio.
- `services`: reglas de negocio y coordinacion de casos de uso.
- `repositories`: acceso a Supabase y Storage.
- `schemas`: validacion Zod.
- `types`: contratos de dominio y DTO.
- `utils`: cookies, errores, cache, slugs e imagenes.
- `tests`: pruebas unitarias y de API.

`app.ts:34-52` deshabilita `x-powered-by`, registra middleware global y monta
las rutas sin exponer acceso directo desde Controllers a Supabase.

## Rutas identificadas

### Publicas

- `GET /api/health` (`health.routes.ts`).
- `GET /api/public/categories`.
- `GET /api/public/products`.
- `GET /api/public/settings`.
- `GET /api/public/csrf-token`.
- `POST /api/orders`.
- `GET /api/public/orders/recent`.
- `GET /api/public/orders/:orderNumber`.
- `POST /api/public/orders/recover`.
- `DELETE /api/public/guest-session`.

Las operaciones publicas de escritura y recuperacion pasan por validacion de
origen, CSRF y los controles de frecuencia correspondientes. Las consultas de
pedidos requieren una Guest Session vigente.

### Privadas administrativas

Se montan bajo `/api/admin` en `app.ts:41-48`:

- `auth`: login, sesion, logout, perfil y CSRF administrativo.
- `dashboard`: resumen operativo.
- `products`: consulta, alta, edicion, imagen, publicacion, destacado,
  eliminacion logica e inventario.
- `categories`: consulta, alta, edicion, imagen, publicacion y eliminacion.
- `orders`: consulta, transiciones y cancelacion.
- `customers`: consulta, edicion y eliminacion logica.
- `settings`: consulta, edicion y logo.
- `profile`: consulta y cambios de perfil.

## Middleware y controles transversales

`app.ts:34-39` aplica, en orden, desactivacion de identificacion Express,
logging, Helmet, CORS y limite JSON de 32 KB.

`security.middleware.ts:15-19` habilita Helmet con
`crossOriginResourcePolicy: same-site`.

`security.middleware.ts:21-37` configura CORS con origins explicitos,
credenciales, metodos y headers permitidos. No acepta `*` junto con
credenciales.

`security.middleware.ts:40-92` define rate limiting separado para API publica,
creacion de pedidos y login administrativo. El limite usa el store en memoria
por defecto de `express-rate-limit`.

`security.middleware.ts:95-129` valida Origin y el token CSRF mediante double
submit firmado: el token del header debe coincidir con la cookie y pasar la
verificacion criptografica.

`request-logger.middleware.ts` y `error.middleware.ts` centralizan logging y
respuestas de error. La configuracion de logger evita registrar secretos,
tokens, cookies y datos sensibles en los puntos revisados.

## Autenticacion y autorizacion

La autenticacion administrativa se realiza contra Supabase Auth mediante
cookies HttpOnly. El middleware administrativo valida el access token, puede
renovar con refresh token y consulta el perfil persistido para verificar rol
`administrator` y estado activo. Los metadatos editables del usuario no son la
fuente de autorizacion.

Las rutas administrativas aplican autenticacion y autorizacion antes de sus
controllers. Las escrituras administrativas agregan Origin y CSRF. Las rutas
publicas de pedidos usan credenciales anonimas de alcance limitado y no reciben
el token en JSON.

## Validacion y manejo de datos

Los schemas Zod cubren cuerpos, parametros y queries por dominio. Se observan
validaciones de UUID, enumeraciones, paginacion, limites, URLs HTTPS,
normalizacion de telefonos, metodos de pago y carga de imagenes.

Los controllers ejecutan `schema.parse` y los Services coordinan las reglas de
negocio. La creacion de pedidos delega la operacion atomica de pedido, stock,
movimientos y asociacion de sesion a una RPC de Supabase.

## Variables de entorno

`backend/.env.example` y `src/config/env.ts` definen:

- entorno, puerto y `TRUST_PROXY`;
- origins CORS;
- URL y clave secreta de Supabase;
- limites publicos, de pedidos, login y recuperacion;
- secretos HMAC y Turnstile;
- TTL de URLs firmadas y cache publica;
- duracion de sesiones administrativas y hostnames Turnstile.

Zod valida tipos, rangos, URL de Supabase, origins y hostnames. En produccion
se exige `SECURITY_HMAC_SECRET`, aunque el valor interno usa la clave de
Supabase como fallback cuando no se define.

## Cookies

`utils/cookies.ts:3-12` usa nombres `__Host-`, `Path=/`, `SameSite=Lax` y
`Secure`. Las cookies de sesion de invitado y administrativas son HttpOnly. La
cookie CSRF no es HttpOnly porque debe ser leida por el cliente para enviarla en
el header. No se define `Domain`.

## Resultado de la Fase 1

La base presenta separacion de responsabilidades y controles de seguridad
relevantes. Los puntos que requieren analisis especifico en la Fase 2 son el
store del rate limiting, la confianza en `X-Forwarded-For`, la ausencia de
idempotencia explicita de pedidos, la cobertura de limites administrativos y
los defaults criptograficos y de cookies para desarrollo.
