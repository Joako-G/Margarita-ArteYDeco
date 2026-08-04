# ADMIN-SDD.md

# Margarita Arte & Deco

## Administration Software Design Document

Versión: 1.0

---

# Objetivo

Este documento define el comportamiento funcional del Panel Administrativo.

El Panel Administrativo representa el BackOffice del sistema.

Toda funcionalidad administrativa deberá respetar este documento.

La implementación corresponde a la Fase 9 e incluye tanto la interfaz como los
endpoints administrativos requeridos por cada módulo. Depende obligatoriamente
de la autenticación, validación JWT y autorización implementadas en la Fase 8.5.
La Fase 7 no implementará rutas ni casos de uso administrativos.

---

# Relación con las Reglas de Negocio

El Panel Administrativo deberá permitir únicamente operaciones que respeten las reglas definidas en `BUSINESS-RULES.md`.

El Panel no podrá ofrecer acciones que permitan incumplir dichas reglas.

Toda validación realizada en la interfaz deberá complementarse con la validación correspondiente en el Backend.

---

# Objetivo del Panel

Permitir al administrador gestionar completamente el comercio sin necesidad de modificar la Base de Datos manualmente.

El Panel deberá ser simple.

Claro.

Rápido.

Orientado al uso diario.

---

# Acceso

El Panel únicamente será accesible mediante:

```
/admin

/admin/login
```

Todo acceso requerirá autenticación.

Nunca existirán enlaces visibles desde la Landing.

---

# Roles

Versión MVP

Existe un único rol.

Administrador.

El Administrador posee acceso completo.

No existirán permisos parciales.

---

# Layout

Todo el Panel utilizará un único AdminLayout.

El Layout contendrá:

- Sidebar
- Header
- Área de contenido
- Breadcrumb
- Perfil
- Logout

La navegación deberá ser consistente en todas las pantallas.

---

# Dashboard

Objetivo

Mostrar un resumen rápido del estado del negocio.

Información mínima

- Productos activos
- Productos sin stock
- Productos con stock bajo
- Categorías
- Clientes registrados
- Pedidos pendientes
- Pedidos completados
- Ventas recientes

El Dashboard nunca reemplaza a los módulos específicos.

---

# Productos

Objetivo

Administrar el catálogo.

Funcionalidades

- Crear
- Editar
- Visualizar
- Activar
- Desactivar
- Consultar stock disponible
- Establecer stock inicial
- Ajustar stock con un motivo obligatorio
- Filtrar productos con stock y sin stock
- Consultar el historial de movimientos
- Eliminar lógicamente
- Buscar
- Filtrar

Formulario de producto

- Categoría obligatoria
- Imagen opcional con vista previa y respaldo visual cuando no exista
- Nombre
- Descripción
- Precio mayor a cero
- Stock entero mayor o igual a cero
- Estado Activo o Inactivo
- Producto destacado

El slug se generará a partir del nombre y deberá ser único. Las imágenes aceptadas serán JPG, PNG o WebP, con un tamaño máximo de 5 MB. Un producto podrá guardarse sin imagen y mostrará el respaldo visual del Frontend. El Backend repetirá todas las validaciones.

No permitir eliminación física.

El estado Activo controla la publicación y no modifica el stock. Un producto activo con stock cero seguirá publicado como "Sin stock". Nunca permitir valores negativos.

El listado ofrecerá acciones rápidas visibles para activar, desactivar y cambiar
el estado destacado. La baja lógica será una acción separada y destructiva que
siempre requerirá confirmación; la interfaz deberá aclarar que conserva stock,
imagen e historial de ventas. Las acciones se bloquearán mientras exista una
mutación pendiente para el mismo producto.

---

# Categorías

Objetivo

Administrar las categorías del catálogo.

Funcionalidades

- Crear
- Editar
- Reordenar
- Activar
- Desactivar
- Eliminar lógicamente

Formulario de categoría

- Área del catálogo obligatoria: Arte o Decoraciones
- Nombre
- Imagen
- Descripción
- Orden de visualización
- Estado Activo o Inactivo

No eliminar categorías con productos asociados.

El listado permitirá filtrar por área y ordenará las categorías dentro de cada
área. No se permitirá cambiar el área de una categoría con productos asociados.
El formulario de producto agrupará las opciones de categoría por área, pero el
producto almacenará únicamente `category_id`.

