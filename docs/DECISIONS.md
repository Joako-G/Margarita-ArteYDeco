# DECISIONS.md

# Margarita Arte & Deco
## Architecture Decision Records (ADR)

Versión: 1.0

---

# Introducción

Este documento registra todas las decisiones importantes tomadas durante el desarrollo del proyecto.

Su propósito es evitar que futuros cambios modifiquen la arquitectura por desconocimiento.

Cada decisión debe incluir:

- Contexto
- Decisión
- Justificación
- Consecuencias

Toda nueva decisión deberá agregarse al final del documento.

Nunca eliminar decisiones anteriores.

Si una decisión cambia, registrar una nueva indicando que reemplaza a la anterior.

---

# ADR-001

## Arquitectura General

### Contexto

El proyecto comenzó como una Landing Page, pero el cliente necesita administrar productos, pedidos y clientes.

### Decisión

El sistema se desarrollará como un pequeño e-commerce con Landing comercial integrada.

### Justificación

Evita reescribir el proyecto cuando se agreguen nuevas funcionalidades.

Permite reutilizar la solución para futuros clientes.

### Consecuencias

La Landing y el Panel compartirán la misma API.

---

# ADR-002

## Stack Frontend

### Decisión

Frontend construido con:

- React
- TypeScript
- Vite

### Justificación

Excelente rendimiento.

Escalable.

Gran ecosistema.

---

# ADR-003

## Backend

### Decisión

Backend independiente utilizando:

Node

Express

TypeScript

### Justificación

Toda la lógica de negocio permanecerá fuera del frontend.

---

# ADR-004

## Base de Datos

### Decisión

Supabase PostgreSQL.

### Justificación

Permite:

Base de datos

Storage

Autenticación

Escalabilidad

RLS

---

# ADR-005

## Acceso a Datos

### Decisión

El Frontend nunca accederá directamente a Supabase.

### Justificación

Mayor seguridad.

Centralización de reglas.

Facilidad para migrar de proveedor.

---

# ADR-006

## Arquitectura

### Decisión

Arquitectura Feature First.

### Justificación

Reduce el acoplamiento.

Facilita mantenimiento.

---

# ADR-007

## Estado Global

### Decisión

Zustand.

TanStack Query.

### Justificación

Separar estado remoto de estado local.

---

# ADR-008

## Formularios

### Decisión

React Hook Form + Zod.

### Justificación

Validaciones tipadas.

Menor cantidad de renders.

---

# ADR-009

## Carrito

### Decisión

Persistir carrito utilizando Zustand Persist.

### Justificación

El usuario no perderá su compra al actualizar la página.

---

# ADR-010

## Diseño del Carrito

### Decisión

Drawer lateral.

No página independiente.

### Justificación

Mejor experiencia de usuario.

Menor cantidad de navegación.

---

# ADR-011

## Checkout

### Decisión

Checkout simple.

Solicitar únicamente:

Nombre

Apellido

Teléfono

Notas (opcional)

### Justificación

Reducir abandono.

---

# ADR-012

## Pasarela de Pago

### Decisión

No integrar Mercado Pago en el MVP.

### Justificación

Reducir complejidad.

Validar primero el flujo comercial.

---

# ADR-013

## Transferencia Bancaria

### Decisión

Permitir transferencia bancaria.

Mostrar:

Alias

CBU

Banco

Botón Copiar Alias

### Justificación

Proceso simple para el cliente.

---

# ADR-014

## Descuento

### Decisión

El descuento por transferencia será configurable.

No estará hardcodeado.

### Justificación

Cada negocio podrá modificarlo desde el Panel.

---

# ADR-015

## Stock

### Decisión

El stock no se descontará al agregar productos al carrito.

### Justificación

Evita bloquear stock innecesariamente.

---

# ADR-016

## Confirmación de Stock

### Decisión

El stock únicamente disminuirá cuando el pedido cambie a:

