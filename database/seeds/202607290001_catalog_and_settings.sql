begin;

insert into public.settings (
  business_name,
  logo_path,
  whatsapp,
  address,
  maps_url,
  business_hours,
  transfer_alias,
  transfer_cbu,
  bank_name,
  transfer_discount,
  low_stock_threshold
)
values (
  'Margaritas Arte & Deco',
  'brand/logo-header.png',
  '5491100000000',
  'Crucero general belgrano n°607',
  'https://www.google.com/maps/place/Crucero+Gral.+Belgrano+607,+Y4604+San+Salvador+de+Jujuy,+Jujuy/@-24.2146177,-65.2629445,21z/data=!4m16!1m9!3m8!1s0x941b0614a632b48f:0xc4a0da6be60d16c2!2sCrucero+Gral.+Belgrano+607,+Y4604+San+Salvador+de+Jujuy,+Jujuy!3b1!8m2!3d-24.2145769!4d-65.2627545!10e5!16s%2Fg%2F11vstm8c38!3m5!1s0x941b0614a632b48f:0xc4a0da6be60d16c2!8m2!3d-24.2145769!4d-65.2627545!16s%2Fg%2F11vstm8c38?entry=ttu&g_ep=EgoyMDI2MDcyOS4wIKXMDSoASAFQAw%3D%3D',
  '14:00 a 17:00 hs',
  'CONFIGURAR.ALIAS',
  '0000000000000000000000',
  'CONFIGURAR ANTES DE PRODUCCIÓN',
  10,
  3
)
on conflict (singleton_key) do nothing;

insert into public.categories (
  catalog_area,
  name,
  slug,
  image_path,
  description,
  display_order,
  is_active
)
values
  (
    'art',
    'Moldes de Silicona',
    'moldes-de-silicona',
    'catalog/moldes-silicona.webp',
    'Moldes para crear piezas decorativas con terminaciones cuidadas.',
    0,
    false
  ),
  (
    'art',
    'Fibro Fácil',
    'fibro-facil',
    'catalog/fibro-facil.webp',
    'Bases y objetos listos para intervenir y personalizar.',
    1,
    false
  ),
  (
    'art',
    'Pinceles',
    'pinceles',
    'catalog/pinceles.webp',
    'Herramientas para aplicar técnicas y lograr mejores terminaciones.',
    2,
    false
  ),
  (
    'art',
    'Sellos Bajo Relieve',
    'sellos-bajo-relieve',
    'catalog/sellos-bajo-relieve.webp',
    'Texturas y detalles en bajo relieve para proyectos artesanales.',
    3,
    false
  ),
  (
    'art',
    'Sellos',
    'sellos',
    'catalog/sellos.webp',
    'Diseños para estampar y sumar identidad a cada pieza.',
    4,
    false
  ),
  (
    'art',
    'Láminas Termotransferibles',
    'laminas-termotransferibles',
    'catalog/laminas-termotransferibles.webp',
    'Motivos listos para transferir y renovar objetos con facilidad.',
    5,
    false
  ),
  (
    'art',
    'Láminas UV',
    'laminas-uv',
    'catalog/laminas-uv.webp',
    'Láminas decorativas de aplicación práctica y acabado definido.',
    6,
    false
  ),
  (
    'art',
    'Accesorios',
    'accesorios',
    'catalog/accesorios.webp',
    'Complementos para acompañar cada proyecto creativo.',
    7,
    false
  ),
  (
    'decoration',
    'Cajas decoradas',
    'cajas-decoradas',
    'catalog/cajas-decoradas.webp',
    'Cajas pintadas a mano y listas para usar o regalar.',
    0,
    false
  ),
  (
    'decoration',
    'Decoración para el hogar',
    'decoracion-para-el-hogar',
    'catalog/decoracion-hogar.webp',
    'Piezas terminadas para sumar calidez y personalidad a distintos espacios.',
    1,
    false
  ),
  (
    'decoration',
    'Fechas especiales',
    'fechas-especiales',
    'catalog/fechas-especiales.webp',
    'Adornos y detalles preparados para celebraciones y momentos especiales.',
    2,
    false
  ),
  (
    'decoration',
    'Regalos personalizados',
    'regalos-personalizados',
    'catalog/regalos-personalizados.webp',
    'Regalos artesanales terminados con una presentación cuidada.',
    3,
    false
  )
on conflict (slug) do nothing;

