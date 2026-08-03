# Base de datos

La base de datos usa PostgreSQL administrado por Supabase. Los cambios se aplican
exclusivamente mediante los archivos versionados de `migrations/`, en orden
lexicográfico.

## Orden de aplicación

1. Ejecutar las migraciones.
2. Ejecutar los seeds únicamente en un entorno nuevo y controlado.
3. Crear el usuario administrador mediante Supabase Auth.
4. Insertar su `profile` usando el UUID generado por Auth.
5. Subir las imágenes a los buckets privados antes de activar categorías o
   productos.

No se incluyen contraseñas, tokens, claves de servicio ni un usuario de Auth en
el repositorio. El backend de la fase 7 será el único consumidor autorizado del
esquema y de Storage.

## Convenciones de seguridad

- `image_path` guarda una ruta de objeto, no una URL pública.
- Los hashes de sesión son binarios SHA-256 de 32 bytes.
- Los RPC sensibles se revocan para `PUBLIC`, `anon` y `authenticated`.
- Las tablas no se consultan directamente desde el frontend.
- Los logs de auditoría no deben incluir tokens, cookies, celulares, datos
  bancarios ni otros secretos en `metadata`.

## Validación de la Fase 6

El 29 de julio de 2026 se ejecutaron desde cero las tres migraciones y dos
aplicaciones consecutivas del seed sobre una instancia PostgreSQL 17 embebida y
descartable.

Resultados:

1. Se crearon 11 tablas y las 11 quedaron protegidas con RLS.
2. Los roles `anon` y `authenticated` no pudieron consultar tablas de negocio.
3. `service_role` no pudo modificar stock directamente.
4. Se crearon los cuatro buckets privados con límites de tamaño y MIME types.
5. Los 27 productos y las nueve categorías iniciales se cargaron de forma
   idempotente e inactiva.
6. Una compra por transferencia calculó importes en servidor, descontó stock y
   vinculó la sesión dentro de la misma transacción.
7. Una transición inválida fue rechazada.
8. Dos cancelaciones consecutivas restauraron stock una sola vez.
9. Inventory Movements rechazó modificaciones posteriores.
10. La vinculación de recuperación fue idempotente.
11. La purga eliminó la sesión y su relación sin eliminar el pedido.
12. Dos intentos sobre la última unidad aceptaron solo uno y el stock terminó en
    cero.

PGlite no distribuye el archivo de extensión `pgcrypto`, por lo que durante esta
prueba se omitió exclusivamente la sentencia `CREATE EXTENSION`. La migración
real conserva esa sentencia porque Supabase incluye `pgcrypto`. El esquema no
depende de otras funciones exclusivas de la extensión: `gen_random_uuid()` forma
parte del núcleo de las versiones actuales de PostgreSQL.

La aplicación sobre un proyecto Supabase remoto será una operación de
infraestructura y despliegue posterior; no modifica el diseño validado de esta
fase.

## Validación de la Fase 6.1

El 31 de julio de 2026 se validó la migración incremental de áreas del catálogo
junto con el esquema, las reglas de integridad y dos ejecuciones consecutivas del
seed sobre PostgreSQL embebido. La migración de seguridad y Storage no cambió y
conserva la validación de la Fase 6.

Resultados:

1. Se cargaron 8 categorías de Arte y 4 de Decoraciones.
2. Se cargaron 29 productos sin duplicados después de ejecutar el seed dos veces.
3. El constraint rechazó valores diferentes de `art` y `decoration`.
4. El trigger impidió cambiar el área de una categoría con productos asociados.