Pago recibido.

### Justificación

Evita inconsistencias.

---

# ADR-017

## Estados del Pedido

Estados oficiales:

Pending

Payment Pending

Paid

Preparing

Ready

Delivered

Cancelled

No podrán existir estados adicionales.

---

# ADR-018

## Productos

Los productos podrán estar:

Activo

Inactivo

Sin Stock

El frontend nunca mostrará productos inactivos.

---

# ADR-019

## Categorías

Las categorías serán administrables.

No estarán hardcodeadas.

---

# ADR-020

## Imágenes

Todas las imágenes se almacenarán en Supabase Storage.

No guardar imágenes en la base de datos.

---

# ADR-021

## Landing

La Landing tendrá prioridad comercial.

No parecerá un ecommerce tradicional.

Primero venderá inspiración.

Luego productos.

---

# ADR-022

## Panel Administrativo

Panel completamente separado de la Landing.

Compartir únicamente componentes reutilizables.

---

# ADR-023

## Responsive

Mobile First.

Desktop como mejora progresiva.

---

# ADR-024

## Seguridad

Toda validación deberá existir:

Frontend

Backend

Nunca confiar únicamente en el cliente.

---

# ADR-025

## Escalabilidad

La arquitectura deberá permitir incorporar:

- Mercado Pago
- Cupones
- Promociones
- Envíos
- Múltiples sucursales
- Múltiples administradores
- Clientes registrados

Sin modificar la estructura principal del proyecto.

---

# ADR-026

## Futuro

Todo el sistema deberá comportarse como un pequeño ERP comercial.

La Landing será únicamente una vista pública del sistema.

# ADR-027

## Arquitectura Frontend

### Contexto

El proyecto posee una Landing pública y un Panel Administrativo.

### Decisión

Se utilizará un único proyecto React con dos aplicaciones lógicas.

Public App

Admin App

Ambas compartirán únicamente componentes reutilizables.

### Justificación

Evita duplicar código.

Reduce mantenimiento.

Facilita compartir:

- Tipos
- Hooks
- Services
- Axios
- Design System

### Consecuencias

No existirán dos repositorios distintos.

Todo el proyecto vivirá dentro de una única aplicación.

---

# ADR-028

## Disponibilidad de productos en el MVP

### Contexto

Las ADR-015, ADR-016 y parte de ADR-018 asumían la administración de cantidades de stock. El MVP no administrará stock.

### Decisión

Esta decisión reemplaza las reglas de stock de ADR-015 y ADR-016, y elimina el estado "Sin Stock" de ADR-018 para el MVP.

Los productos tendrán únicamente estado Activo o Inactivo. Un producto activo se mostrará y podrá comprarse. Un producto inactivo no se mostrará ni podrá incluirse en pedidos nuevos. El Backend validará nuevamente este estado al crear cada pedido.

### Justificación

Permite que el administrador controle manualmente la disponibilidad sin introducir cantidades, reservas ni movimientos de inventario.

### Consecuencias

El modelo MVP no tendrá campo `stock`. Una implementación futura podrá agregar cantidades de inventario sin reemplazar `is_active`.

---

# ADR-029

## Control de stock desde el MVP

### Contexto

El catálogo contiene productos físicos y permite comprar múltiples unidades. Utilizar únicamente el estado Activo o Inactivo permitiría solicitar cantidades superiores a las disponibles.

### Decisión

Esta decisión reemplaza ADR-028 y vuelve a reemplazar las reglas originales de ADR-015 y ADR-016.

Cada producto tendrá `is_active` y `stock_quantity`. `is_active` controlará su publicación. Un producto activo con stock cero seguirá visible como "Sin stock", pero no podrá comprarse.

El stock se descontará de forma atómica al crear el pedido y se restaurará una sola vez cuando el pedido sea cancelado. Todo ajuste deberá generar un movimiento de inventario auditable.

### Justificación

