# SDD — Descuento individual por producto

Estado: aprobado para implementación

## 1. Objetivo

Incorporar un porcentaje de descuento configurable en cada producto sin perder
el precio de lista, sin confiar en cálculos del Frontend y sin alterar el
historial de pedidos ya creados.

La mejora permitirá que el administrador elija productos específicos, indique
un descuento y publique una oferta visible en el catálogo, el carrito y el
checkout. El Backend y PostgreSQL conservarán la autoridad sobre todos los
importes.

Este documento complementa, pero no reemplaza, la prioridad definida en
`AGENTS.md`. Ante un conflicto prevalecen `BUSINESS-RULES.md`,
`DATABASE-SDD.md`, `BACKEND-SDD.md`, `FRONTEND-SDD.md` y `ADMIN-SDD.md`, en ese
orden.

## 2. Alcance

### 2.1 Incluye

- porcentaje de descuento individual por producto;
- edición desde alta y modificación administrativa;
- precio de lista y precio de oferta visibles en superficies públicas;
- badge accesible `Oferta`;
- actualización del carrito cuando cambien precio, descuento, actividad o stock;
- cálculo atómico del pedido usando datos persistidos;
- snapshot histórico del precio de lista, porcentaje y precio cobrado;
- aplicación posterior del descuento por transferencia;
- compatibilidad con efectivo, transferencia y la futura integración de Mercado
  Pago;
- auditoría del cambio administrativo mediante el mecanismo vigente;
- migración retrocompatible para productos y pedidos existentes;
- pruebas de base de datos, Backend y Frontend.

### 2.2 No incluye

- fechas de inicio o finalización de ofertas;
- descuentos por categoría, cliente, cantidad o cupón;
- promociones del tipo 2×1;
- precios diferenciados por método de entrega;
- modificación masiva de descuentos;
- descuentos de 100% o productos gratuitos;
- recargos por Mercado Pago;
- modificación retroactiva de pedidos existentes.

## 3. Decisiones e invariantes

1. `products.price` conserva el precio de lista.
2. `products.discount_percentage` representa el descuento vigente y utiliza `0`
   para indicar que el producto no está en oferta.
3. El porcentaje permitido es de `0` a `99.99`, inclusive en el mínimo y
   exclusivo en `100`.
4. El precio de oferta debe ser mayor que cero después de redondear a dos
   decimales.
5. El precio de oferta se calcula por unidad:

   ```text
   sale_price = round(price * (100 - discount_percentage) / 100, 2)
   ```

6. El subtotal de cada ítem es `sale_price × quantity`.
7. `orders.subtotal` representa la suma de los ítems después de los descuentos
   por producto y antes del descuento por medio de pago.
8. `orders.discount` conserva su significado vigente: descuento aplicado al
   subtotal por transferencia bancaria.
9. Para transferencia, el orden de cálculo es:

   ```text
   precios de oferta → subtotal → descuento por transferencia → total
   ```

10. Para efectivo y Mercado Pago, `orders.discount` será `0`; ambos utilizarán el
    subtotal con las ofertas de producto ya aplicadas.
11. El Frontend puede mostrar estimaciones, pero el pedido persistido y el importe
    que posteriormente reciba Mercado Pago proceden exclusivamente del Backend.
12. Cambiar o quitar una oferta nunca modifica un pedido anterior.
13. Un carrito no reserva ni congela precios. Antes de comprar deberá conciliarse
    con el catálogo vigente y la creación del pedido volverá a calcular todo.
14. No se persiste un booleano `is_on_sale`: se deriva de
    `discount_percentage > 0`.

## 4. Modelo de datos

### 4.1 Products

Agregar:

- `discount_percentage numeric(5,2) not null default 0`;
- `sale_price numeric(12,2)` generado y almacenado a partir de `price` y
  `discount_percentage`.

Restricciones:

- `discount_percentage >= 0 and discount_percentage < 100`;
- `sale_price > 0`;
- `sale_price <= price`.

`sale_price` no será aceptado en comandos de alta o edición. PostgreSQL lo
derivará para evitar divergencias entre capas y permitir ordenamiento público por
el precio realmente pagado.

### 4.2 Order Items

Mantener:

