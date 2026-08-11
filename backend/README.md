# Backend

API REST independiente de Margarita Arte & Deco. Requiere Node.js 22 o superior
y utiliza Express, TypeScript, Zod y el SDK oficial de Supabase.

## Estado de la Fase 7

La Fase 7 cubre exclusivamente la API pública y está completada. No existen rutas
`/api/admin`: la autenticación y autorización administrativa se incorporarán en
la Fase 8.5, y los endpoints administrativos se implementarán junto con el Panel
en la Fase 9.

El incremento 7.1 de solo lectura incluye:

- `GET /api/health`
- `GET /api/public/categories`
- `GET /api/public/products`
- `GET /api/public/settings`
- `GET /api/public/sitemap.xml`

Este incremento fue validado contra Supabase remoto el 2 de agosto de 2026 con
categorías, productos activos, Settings, logo y URLs firmadas de Storage.

El incremento 7.2 agrega:

- `GET /api/public/csrf-token`
- `POST /api/orders`
- creación o reutilización de Guest Session con token CSPRNG de 256 bits
- persistencia exclusiva del hash SHA-256 de la credencial
- cookie `__Host-mad-guest-session` con `HttpOnly`, `Secure`, `Path=/` y
  `SameSite=Lax`
- validación de `Origin`, signed double-submit CSRF y rate limiting específico
- invocación tipada de `create_order_with_stock`, que crea el pedido, descuenta
  stock, registra inventario y vincula la sesión atómicamente
- DTO de confirmación sin IDs internos, celular ni notas privadas

El incremento 7.3 agrega:

- `GET /api/public/orders/recent`
- `GET /api/public/orders/:orderNumber`
- `POST /api/public/orders/recover`
- `DELETE /api/public/guest-session`
- aislamiento obligatorio mediante `guest_session_orders`
- recuperación por número de pedido y celular normalizado, con respuesta genérica
- rotación atómica de la credencial y revocación de la sesión anterior
- rate limiting persistente por huellas HMAC de IP y pedido/celular
- señal adaptativa `captchaRequired` desde el tercer fallo y bloqueo de 30 minutos
  al quinto fallo dentro de una ventana de 15 minutos
- verificación adaptativa con Cloudflare Turnstile mediante Siteverify, validando
  token de uso único, acción `order_recovery` y hostname permitido
- purga diaria de sesiones e intentos vencidos mediante Supabase Cron

La integración visual del widget permanece diferida a la Fase 8. El Backend ya
rechaza recuperaciones que requieren CAPTCHA hasta recibir y validar un token
Turnstile correcto.

## Estado de las Fases 8.5 y 9

La Fase 8.5 incorpora autenticación y autorización administrativa mediante
Supabase Auth, cookies seguras y validación del perfil activo. El incremento 9.1
agrega el primer caso de uso del Panel:

- `GET /api/admin/dashboard`
- `GET /api/admin/products`
- `GET /api/admin/products/:productId/inventory`
- `POST /api/admin/products/:productId/inventory-adjustments`
- sesión y rol `administrator` obligatorios
- respuesta privada con `Cache-Control: no-store`
- resumen de catálogo, stock, clientes y pedidos
- ventas recientes sin teléfonos ni notas privadas

El umbral de stock bajo se obtiene de Settings y los pedidos cancelados no forman
parte de las ventas recientes.

El listado administrativo de productos admite `page`, `pageSize`, `search`,
`publication=all|active|inactive`, `stock=all|inStock|lowStock|outOfStock` y
`sort=newest|nameAsc|nameDesc|priceAsc|priceDesc|stockAsc|stockDesc`. Requiere
sesión y rol administrador, no se cachea y nunca devuelve `image_path` ni columnas
de baja lógica.

El historial de inventario se pagina, conserva el orden estable por fecha e ID y
expone la referencia al pedido o al administrador cuando corresponde. Cada ajuste
manual requiere dirección, cantidad entera positiva y motivo. La escritura exige
`Origin` permitido y token CSRF; el Backend toma el autor desde la sesión y delega
el cambio a `adjust_product_stock`, que bloquea el producto, impide stock negativo
y registra movimiento y auditoría en una sola transacción.

Las operaciones rápidas del catálogo son:

```text
PATCH  /api/admin/products/:productId/publication
PATCH  /api/admin/products/:productId/featured
DELETE /api/admin/products/:productId
```

Todas requieren sesión administrativa, `Origin`, CSRF y `expectedUpdatedAt`. La
activación valida que la categoría esté activa. El `DELETE` realiza baja lógica
actualizando únicamente `deleted_at`; conserva stock, imagen e historial y nunca
elimina físicamente el producto ni su objeto de Storage.

## Configuración local

1. Copiar `.env.example` como `.env`.
2. Configurar `SUPABASE_URL` y `SUPABASE_SECRET_KEY` con una clave secreta de
   servidor. Nunca utilizar esta clave en el Frontend ni versionarla.