Evita sobreventas, permite comprar varias unidades con una validación confiable y mantiene separadas la publicación y la disponibilidad real.

### Consecuencias

El Backend será la autoridad final del stock. El carrito no reservará unidades. El Panel Administrativo permitirá consultar, ajustar y auditar el inventario.

---

# ADR-030

## Experiencia de catálogo y compra del MVP

### Contexto

La tienda debe facilitar la exploración visual por categorías, permitir comprar varias unidades y completar pedidos sin registro ni pasarela de pago.

### Decisión

Las categorías se representarán mediante botones circulares con imagen de fondo. La selección se reflejará visualmente, mediante texto accesible y en la URL.

Cada ProductCard permitirá elegir una cantidad antes de agregarla. Agregar un producto mostrará confirmación sin abrir automáticamente el carrito. El carrito se presentará como Drawer y conducirá al checkout.

El checkout solicitará nombre, apellido y teléfono. Permitirá efectivo o transferencia con descuento configurable. El Backend calculará todos los importes. La logística se coordinará posteriormente por teléfono.

Los pedidos conservarán snapshots del cliente y nombres de productos para proteger el historial.

### Justificación

Reduce interrupciones durante la compra, mantiene un flujo simple para el cliente y permite al negocio operar sin integrar pagos o logística automática en el MVP.

### Consecuencias

Las categorías requieren imagen y orden administrable. El Panel deberá gestionar imágenes, stock, publicación y productos destacados. Mercado Pago, logística automatizada, promociones y cupones permanecen fuera del MVP.

---

# ADR-031

## Retiro exclusivo en el local

Estado: reemplazado por ADR-042.

### Contexto

El MVP no realizará envíos ni entregas a domicilio. Todos los pedidos serán retirados personalmente en el local.

### Decisión

Esta decisión reemplaza el estado final `Delivered` de ADR-017 por `PickedUp` y reemplaza la coordinación logística general indicada en ADR-030.

El checkout y la confirmación mostrarán la dirección configurada del local. No se solicitará dirección al cliente. El administrador marcará el pedido como `PickedUp` cuando sea retirado y el pago esté confirmado.

### Justificación

Refleja el funcionamiento real del negocio y evita solicitar datos o construir un flujo de envíos que no se utilizará en el MVP.

### Consecuencias

El sistema registrará `picked_up_at`. Para efectivo, el pago se confirmará al momento del retiro antes de marcar el pedido como retirado. Envíos y logística automatizada permanecen como mejoras futuras.

---

# ADR-032

## Ubicación del local en el flujo de compra

Estado: ampliado por ADR-042 para los pedidos con envío.

### Contexto

Todos los pedidos se retiran en el local y el cliente necesita conocer claramente dónde y cuándo puede retirarlos.

### Decisión

La dirección y los horarios se mostrarán antes de confirmar el pedido. La pantalla de confirmación mostrará además un botón para abrir la ubicación en Google Maps.

Dirección, horarios y URL de Google Maps serán administrables desde Settings y nunca estarán hardcodeados.

### Justificación

Evita confusiones después de la compra y permite que el negocio actualice su información de retiro sin desplegar una nueva versión.

### Consecuencias

Settings incorporará `maps_url` y `business_hours`. La API pública y la respuesta de confirmación expondrán únicamente la información necesaria para el retiro.

---

# ADR-033

## WhatsApp manual y datos de transferencia

### Contexto

El negocio necesita comunicarse con clientes y recibir comprobantes sin integrar WhatsApp Business API en el MVP.

### Decisión

El sistema utilizará enlaces `wa.me` con mensajes predefinidos y editables. El Panel ofrecerá "Contactar cliente", "Avisar que está listo" y "Recordar transferencia" según el estado del pedido.

Para pagos por transferencia, los datos bancarios se mostrarán directamente en la confirmación después de crear el pedido. WhatsApp se utilizará para enviar el comprobante, no como único medio para recibir alias, CBU o banco.