-- Los productos se activan solo después de subir sus imágenes a Storage.
with product_seed (
  category_slug,
  name,
  slug,
  price,
  stock_quantity,
  image_path,
  is_featured
) as (
  values
    (
      'moldes-de-silicona',
      'Molde de rosas',
      'molde-rosas',
      12500::numeric,
      8,
      'catalog/product-molde-rosas.png',
      true
    ),
    (
      'moldes-de-silicona',
      'Molde de hojas botánicas',
      'molde-hojas-botanicas',
      11800::numeric,
      3,
      'catalog/moldes-silicona.webp',
      false
    ),
    (
      'moldes-de-silicona',
      'Molde arabesco',
      'molde-arabesco',
      13600::numeric,
      0,
      'catalog/moldes-silicona.webp',
      false
    ),
    (
      'fibro-facil',
      'Bandeja de Fibro Fácil',
      'bandeja-fibro-facil',
      9800::numeric,
      5,
      'catalog/product-fibro-facil.png',
      true
    ),
    (
      'fibro-facil',
      'Caja de té con divisiones',
      'caja-te-con-divisiones',
      14200::numeric,
      6,
      'catalog/fibro-facil.webp',
      false
    ),
    (
      'fibro-facil',
      'Cartel Bienvenidos',
      'cartel-bienvenidos',
      8700::numeric,
      2,
      'catalog/fibro-facil.webp',
      false
    ),
    (
      'pinceles',
      'Set de pinceles variados',
      'set-pinceles-variados',
      18900::numeric,
      12,
      'catalog/product-pinceles.png',
      true
    ),
    (
      'pinceles',
      'Pincel angular mediano',
      'pincel-angular-mediano',
      4900::numeric,
      9,
      'catalog/pinceles.webp',
      false
    ),
    (
      'pinceles',
      'Pincel liner fino',
      'pincel-liner-fino',
      4200::numeric,
      1,
      'catalog/pinceles.webp',
      false
    ),
    (
      'sellos-bajo-relieve',
      'Sello bajo relieve mandala',
      'sello-bajo-relieve-mandala',
      9300::numeric,
      4,
      'catalog/accesorios.webp',
      false
    ),
    (
      'sellos-bajo-relieve',
      'Sello bajo relieve flores',
      'sello-bajo-relieve-flores',
      8900::numeric,
      7,
      'catalog/accesorios.webp',
      false
    ),
    (
      'sellos-bajo-relieve',
      'Sello bajo relieve encaje',
      'sello-bajo-relieve-encaje',
      10100::numeric,
      0,
      'catalog/accesorios.webp',
      false
    ),
    (
      'sellos',
      'Sello Mi Creación',
      'sello-mi-creacion',
      7200::numeric,
      7,
      'catalog/sellos.webp',
      true
    ),
    (
      'sellos',
      'Sello Hecho con amor',
      'sello-hecho-con-amor',
      6800::numeric,
      10,
      'catalog/sellos.webp',
      false
    ),
    (
      'sellos',
      'Sello flores silvestres',
      'sello-flores-silvestres',
      7500::numeric,
      3,
      'catalog/sellos.webp',
      false
    ),
    (
      'laminas-termotransferibles',
      'Lámina botánica',
      'lamina-botanica',
      5400::numeric,
      0,
      'catalog/laminas.webp',
      true
    ),
    (
      'laminas-termotransferibles',
      'Lámina de mariposas',
      'lamina-mariposas',
      5600::numeric,
      8,
      'catalog/laminas.webp',
      false
    ),
    (
      'laminas-termotransferibles',
      'Lámina recetas de cocina',
      'lamina-recetas-cocina',
      5900::numeric,
      4,
      'catalog/laminas.webp',
      false
    ),
    (
      'laminas-uv',
      'Lámina UV floral',
      'lamina-uv-floral',
      6400::numeric,
      6,
      'catalog/accesorios.webp',
      false
    ),
    (
      'laminas-uv',
      'Lámina UV frases bonitas',
      'lamina-uv-frases-bonitas',
      6100::numeric,
      5,
      'catalog/accesorios.webp',
      false
    ),
    (
      'laminas-uv',
      'Lámina UV navideña',
      'lamina-uv-navidena',
      6500::numeric,
      2,
      'catalog/accesorios.webp',
      false
    ),
    (
      'accesorios',
      'Kit de herramientas',
      'kit-herramientas',
      15300::numeric,
      4,
      'catalog/accesorios.webp',
      true
    ),
    (
      'accesorios',
      'Set de espátulas de silicona',
      'set-espatulas-silicona',
      7800::numeric,
      11,
      'catalog/accesorios.webp',
      false
    ),
    (
      'accesorios',
      'Paletina para mezcla',
      'paletina-para-mezcla',
      5300::numeric,
      0,
      'catalog/accesorios.webp',
      false
    ),
    (
      'cajas-decoradas',
      'Caja floral pintada a mano',
      'caja-floral-pintada-a-mano',
      24500::numeric,
      2,
      'catalog/category-cajas-decoradas.webp',
      true
    ),
    (
      'decoracion-para-el-hogar',
      'Vela decorativa con flores',
      'vela-decorativa-con-flores',
      11200::numeric,
      5,
      'catalog/category-decoracion-hogar.webp',
      true
    ),
    (
      'decoracion-para-el-hogar',
      'Portallaves casita',
      'portallaves-casita',
      12800::numeric,
      3,
      'catalog/category-decoracion-hogar.webp',
      false
    ),
    (
      'fechas-especiales',
      'Adorno navideño artesanal',
      'adorno-navideno-artesanal',
      8900::numeric,
      6,
      'catalog/category-fechas-especiales.webp',
      true
    ),
    (
      'regalos-personalizados',
      'Cartel de bienvenida personalizado',
      'cartel-bienvenida-personalizado',
      9600::numeric,
      7,
      'catalog/category-regalos-personalizados.webp',
      true
    )
)
insert into public.products (
  category_id,
  name,
  slug,
  description,
  price,
  stock_quantity,
  image_path,
  is_featured,
  is_active
)
select
  category.id,
  product_seed.name,
  product_seed.slug,
  null,
  product_seed.price,
  product_seed.stock_quantity,
  product_seed.image_path,
  product_seed.is_featured,
  false
from product_seed
join public.categories as category
  on category.slug = product_seed.category_slug
on conflict (slug) do nothing;

commit;