- `unit_price`: precio unitario efectivamente cobrado, después del descuento del
  producto;
- `subtotal`: `unit_price × quantity`.

Agregar snapshots inmutables:

- `list_unit_price numeric(12,2) not null`;
- `product_discount_percentage numeric(5,2) not null default 0`.

Restricciones:

- `list_unit_price > 0`;
- porcentaje entre `0` y menor que `100`;
- `unit_price = round(list_unit_price * (100 -
  product_discount_percentage) / 100, 2)`;
- `subtotal = round(unit_price * quantity, 2)`.

Los ítems creados antes de esta mejora no registran por separado el precio de
lista ni el porcentaje del producto. La migración los conservará y aplicará el
único backfill que no inventa historia comercial: `list_unit_price = unit_price`
y `product_discount_percentage = 0`. Para realizarlo, suspenderá únicamente los
triggers de actualización e inmutabilidad de `order_items` dentro de la misma
transacción, los reactivará inmediatamente y recién entonces hará obligatorios
los nuevos campos. La operación no cambia cantidades, subtotales ni totales.

### 4.3 Orders

No se agregan columnas.

- `subtotal`: suma de subtotales de ítems con oferta aplicada;
- `discount`: descuento por transferencia;
- `total = subtotal - discount`.

La diferencia entre el precio de lista y el precio cobrado puede obtenerse desde
los snapshots de `order_items` sin depender del producto actual.

### 4.4 Seguridad y permisos

- Las tablas existentes conservarán RLS.
- El Frontend seguirá sin acceder a Supabase.
- Solo `service_role` recibirá los permisos de columnas necesarios para crear o
  modificar el descuento.
- Las funciones transaccionales conservarán el modelo vigente `SECURITY DEFINER`
  estrictamente acotado, `search_path` vacío y ejecución revocada a `PUBLIC`,
  `anon` y `authenticated`; solo `service_role` podrá invocarlas desde el Backend.
- La migración no ampliará el acceso público a las tablas.

## 5. Backend

### 5.1 Catálogo público

Cada producto público expondrá:

```text
price
discountPercentage
salePrice
```

`price` será el precio de lista y `salePrice` el precio vigente. El ordenamiento
`priceAsc` y `priceDesc` utilizará `sale_price`, no el precio de lista.

### 5.2 Administración de productos

Los DTO de lista, detalle, alta y edición incorporarán `discountPercentage`.
`salePrice` se devolverá como valor de solo lectura.

Validaciones Zod:

- número finito;
- mínimo `0`;
- menor que `100`;
- máximo dos decimales;
- combinación de precio y porcentaje con resultado redondeado mayor que cero.

El repositorio enviará únicamente `discount_percentage`; nunca intentará escribir
`sale_price`.

La auditoría de creación y edición incluirá el porcentaje anterior y nuevo
cuando corresponda, sin generar una tabla específica de promociones.

### 5.3 Creación atómica del pedido

La RPC `create_order_with_stock` deberá:

1. bloquear los productos solicitados en orden estable;
2. validar actividad, eliminación lógica y stock;
3. leer `price`, `discount_percentage` y `sale_price` desde PostgreSQL;
4. calcular cada subtotal con `sale_price`;
5. sumar esos subtotales en `orders.subtotal`;
6. obtener `transfer_discount` desde Settings;
7. aplicarlo únicamente si el método es `bank_transfer`;
8. persistir los snapshots en `order_items`;
9. descontar stock y registrar movimientos como hasta ahora;
10. conservar idempotencia, Guest Session y respuesta actuales.

Ningún precio, porcentaje, subtotal o total enviado por el navegador será
aceptado como autoridad.

### 5.4 Consultas de pedidos

Los DTO públicos y administrativos de cada ítem incorporarán:

```text
listUnitPrice
productDiscountPercentage
unitPrice
lineTotal
```

Los campos permitirán explicar el importe sin consultar el producto actual. Para
pedidos históricos migrados, el porcentaje será `0` y ambos precios coincidirán.

### 5.5 Errores

Se reutilizarán los errores vigentes de conflicto y disponibilidad. Una edición
administrativa inválida responderá `400` con texto comprensible. Una variación de
precio detectada en el carrito no impedirá navegar: exigirá revisar la
actualización antes de confirmar.