### Justificación

Permite operar sin costos, credenciales ni automatizaciones externas y evita que el flujo de pago dependa de que WhatsApp esté disponible.

### Consecuencias

El envío será manual. El sistema no conocerá el estado de entrega o lectura del mensaje y abrir WhatsApp no modificará pedidos ni pagos. WhatsApp Business API permanece como mejora futura.

---

# ADR-034

## Consulta de pedidos sin cuenta mediante sesión anónima

### Contexto

El cliente completa pedidos sin registrarse. La confirmación contiene información necesaria para pagar por transferencia y retirar el pedido, pero el estado local de React se pierde al recargar o cambiar de ruta. Depender de WhatsApp para volver a obtener alias, CBU, total o número de pedido contradice ADR-033 y las reglas de pago.

### Decisión

El Backend asociará cada pedido público a una sesión anónima de compra identificada mediante un token opaco de alta entropía. El navegador recibirá la credencial en una cookie host-only con prefijo `__Host-`, `HttpOnly`, `Secure`, `Path=/` y `SameSite=Lax`; la base de datos almacenará únicamente su hash y fecha de expiración.

La sesión tendrá una vigencia máxima de 30 días, será de solo lectura y permitirá consultar exclusivamente los pedidos vinculados. No utilizará Supabase Auth, no representará una cuenta y no concederá ningún permiso administrativo.

El Frontend utilizará una ruta `/pedido/:orderNumber` y recuperará la confirmación desde la API. Podrá conservar en `localStorage` únicamente el número del último pedido como pista no sensible; estados, importes, datos bancarios y credenciales procederán siempre del Backend.

Cuando la cookie no exista o haya expirado, el cliente podrá recuperar un pedido específico mediante número de pedido y celular. El Backend normalizará el celular, validará ambos datos, aplicará rate limiting y respuestas indistinguibles, y emitirá una nueva sesión únicamente después de una coincidencia completa. Si ya existe una sesión válida, vinculará el pedido y rotará su credencial. Un CAPTCHA se habilitará solo ante intentos sospechosos.

Los tokens no se incluirán en URLs. El cliente podrá ejecutar "Olvidar pedidos de este dispositivo" para invalidar su sesión local sin eliminar pedidos ni historial.

### Justificación

Permite recuperar la confirmación sin crear cuentas, evita exponer credenciales a JavaScript y mantiene al Backend como fuente oficial. También conserva WhatsApp como canal manual complementario y no como mecanismo obligatorio de recuperación.

### Consecuencias

La Fase 6 deberá incorporar sesiones anónimas y su relación con pedidos. La Fase 7 implementará cookies, hashing, expiración, endpoints públicos, rate limiting, recuperación e invalidación. La Fase 8 incorporará la ruta de pedido, "Ver mi último pedido", el formulario de recuperación y los estados de sesión expirada o bloqueada.

La infraestructura de sesión anónima será independiente de la autenticación administrativa de la Fase 8.5. El acceso desde otro dispositivo o después de borrar cookies requerirá recuperar el pedido con número y celular.

---

# ADR-035

## Persistencia de imágenes y privilegios de base de datos

### Contexto

El Frontend no puede acceder directamente a Supabase y las URLs firmadas de
Storage vencen. Persistir una URL firmada produciría referencias inválidas,
mientras que buckets públicos permitirían eludir al Backend. Además,
`service_role` posee capacidades amplias por defecto que permitirían modificar
stock o pedidos sin ejecutar las invariantes transaccionales.

### Decisión

Categories y Products almacenarán `image_path`, una ruta relativa dentro de un
bucket privado. El Backend resolverá URLs firmadas de corta duración o servirá el
archivo mediante un endpoint controlado.