El alta se realizará en dos pasos seguros: primero se creará la categoría inactiva
y luego se cargará la imagen. La activación solo se permitirá cuando exista una
imagen real en el bucket privado `categories`. Si la carga falla, la categoría
continuará inactiva y podrá editarse para reintentarla.

La edición, publicación y baja lógica utilizarán la fecha de actualización como
control de concurrencia. La baja preservará la imagen y requerirá confirmación
explícita. El orden será un entero no negativo, estable dentro de cada área.

---

# Clientes

Objetivo

Consultar y administrar clientes.

Funcionalidades

- Buscar
- Editar información
- Ver historial de pedidos
- Eliminar lógicamente

Los clientes se crean automáticamente cuando realizan una compra.

El listado mostrará únicamente clientes activos, será paginado y mantendrá la
búsqueda, el orden y la página en la URL. En escritorio utilizará una tabla
semántica y en pantallas reducidas fichas equivalentes, sin desplazamiento
horizontal.

El detalle permitirá editar nombre, apellido, celular y notas. El celular se
normalizará en el Backend y conservará unicidad. La edición y la baja lógica
utilizarán `updated_at` como control de concurrencia y comunicarán los conflictos
sin sobrescribir cambios más recientes.

El historial de pedidos será paginado y de solo lectura. Mostrará número, fecha,
estado, pago y total desde los snapshots de cada pedido; editar el registro maestro
del cliente nunca modificará ventas anteriores. La baja requerirá confirmación,
preservará todo el historial y una compra posterior con el mismo celular podrá
reactivar el cliente.

---

# Pedidos

Objetivo

Administrar el flujo completo de ventas.

Estados

- Pendiente
- Pendiente de Pago
- Pagado
- Preparando
- Listo
- Retirado
- Cancelado

Funcionalidades

- Visualizar
- Buscar
- Filtrar
- Cambiar estado
- Consultar detalle
- Consultar método y estado de pago
- Acceder al teléfono del cliente
- Confirmar recepción de una transferencia
- Confirmar recepción de efectivo

El Panel habilitará únicamente las transiciones válidas para el método de pago. Cancelar un pedido pagado requerirá confirmación reforzada y advertirá que el reintegro monetario se gestiona manualmente.

La acción "Marcar como retirado" estará disponible únicamente para pedidos `ready` con pago confirmado. Al ejecutarla se registrará la fecha y hora del retiro.

## Acciones de WhatsApp

El detalle del pedido incluirá:

- "Contactar cliente": disponible para cualquier pedido.
- "Avisar que está listo": disponible únicamente en estado `ready`.
- "Recordar transferencia": disponible únicamente para transferencias con pago `pending`.

Cada acción abrirá `https://wa.me/{phone}?text={message}` en WhatsApp Web o la aplicación instalada. El teléfono utilizará código de país y solo dígitos, sin `+`, espacios ni guiones. El mensaje se codificará para URL y podrá editarse antes de enviarlo.

El sistema no enviará mensajes automáticamente, no utilizará WhatsApp Business API y no podrá asegurar si un mensaje fue enviado, entregado o leído. Abrir WhatsApp no modificará el estado del pedido ni del pago.

El listado conservará búsqueda, estado, método, pago, orden y página en la URL. El
detalle mostrará únicamente las acciones válidas calculadas por el Backend y
utilizará la fecha de actualización para detectar una vista desactualizada.

La cancelación exigirá un motivo mediante formulario. Para pedidos pagados se
solicitará además una confirmación explícita sobre el reintegro manual. El éxito
indicará que el stock fue restaurado una sola vez; nunca se ofrecerá reapertura ni
eliminación del pedido.

Nunca eliminar pedidos.

La creación de un pedido descuenta el stock. Al cancelar un pedido, el sistema deberá restaurar sus unidades una sola vez y mostrar el movimiento en el historial del producto.

---

# Configuración

Objetivo

Modificar la información general del comercio.

Configuraciones

- Nombre del negocio
- Logo de la marca
- WhatsApp
- Dirección
- URL de Google Maps
- Horarios de atención
- Alias
- CBU
- Banco
- Descuento por transferencia
- Umbral de stock bajo
- Redes Sociales

Existirá un único registro.

La URL de Google Maps deberá validarse antes de guardar. El Panel mostrará una vista previa del enlace público de ubicación.

