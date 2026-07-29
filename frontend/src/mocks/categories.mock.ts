import accesoriosImage from '@/assets/images/accesorios.webp'
import categoryDecoImage from '@/assets/images/category-deco.webp'
import categoryLaminasTermotransferiblesImage from '@/assets/images/category-laminas-termotransferibles.webp'
import categoryLaminasUvImage from '@/assets/images/category-laminas-uv.webp'
import categoryMoldesSiliconaImage from '@/assets/images/category-moldes-silicona.webp'
import categorySellosBajoRelieveImage from '@/assets/images/category-sellos-bajo-relieve.webp'
import fibroFacilImage from '@/assets/images/fibro-facil.webp'
import pincelesImage from '@/assets/images/pinceles.webp'
import sellosImage from '@/assets/images/sellos.webp'
import type { ICategory } from '@/shared/types/catalog'

export const categoriesMock: ICategory[] = [
  {
    id: 'category-moldes-silicona',
    name: 'Moldes de Silicona',
    slug: 'moldes-de-silicona',
    image: categoryMoldesSiliconaImage,
    description: 'Moldes para crear piezas únicas con terminaciones cuidadas.',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'category-fibro-facil',
    name: 'Fibro Fácil',
    slug: 'fibro-facil',
    image: fibroFacilImage,
    description: 'Bases y objetos listos para pintar, intervenir y transformar.',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'category-pinceles',
    name: 'Pinceles',
    slug: 'pinceles',
    image: pincelesImage,
    description: 'Herramientas para cada trazo, técnica y nivel de detalle.',
    displayOrder: 3,
    isActive: true,
  },
  {
    id: 'category-sellos-bajo-relieve',
    name: 'Sellos Bajo Relieve',
    slug: 'sellos-bajo-relieve',
    image: categorySellosBajoRelieveImage,
    description: 'Texturas y formas para sumar profundidad a tus proyectos.',
    displayOrder: 4,
    isActive: true,
  },
  {
    id: 'category-sellos',
    name: 'Sellos',
    slug: 'sellos',
    image: sellosImage,
    description: 'Diseños para personalizar piezas y dejar una marca propia.',
    displayOrder: 5,
    isActive: true,
  },
  {
    id: 'category-laminas-termotransferibles',
    name: 'Láminas Termotransferibles',
    slug: 'laminas-termotransferibles',
    image: categoryLaminasTermotransferiblesImage,
    description: 'Motivos listos para transferir y renovar objetos con facilidad.',
    displayOrder: 6,
    isActive: true,
  },
  {
    id: 'category-laminas-uv',
    name: 'Láminas UV',
    slug: 'laminas-uv',
    image: categoryLaminasUvImage,
    description: 'Detalles decorativos para composiciones delicadas y originales.',
    displayOrder: 7,
    isActive: true,
  },
  {
    id: 'category-accesorios',
    name: 'Accesorios',
    slug: 'accesorios',
    image: accesoriosImage,
    description: 'Complementos prácticos para trabajar con comodidad.',
    displayOrder: 8,
    isActive: true,
  },
  {
    id: 'category-deco',
    name: 'Deco',
    slug: 'deco',
    image: categoryDecoImage,
    description: 'Pequeños detalles para darle personalidad a cada espacio.',
    displayOrder: 9,
    isActive: true,
  },
]