Todas las tablas de negocio tendrán RLS habilitado y denegarán acceso directo a
`anon` y `authenticated`. `service_role` utilizará privilegios mínimos por tabla.
No podrá modificar directamente stock, detalles históricos ni pedidos. La
creación y cancelación de pedidos, los ajustes de inventario y las transiciones
de estado se ejecutarán mediante RPC `SECURITY DEFINER`, con `search_path` vacío
y permisos de ejecución explícitos.

### Justificación

Mantiene al Backend como única frontera de acceso, evita URLs persistidas que
expiran y reduce el impacto de errores futuros en repositories. Las invariantes
de stock, historial y estados se conservan aunque una capa superior intente una
operación incompleta.

### Consecuencias

La API deberá generar o renovar URLs de imagen y aplicar una política de caché
compatible con su vencimiento. Cada nueva tabla o función requerirá privilegios
explícitos; no heredará acceso automático para roles públicos ni para
`service_role`.

---

# ADR-036

## Arte y Decoraciones como áreas fijas del catálogo

### Contexto

El negocio vende tanto materiales y objetos sin terminar como piezas intervenidas
y terminadas. Una categoría plana llamada "Deco" no permite comunicar ni
administrar correctamente esta diferencia.

### Decisión

Categories incorporará `catalog_area`, limitado a `art` y `decoration`. Products
continuará relacionado únicamente mediante `category_id` y heredará el área de
su categoría. La Landing mostrará ambos grupos de categorías como primer contenido
y eliminará Hero, Inspiración, Galería y Nosotros.

### Justificación

El modelo evita duplicar datos, mantiene simples los filtros y hace explícita la
diferencia entre productos sin terminar y productos listos para usar o regalar.

### Consecuencias

La Fase 6 incorpora una migración incremental y seeds actualizados. Backend,
administración y frontend deberán exponer, validar y filtrar por área.

---

# ADR-037

## Logo de marca administrable desde Settings

### Contexto

El Header y el Footer utilizan la misma identidad visual, pero el logo estaba
acoplado exclusivamente a un asset del Frontend. El negocio necesita poder
reemplazarlo sin publicar una nueva versión de la aplicación y sin permitir que
el Frontend acceda directamente a Supabase.

### Decisión

Settings incorporará `logo_path`, nullable, con una ruta relativa dentro del
bucket privado `settings`. El Backend resolverá una URL temporal o servirá el
archivo y expondrá únicamente `logoUrl` en el DTO público. Header y Footer usarán
esa URL y conservarán `logo-header.png` como respaldo local.

### Justificación

Mantiene una única fuente configurable para la marca, conserva la frontera
Frontend → Backend → Supabase y evita persistir URLs firmadas que vencen.

### Consecuencias

El Panel Administrativo deberá permitir cargar, reemplazar y quitar el logo. La
ausencia o el fallo de la imagen remota no afectará la navegación porque el asset
local continuará disponible como fallback.

---

# ADR-038

## Cloudflare Turnstile como verificación humana adaptativa

### Contexto

La recuperación pública utiliza número de pedido y celular, por lo que necesita
encarecer ataques automatizados distribuidos sin interrumpir a compradores en el
primer intento. El rate limiting persistente continúa siendo obligatorio, pero
no reemplaza una señal de navegador ante abuso.

### Decisión

El sistema utilizará Cloudflare Turnstile en modo administrado únicamente cuando
el Backend indique `captchaRequired`. El Frontend emitirá tokens con la acción
`order_recovery`; el Backend los validará mediante Siteverify y comprobará
resultado, acción y hostname permitido antes de consultar el pedido.

La clave secreta residirá exclusivamente en el Backend. Los errores internos o
timeouts del proveedor producirán un fallo cerrado temporal y no incrementarán
los intentos del comprador. Los tokens inválidos, vencidos o repetidos no
permitirán continuar y sí conservarán la protección antiabuso.

### Justificación

Turnstile agrega defensa en profundidad con una experiencia poco invasiva,
mantiene la verificación sensible fuera del navegador y ofrece claves oficiales
de prueba para automatizar casos exitosos y fallidos.