El Panel permitirá cargar o reemplazar el logo con vista previa. Aceptará JPG,
PNG o WebP de hasta 5 MB, conservará la proporción de la imagen y almacenará el
archivo en el bucket privado `settings`. Quitar el logo configurado restaurará
el uso de la variante local oficial en la aplicación pública.

La edición se organizará por identidad y contacto, retiro en el local, datos de
transferencia, inventario y redes sociales. La URL de Maps ofrecerá una acción de
comprobación antes de guardar. Alias, CBU y banco serán visibles únicamente en el
Panel y en la confirmación autorizada de pedidos por transferencia; no formarán
parte del DTO público general de Settings.

La edición y el ciclo de vida del logo utilizarán `updated_at` como control de
concurrencia. Reemplazar el logo eliminará el objeto anterior solo después de
persistir la ruta nueva; quitarlo establecerá `logo_path` en NULL. Los cambios se
aplicarán a operaciones futuras y nunca reescribirán importes ni snapshots de
pedidos anteriores.

---

# Perfil administrativo

La cuenta administrativa se gestiona desde `/admin/perfil`, accesible desde el
menú de cuenta en escritorio y móvil. La pantalla separa nombre visible, correo de
acceso y contraseña para evitar guardados parciales entre datos de perfil y Auth.

El nombre completo se actualiza con concurrencia optimista. Cambiar el correo
requiere la contraseña actual y muestra el estado pendiente hasta completar la
confirmación enviada por Supabase. Cambiar la contraseña exige al menos 12
caracteres, confirmación coincidente y una contraseña distinta de la vigente;
después del cambio se cierran las sesiones y se vuelve al login.

---

# Formularios

Todos los formularios deberán:

- Validar datos antes de enviar.
- Mostrar errores claros.
- Mostrar indicadores de carga.
- Confirmar operaciones importantes.

Nunca cerrar automáticamente un formulario cuando exista un error.

---

# Tablas

Todas las tablas deberán incluir:

- Buscador
- Ordenamiento
- Paginación
- Estado vacío
- Loading
- Acciones rápidas

Cuando corresponda:

- Filtros
- Badges de estado
- Confirmaciones

---

# Confirmaciones

Toda operación destructiva deberá solicitar confirmación.

Ejemplos

- Eliminar producto
- Eliminar categoría
- Eliminar cliente

Nunca ejecutar estas acciones con un solo clic.

---

# Soft Delete

Las siguientes entidades utilizarán eliminación lógica.

- Productos
- Categorías
- Clientes

El Panel nunca eliminará registros físicamente.

---

# Estados Visuales

Toda pantalla deberá contemplar:

Loading

Error

Empty

Success

No Data

---

# Experiencia de Usuario

El Panel deberá minimizar la cantidad de clics.

Toda acción frecuente deberá poder realizarse rápidamente.

Las acciones principales deberán estar siempre visibles.

---

# Seguridad

Nunca mostrar información sensible.

Nunca permitir acceder a módulos sin autenticación.

Toda acción administrativa deberá validarse también en el Backend.

---

# Performance

Las tablas deberán utilizar paginación.

Evitar cargar información innecesaria.

Utilizar carga diferida cuando sea posible.

---

# Auditoría

Toda modificación importante deberá quedar registrada.

Ejemplos

- Cambio de configuración
- Edición de productos
- Ajustes manuales y automáticos de stock
- Cambio de estado de pedidos

La implementación podrá realizarse en el Backend.

---

# Definition of Done

Una funcionalidad administrativa estará finalizada cuando:

- Respete este documento.
- Respete FRONTEND-SDD.
- Respete BACKEND-SDD.
- Respete DATABASE-SDD.
- Sea responsive.
- Sea accesible.
- Utilice validaciones.
- Muestre estados de carga.
- Muestre estados de error.
- No permita operaciones inseguras.
- Sea consistente con el resto del Panel.
- Respeta todas las reglas definidas en BUSINESS-RULES.md.

# Acciones Masivas

Cuando un módulo administre una cantidad considerable de registros, deberá permitir operaciones masivas cuando aporten valor al usuario.

Ejemplos

Productos

- Activar varios productos.
- Desactivar varios productos.
- Eliminar lógicamente varios productos.

Categorías

- Activar varias categorías.
- Desactivar varias categorías.

Las acciones masivas deberán requerir confirmación antes de ejecutarse.

No implementar acciones masivas que puedan comprometer la integridad del sistema.