## 6. Frontend público

### 6.1 Producto y catálogo

Cuando `discountPercentage > 0`:

- mostrar badge `Oferta`;
- mostrar precio de lista tachado semánticamente con `<del>`;
- mostrar `salePrice` como precio principal;
- comunicar el porcentaje mediante texto, no únicamente color;
- usar `salePrice` en cualquier subtotal estimado.

Sin descuento se mostrará únicamente `price`. `Destacado`, `Oferta` y `Sin
stock` conservarán jerarquía legible sin depender solo del color.

### 6.2 Carrito persistido

Cada ítem conservará los datos mínimos para renderizar la última vista conocida,
pero TanStack Query conciliará el carrito con el catálogo vigente.

Se considerará cambio comercial cuando varíe:

- precio de lista;
- porcentaje de descuento;
- precio de oferta;
- actividad;
- disponibilidad o stock.

La interfaz reemplazará los importes obsoletos por los vigentes y mostrará el
mensaje aprobado de disponibilidad. El usuario deberá revisar el carrito antes
de continuar cuando exista un cambio material.

### 6.3 Checkout

El resumen mostrará:

1. los precios de oferta de cada producto;
2. el subtotal después de ofertas;
3. el descuento adicional por transferencia, si corresponde;
4. el total estimado.

No se sumarán todos los descuentos como si fueran un único porcentaje. El
Frontend utilizará el mismo orden de redondeo para reducir diferencias visuales,
pero aceptará la respuesta autoritativa del pedido creado.

### 6.4 Confirmación y consulta del pedido

Cuando un ítem tuvo oferta se mostrarán precio de lista, porcentaje y precio
cobrado usando los snapshots del pedido. El descuento por transferencia se
mostrará como una línea independiente.

## 7. Panel administrativo

### 7.1 Formulario de producto

Agregar un campo numérico:

- label: `Descuento del producto`;
- sufijo o ayuda visible: `%`;
- valor inicial: `0`;
- ayuda: `Usá 0 para publicar el producto sin oferta.`;
- rango: `0` a `99,99`;
- paso: `0,01`.

El formulario mostrará una vista textual del precio resultante cuando precio y
porcentaje sean válidos. La vista es informativa y no se envía como autoridad.

### 7.2 Lista y detalle

- Los productos con descuento mostrarán badge `Oferta`.
- Se mostrará el precio de oferta junto al precio de lista.
- El ordenamiento administrativo por precio conservará el precio de lista para
  evitar cambiar silenciosamente la herramienta operativa vigente.
- No se agrega inicialmente un filtro exclusivo de ofertas.

### 7.3 Accesibilidad y responsive

- Label, ayuda y error estarán relacionados mediante ARIA.
- Precio anterior y actual tendrán texto comprensible para lectores de pantalla.
- El badge no será la única indicación de la oferta.
- Las fichas administrativas bajo 1024 px conservarán ambas cifras sin scroll
  horizontal.
- No se incorporarán colores, radios, sombras ni breakpoints fuera del Design
  System.

## 8. Compatibilidad con Mercado Pago y arrepentimientos

Checkout Pro no conocerá reglas de descuentos. Cuando se implemente, la
preferencia utilizará `orders.total`, ya persistido después de ofertas y del
descuento que corresponda al método de pago.

Un reintegro utilizará snapshots e importes efectivamente cobrados. Cambiar una
oferta después de la venta no alterará liquidaciones, devoluciones, reintegros ni
movimientos de stock.

## 9. Migración y despliegue paso a paso

1. Actualizar primero `BUSINESS-RULES.md` con las reglas comerciales aprobadas.
2. Alinear `DATABASE-SDD.md`, `BACKEND-SDD.md`, `FRONTEND-SDD.md`,
   `ADMIN-SDD.md`, `DESIGN-SYSTEM.md`, `CONTENT-STRATEGY.md`, `DECISIONS.md` y
   `ROADMAP.md` solo donde cambie el contrato o la presentación.
3. Crear la migración con `supabase migration new product_discounts`.
4. Agregar columnas y constraints de `products`.
5. Agregar inicialmente `list_unit_price` como nullable y
   `product_discount_percentage` con valor predeterminado `0`.
