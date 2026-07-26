---
score: 25
score_max: 40
p0: 1
p1: 2
p2: 2
p3: 0
anti_patterns: fail-moderate
method: dual-agent
timestamp: 2026-07-25T23-46-52Z
slug: margarita-arte-y-deco
---
# Revisión de la landing anterior

Method: dual-agent (A: /root/design_review · B: /root/technical_evidence)

## Design Health Score

| Heurística | Puntaje (0–4) |
|---|---:|
| Visibilidad del estado | 3 |
| Correspondencia con el mundo real | 3 |
| Control y libertad | 2 |
| Consistencia y estándares | 3 |
| Prevención de errores | 2 |
| Reconocimiento sobre recuerdo | 3 |
| Flexibilidad y eficiencia | 2 |
| Estética y minimalismo | 3 |
| Recuperación ante errores | 1 |
| Ayuda y documentación | 3 |
| **Total** | **25/40** |

## Anti-Patterns Verdict

**Fail moderado.** La identidad es cálida y coherente, pero aparecen patrones demasiado repetidos: eyebrow en casi todas las secciones, hero editorial con arco, tarjetas flotantes translúcidas, fotos de stock, testimonios genéricos, beneficios numerados y exceso de sombras.

## Overall Impression

La landing anterior sirve como referencia compositiva, no como implementación para migrar. La paleta, tipografías, ritmo entre superficies, hero de dos columnas, categorías circulares, galería bento y CTA final coinciden con la identidad actual. Sin embargo, su contenido vende objetos terminados y convierte mediante WhatsApp, mientras que el proyecto actual vende materiales y requiere stock, cantidades, carrito, checkout y retiro local.

La carga cognitiva es moderada-alta: seis enlaces más WhatsApp, nueve categorías y once bloques principales. El recorrido objetivo debería simplificarse a inspirar, filtrar, elegir cantidad y agregar al carrito.

## What’s Working

- Paleta verde, crema, blanco, arena y dorado compatible con los tokens actuales.
- Cormorant Garamond + Poppins como combinación de marca.
- Hero editorial, categorías circulares y galería de inspiración.
- Buenas bases semánticas: skip link, encabezados, `aria-live`, `aria-pressed`, foco y reduced motion.
- Tono cercano y estructura visual con alternancia de superficies.

## Priority Issues

### [P0] Propuesta comercial incompatible

El contenido habla de “objetos hechos por nosotros”, opciones pintadas/sin pintar y consultas por WhatsApp. Debe reescribirse desde `BUSINESS-RULES.md`, `CONTENT-STRATEGY.md` y `FRONTEND-SDD.md`. WhatsApp queda como soporte secundario, no como conversión principal.

**Acción sugerida:** reconstruir Hero, beneficios, productos, proceso y FAQ sobre la arquitectura React vigente.

### [P1] ProductCard no cubre la compra

La tarjeta antigua no muestra stock, selector de cantidad ni agregar al carrito. El filtro tampoco persiste en URL.

**Acción sugerida:** componer la tarjeta con los componentes compartidos existentes, limitar cantidad a `1..stock`, incluir estados sin stock y mantener el filtro en `/categoria/:slug`.

### [P1] Accesibilidad insuficiente

Hay textos de 9–12 px, controles de 38–42 px, foco amarillo con contraste insuficiente y varios colores que no alcanzan AA. El carrusel automático no tiene pausa accesible.

**Acción sugerida:** usar exclusivamente los tokens actuales, targets de 44×44 px, foco Verde Oscuro y animación respetuosa de `prefers-reduced-motion`.

### [P2] Dependencia de JavaScript y movimiento

`.reveal` oculta contenido hasta que corre JavaScript. El carrusel avanza cada cuatro segundos y solo pausa con hover.

**Acción sugerida:** contenido visible por defecto; animaciones como mejora progresiva y sin autoplay salvo control completo.

### [P2] Diseño demasiado plantillado

Las imágenes Unsplash, avatares, testimonios no verificables, floating cards y repetición de eyebrows debilitan la autenticidad.

**Acción sugerida:** usar imágenes reales del negocio, testimonios verificables y limitar los kickers a dos o tres momentos.

## Imágenes de categorías

Las seis imágenes actuales tienen resolución suficiente para círculos de 140 px. Deben mantenerse como fuente oficial:

- contenedor cuadrado con `border-radius: 50%` y `overflow: hidden`;
- `object-fit: cover`, sin deformación;
- `object-position` configurable desde los mock data;
- nombre debajo del círculo;
- overlay suave solo si hace falta estabilizar contraste;
- estado seleccionado con borde Verde Oscuro de 3 px, halo, check de Lucide y texto “Estás viendo: …”;
- foco visible, target mínimo de 44 px y desplazamiento horizontal accesible en móvil.

`laminas.jpeg` requiere especial cuidado porque reúne tres motivos. `sellos.jpeg`, `fibroFacil.jpeg` y `Accesorios.jpeg` también necesitan validar el punto focal. Los JPEG pesan entre 147 y 294 KB: conviene generar WebP/AVIF en la etapa de optimización. Hay seis imágenes para nueve categorías previstas; faltan activos diferenciados para las categorías restantes.

## Persona Red Flags

- **Jordan:** “Desde” y “Ver opciones” no explican el resultado. El camino principal debe ser “Explorar productos” → cantidad → carrito.
- **Riley:** al refrescar se pierde el filtro y faltan estados vacío, error y reintento.
- **Casey:** el recorrido es largo, algunos textos son pequeños y los controles móviles no siempre alcanzan 44 px.

## Minor Observations

- El botón siguiente del carrusel está visualmente vacío.
- Hay un `1` suelto en el footer.
- Las imágenes antiguas no declaran dimensiones y pueden causar CLS.
- Header y logo acumulan reglas CSS conflictivas.
- Los breakpoints antiguos no coinciden con el sistema actual.

## Questions to Consider

No se requiere una decisión de diseño adicional antes de comenzar: la dirección está suficientemente definida. Solo deben aportarse imágenes distintas cuando se incorporen las tres categorías que aún no tienen activo propio.

## Run Notes

- Slug: `margarita-arte-y-deco`.
- Ignore list: no existía.
- Evaluaciones A y B se realizaron de forma independiente.
- Detector CLI: 5 hallazgos; un falso positivo de fuente única y un hallazgo numérico parcial.
- Navegador: no disponible; se inspeccionaron código, assets y respuestas HTTP.
- Overlay injection: no realizada.
- Servidor temporal: detenido y puerto verificado.
- Archivos temporales: programados para limpieza tras persistir el snapshot.