### Consecuencias

El Backend incorpora Axios para Siteverify y requiere `TURNSTILE_SECRET_KEY` y
`TURNSTILE_ALLOWED_HOSTNAMES` en producción. La Fase 8 agregará la sitekey pública,
el widget adaptativo y la política CSP necesaria para los scripts y frames de
Cloudflare.

---

# ADR-039

## Separación temporal de la API pública y la API administrativa

### Contexto

La Fase 7 originalmente enumeraba módulos administrativos, mientras que el
roadmap ubicaba Supabase Auth, JWT y autorización en la Fase 8.5 y el Panel en la
Fase 9. Implementar rutas administrativas antes de su infraestructura de
seguridad permitiría exponerlas accidentalmente o producir código sin una forma
real de validar autorización.

### Decisión

La Fase 7 queda limitada a la API pública. La Fase 8.5 implementará autenticación,
autorización y endpoints estrictamente relacionados con la sesión y el perfil
administrativo. La Fase 9 implementará conjuntamente los casos de uso, endpoints
`/api/admin` y pantallas de cada módulo administrativo.

No se crearán rutas administrativas anticipadamente para mantenerlas desmontadas
ni se habilitarán excepciones temporales sin JWT y rol administrativo válido.

### Justificación

Mantiene una única frontera de seguridad verificable, evita endpoints huérfanos
y permite probar Backend y Frontend administrativo como una unidad funcional
detrás de los mismos middlewares.

### Consecuencias

Finalizar la Fase 7 habilita la integración pública de la Fase 8. Los módulos de
productos, categorías, inventario, pedidos, clientes, Settings y Storage
administrativo comenzarán recién después de completar la Fase 8.5.

---

# ADR-040

## Sesión administrativa mediada por el Backend

### Contexto

El Frontend requiere persistir una sesión de Supabase Auth sin acceder a
Supabase, almacenar JWT en Web Storage ni confiar en metadatos editables para
autorizar el Panel Administrativo.

### Decisión

El Backend es el único cliente de Supabase. Después del password grant conserva
el access token y el refresh token en cookies `__Host-`, `HttpOnly`, `Secure`,
`SameSite=Lax` y `Path=/`. El navegador solo recibe el perfil público. Cada
acceso privado valida la identidad mediante Supabase Auth y autoriza consultando
el perfil activo y su rol `administrator` en PostgreSQL. Una sesión con access
token vencido puede renovarse mediante su refresh token y rota ambas cookies.

Login y logout requieren Origin permitido y token CSRF. El login aplica límite
de intentos fallidos y devuelve un mensaje indistinguible para correo inexistente,
contraseña incorrecta, perfil ausente o perfil inactivo. El logout revoca solo la
sesión actual y limpia siempre las cookies locales.

### Consecuencias

El Frontend no conoce ni persiste JWT. La autorización puede revocarse mediante
`profiles.is_active` sin desplegar código. Los futuros endpoints de la Fase 9
deberán reutilizar los mismos middlewares de autenticación y rol antes de sus
controllers.

---

# ADR-041

## Optimización WebP del catálogo compatible con Vercel

### Contexto

El Backend está desplegado en Vercel, cuyo límite de cuerpo para Functions impide
que un original de 10 MB llegue sin transformación. Las imágenes de productos y
categorías deben continuar atravesando el Backend y Supabase Storage debe seguir
siendo privado.

### Decisión

El Panel aceptará originales estáticos JPG, PNG o WebP de hasta 10 MB. Cuando un
archivo supere 4 MB, el navegador preparará una variante WebP proporcional antes
de enviarla. La API rechazará cuerpos de catálogo mayores a 4 MB y, con
independencia del trabajo realizado en el cliente, decodificará nuevamente la
imagen con Sharp, validará formato, firma, animación y un máximo de 40
megapíxeles, aplicará autoorientación y generará el objeto WebP definitivo.

