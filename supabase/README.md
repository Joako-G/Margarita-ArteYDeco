# Supabase

Esta carpeta es la fuente oficial para los cambios de esquema administrados por
Supabase CLI.

La cadena fue enlazada y validada con Supabase CLI 2.113.0. Conviene conservar
una versión conocida de la CLI en automatizaciones para evitar diferencias de
comportamiento entre releases.

## Desarrollo local aislado

Docker Desktop debe estar iniciado. Desde la raíz del repositorio, el stack
local se administra con la versión fijada de la CLI:

```powershell
pnpm dlx supabase@2.113.0 start
pnpm dlx supabase@2.113.0 status
pnpm dlx supabase@2.113.0 stop
```

`start` crea contenedores y volúmenes locales, aplica las migraciones de esta
carpeta y no contacta un proyecto alojado. Studio queda disponible en
`http://127.0.0.1:54323` y la API local en `http://127.0.0.1:54321`.
La configuración desactiva Realtime, Edge Runtime, Analytics/Vector y el
protocolo S3 porque la aplicación actual no los consume. PostgreSQL, Auth,
Storage, REST, Studio y el correo local de pruebas permanecen habilitados.

El Backend usa `backend/.env.local` exclusivamente mediante los scripts
`dev:local`, `start:local` y `test:integration:local`. El Frontend carga
`frontend/.env.local` automáticamente al ejecutar Vite. Ambos archivos están
ignorados por Git; sus variantes `.env.local.example` documentan las variables
sin incluir claves reales. Los archivos `.env` existentes no se modifican.

Si se recrea el stack o cambian sus claves, se obtiene la clave local actual con:

```powershell
pnpm dlx supabase@2.113.0 status -o env
```

Luego se copia `SECRET_KEY` a `SUPABASE_SECRET_KEY` en
`backend/.env.local`. La clave es solo del stack local y nunca debe sustituir
una credencial desplegada.

Para iniciar la aplicación en dos terminales adicionales:

```powershell
Set-Location backend
pnpm dev:local
```

```powershell
Set-Location frontend
pnpm dev
```

No use `supabase link`, `db push` ni la opción `--linked` durante las pruebas
locales. Para reconstruir solamente la base local desde migraciones, use de
forma explícita `pnpm dlx supabase@2.113.0 db reset --local`.

## Migraciones

- Las migraciones viven exclusivamente en `migrations/`.
- Una migración nueva se crea con `supabase migration new <nombre>`.
- Antes de aplicar cambios se revisa `supabase db push --dry-run`.
- Staging debe validarse antes de aplicar la misma cadena en producción.
- No se modifica manualmente el historial de migraciones salvo una
  reconciliación expresamente revisada.

## Datos iniciales

Los seeds históricos permanecen en `../database/seeds/` como procedimientos
manuales para entornos controlados. La configuración de Supabase tiene el seed
automático deshabilitado y no crea usuarios, perfiles administrativos,
configuraciones del negocio, categorías ni productos.

Los usuarios administrativos se crean mediante Supabase Auth. Luego se inserta
el `profile` asociado usando exactamente el UUID generado por Auth.

El registro público por email está deshabilitado en `config.toml`. La aplicación
actual admite inicio de sesión y cambio de contraseña, pero no implementa el
callback necesario para completar invitaciones o recuperaciones de contraseña.

## Imágenes del catálogo

Los buckets privados `products` y `categories` conservan los MIME históricos para
que los objetos JPG, PNG, AVIF o WebP existentes continúen siendo legibles. No se
requiere una migración masiva ni una modificación de rutas.

Las escrituras nuevas pasan exclusivamente por el Backend: Sharp genera un WebP
de hasta 2 MB bajo `catalog/<entityId>/<uuid>.webp` antes de invocar Storage. La
lista amplia del bucket es compatibilidad de lectura y no habilita acceso directo
desde el Frontend.