3. Configurar `CORS_ALLOWED_ORIGINS` como una lista separada por comas, sin `/`
   final.
4. Configurar `SECURITY_HMAC_SECRET` con al menos 32 caracteres aleatorios. Es
   obligatorio en todos los entornos y debe ser independiente de la clave de
   Supabase.
5. Configurar `TURNSTILE_SECRET_KEY` exclusivamente en el Backend y
   `TURNSTILE_ALLOWED_HOSTNAMES` como una lista de hostnames sin esquema ni puerto.
6. Ejecutar `pnpm install` y `pnpm dev`.

Si `REDIS_URL` está configurada, el rate limiting utiliza Redis y se comparte
entre réplicas. Si no está configurada, el backend inicia con el Memory Store de
`express-rate-limit` y registra un warning indicando que el límite es local y no
distribuido. La creación de pedidos también exige un header `Idempotency-Key` único
por intento; los reintentos con la misma clave y sesión devuelven el pedido
original sin descontar stock nuevamente.

Las cookies del Backend conservan `Secure=true` en todos los entornos para
proteger el prefijo `__Host-`. Para desarrollo local se debe utilizar HTTPS
(por ejemplo, mediante un proxy HTTPS local); no se habilita una excepcion HTTP
que pueda llegar accidentalmente a produccion.

Para verificar la conexión real, los permisos de lectura y las URLs firmadas sin
mostrar credenciales:

```text
pnpm test:integration
```

Las URLs firmadas se generan en lotes, se reutilizan en memoria hasta antes de
su vencimiento y nunca se persisten. Una imagen que no pueda resolverse se
representa como `imageUrl: null`; el Frontend utilizará su placeholder local.

## Filtros públicos

Categorías:

- `catalogArea=art|decoration`

Productos:

- `catalogArea=art|decoration`
- `categorySlug=<slug>`
- `featured=true|false`
- `search=<texto>`
- `sort=featured|newest|name|priceAsc|priceDesc`
- `limit=1..100`

Los parámetros desconocidos o inválidos se rechazan con `400`.

## Crear un pedido con Postman

Esta prueba crea un pedido real y descuenta stock en Supabase.

1. Ejecutar `GET http://localhost:3000/api/public/csrf-token` con el header
   `Origin: http://localhost:5173`.
2. Copiar `data.csrfToken`. Postman debería conservar también la cookie
   `__Host-mad-csrf`; si no lo hace en HTTP local, agregar manualmente
   `Cookie: __Host-mad-csrf=<token>`.
3. Ejecutar `POST http://localhost:3000/api/orders` con `Content-Type:
   application/json`, el mismo `Origin` y `X-CSRF-Token: <token>`.
4. Enviar un UUID de producto activo que tenga stock:

```json
{
  "customer": {
    "firstName": "Ana",
    "lastName": "Pérez",
    "phone": "+54 9 11 2345-6789",
    "notes": ""
  },
  "items": [
    {
      "productId": "REEMPLAZAR_POR_UUID_REAL",
      "quantity": 1
    }
  ],
  "paymentMethod": "cash"
}
```

`paymentMethod` acepta `cash` o `transfer`. Una respuesta `201` incluye la
confirmación y establece la cookie anónima; la credencial nunca aparece en JSON.

## Consultar y recuperar pedidos con Postman

Postman debe conservar la cookie `__Host-mad-guest-session` recibida al crear el
pedido. Con esa cookie se puede ejecutar:

```text
GET http://localhost:3000/api/public/orders/recent
GET http://localhost:3000/api/public/orders/MAD-AAAAMMDD-NNNNNN
```

Para recuperar un pedido sin una sesión válida, primero obtener un token CSRF y
luego ejecutar `POST http://localhost:3000/api/public/orders/recover` con el
mismo `Origin`, cookie CSRF y header `X-CSRF-Token` usados al crear pedidos:

```json
{
  "orderNumber": "MAD-AAAAMMDD-NNNNNN",
  "phone": "+54 9 11 2345-6789"
}
```

Una coincidencia completa rota la sesión y entrega la nueva credencial solo en
una cookie `HttpOnly`. Para olvidar los pedidos del dispositivo se utiliza
`DELETE http://localhost:3000/api/public/guest-session` con Origin y CSRF.

Después del tercer fallo, la API responderá `captchaRequired: true`. Los intentos
siguientes deberán incluir `turnstileToken`, emitido por el widget con la acción
`order_recovery`. No es posible generar un token real únicamente desde Postman;
los tokens expiran a los cinco minutos y son de un solo uso.

## Validación

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

El endpoint público de Settings no expone alias, CBU, banco, umbral de stock ni
`logo_path`. Los datos bancarios se entregan exclusivamente en la confirmación
de un pedido por transferencia creado correctamente.