Los productos tendrán un máximo de 1600 px y las categorías de 1200 px, siempre
con `fit: inside`, sin recorte ni ampliación, calidad 82 y salida máxima de 2 MB.
Las rutas conservarán `catalog/<entityId>/<uuid>.webp`. El reemplazo subirá el
nuevo objeto, persistirá la ruta con concurrencia optimista y solo entonces
intentará retirar el objeto anterior. Las imágenes históricas JPG, PNG o WebP
seguirán siendo legibles; no se realizará una migración masiva.

### Consecuencias

El cliente reduce el transporte pero no constituye una frontera de confianza. El
Backend garantiza que todo objeto nuevo del catálogo sea WebP y nunca expone
credenciales ni acceso directo a Supabase. Los buckets pueden conservar sus MIME
históricos para compatibilidad, mientras la escritura administrativa queda
normalizada por la API.

---

# ADR-042

## Retiro en el local y envío coordinado en el MVP

### Contexto

El negocio necesita ofrecer envíos dentro del MVP sin incorporar un sistema de
logística. ADR-031 había limitado todos los pedidos al retiro en el local.

### Decisión

Esta decisión reemplaza ADR-031 y amplía ADR-032. El checkout permitirá elegir
entre retiro en el local y envío a coordinar. El retiro conservará la dirección,
los horarios y la ubicación del local. El envío requerirá una dirección y se
coordinará manualmente por WhatsApp; el sistema no calculará costos ni gestionará
transportistas, fechas, seguimiento o números de guía.

El estado `ready` se mostrará como "Listo", porque es común a ambos métodos. El
estado final será `picked_up` para retiro y `delivered` para envío. En el MVP, el
pago en efectivo se ofrecerá únicamente para retiro y el envío utilizará
transferencia.

### Consecuencias

La confirmación pública y el detalle administrativo mostrarán el método y los
datos de entrega correspondientes. Los mensajes de WhatsApp para un pedido listo
se adaptarán al método de entrega. La coordinación y el costo del envío seguirán
fuera del total y de la automatización del sistema.

---

# ADR-043

## Indexación SEO de la SPA en Vercel

### Contexto

La aplicación pública utiliza React Router y Vite. Un rewrite global a
`index.html` hacía que rutas privadas, URLs inexistentes y `/sitemap.xml`
recibieran inicialmente el mismo HTML indexable con estado 200. Los metadatos
correctos dependían por completo de la ejecución de JavaScript.

### Decisión

El origen canónico se configurará mediante `VITE_SITE_URL` en el Frontend y
`PUBLIC_SITE_URL` en el Backend. El build generará shells HTML para inicio,
catálogo, páginas legales, categorías y áreas privadas sin incorporar SSR ni una
dependencia de gestión del `head`. Las rutas privadas tendrán `noindex` tanto en
el shell como mediante `X-Robots-Tag`.

Vercel reescribirá únicamente las rutas reales; cualquier otra URL conservará un
404 HTTP. `/index.html` redirigirá permanentemente a `/` y las rutas se
normalizarán sin barra final. El Backend generará un
sitemap XML cacheable con las rutas públicas fijas y las categorías activas, y
el dominio público lo expondrá como `/sitemap.xml`. `robots.txt` permitirá el
rastreo para que los buscadores puedan procesar `noindex` y declarará el sitemap.

### Consecuencias

Las páginas públicas fijas entregarán título, descripción, canonical, Open Graph
y Twitter Cards antes de ejecutar React. Las categorías tendrán un shell genérico
y completarán su metadata individual con los datos públicos del catálogo. Las
rutas de pedidos, checkout y administración no dependerán únicamente de
JavaScript para impedir la indexación. Cambiar al futuro dominio `.com` requerirá
actualizar las dos variables de entorno y desplegar Frontend y Backend.