6. Suspender dentro de la transacción los triggers de actualización e
   inmutabilidad de `order_items`, completar los registros históricos con
   `list_unit_price = unit_price` y reactivar ambos triggers.
7. Hacer obligatorio `list_unit_price` y agregar los constraints de snapshots.
8. Ajustar grants por columna sin otorgar acceso a roles públicos.
9. Reemplazar la implementación vigente de `create_order_with_stock` conservando
   sus firmas, idempotencia, locks y permisos.
10. Actualizar los tipos de base de datos, schemas, repositorios, servicios y DTO
   del Backend.
11. Actualizar contratos y pruebas de las API pública y administrativa.
12. Actualizar tipos, adapters y mocks del catálogo en el Frontend.
13. Actualizar el store persistido y la conciliación del carrito con una versión
    de migración compatible.
14. Actualizar cálculos y pruebas del carrito y checkout.
15. Incorporar el campo administrativo y su validación.
16. Mostrar ofertas en catálogo, carrito, checkout y pedidos.
17. Ejecutar pruebas SQL sobre una base local limpia y una base migrada.
18. Ejecutar tests, lint y build de Backend y Frontend.
19. Probar responsive, teclado, lector de pantalla básico y contraste.
20. Aplicar primero la migración en el ambiente de prueba.
21. Desplegar Backend antes o junto con el Frontend compatible.
22. Crear un producto con oferta, completar pedidos con efectivo y transferencia
    y verificar snapshots, totales y stock.
23. Habilitar la edición de descuentos en producción.

## 10. Estrategia de pruebas

### 10.1 Base de datos

- porcentaje `0`, fraccionario y cercano al máximo;
- rechazo de porcentaje negativo o igual/mayor que `100`;
- rechazo si el redondeo produce precio cero;
- conservación de ítems previos con precio de lista igual al precio histórico y
  descuento de producto `0`;
- snapshot correcto al crear el pedido;
- dos unidades con redondeo por unidad;
- oferta más transferencia en el orden definido;
- efectivo sin descuento de transferencia;
- stock e idempotencia sin regresiones;
- concurrencia entre edición de oferta y creación de pedido;
- permisos y RLS sin ampliaciones.

### 10.2 Backend

- listado público con y sin oferta;
- ordenamiento público por precio de oferta;
- alta y edición administrativa;
- conflicto optimista al editar;
- DTO de pedido histórico y nuevo;
- validación cruzada de precio y porcentaje;
- respuestas sin campos internos ni datos sensibles.

### 10.3 Frontend

- schema del formulario;
- adaptación de catálogo;
- migración del carrito persistido;
- detección de cambio de oferta;
- subtotal del carrito;
- oferta más transferencia en checkout;
- representación de precio anterior y actual;
- estados sin stock, destacado y oferta combinados;
- navegación por teclado y mensajes accesibles.

## 11. Rollback

El despliegue será aditivo. Ante un problema:

1. ocultar temporalmente la edición y presentación de ofertas mediante el
   Frontend anterior;
2. mantener las columnas nuevas y los snapshots para no perder información;
3. establecer nuevos descuentos en `0` solo mediante una operación administrativa
   explícita si fuera necesario;
4. no eliminar columnas mientras exista un pedido que las utilice;
5. corregir y redesplegar la RPC antes de reactivar ofertas.

No se realizará rollback destructivo de pedidos ni se recalcularán importes
históricos.

## 12. Criterios de aceptación

La mejora estará completa cuando:

- el administrador pueda guardar entre `0` y `99,99%` por producto;
- el precio de oferta sea idéntico en catálogo, carrito, checkout y pedido;
- el Backend ignore cualquier importe calculado por el navegador;
- transferencia se aplique después de la oferta;
- efectivo y futura integración de Mercado Pago usen el subtotal ofertado sin
  recargo;
- los pedidos anteriores conserven exactamente sus importes;
- cambios posteriores del producto no alteren snapshots;
- stock, idempotencia, cancelación y arrepentimiento no sufran regresiones;
- las interfaces sean responsive y accesibles;
- pruebas SQL y de aplicación, lint y builds finalicen correctamente;
- la documentación prioritaria quede alineada.
