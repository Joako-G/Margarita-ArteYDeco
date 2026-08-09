import accesoriosImage from '@/assets/images/Arte/accesorios.webp'
import categoryCajasDecoradasImage from '@/assets/images/category-cajas-decoradas.webp'
import categoryDecoracionHogarImage from '@/assets/images/category-decoracion-hogar.webp'
import categoryFechasEspecialesImage from '@/assets/images/category-fechas-especiales.webp'
import categoryLaminasTermotransferiblesImage from '@/assets/images/Arte/category-laminas-termotransferibles.webp'
import categoryLaminasUvImage from '@/assets/images/Arte/category-laminas-uv.webp'
import categoryMoldesSiliconaImage from '@/assets/images/Arte/category-moldes-silicona.webp'
import categoryRegalosPersonalizadosImage from '@/assets/images/category-regalos-personalizados.webp'
import categorySellosBajoRelieveImage from '@/assets/images/Arte/category-sellos-bajo-relieve.webp'
import fibroFacilImage from '@/assets/images/Arte/fibro-facil.webp'
import pincelesImage from '@/assets/images/Arte/pinceles.webp'
import sellosImage from '@/assets/images/Arte/sellos.webp'
import type { ICategory } from '@/shared/types/catalog'

export const categoriesMock: ICategory[] = [
  {
    catalogArea: 'art',
    id: 'category-moldes-silicona',
    name: 'Moldes de Silicona',
    slug: 'moldes-de-silicona',
    image: categoryMoldesSiliconaImage,
    description: 'Moldes para crear piezas únicas con terminaciones cuidadas.',
    displayOrder: 1,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-fibro-facil',
    name: 'Fibro Fácil',
    slug: 'fibro-facil',
    image: fibroFacilImage,
    description: 'Bases y objetos listos para pintar, intervenir y transformar.',
    displayOrder: 2,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-pinceles',
    name: 'Pinceles',
    slug: 'pinceles',
    image: pincelesImage,
    description: 'Herramientas para cada trazo, técnica y nivel de detalle.',
    displayOrder: 3,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-sellos-bajo-relieve',
    name: 'Sellos Bajo Relieve',
    slug: 'sellos-bajo-relieve',
    image: categorySellosBajoRelieveImage,
    description: 'Texturas y formas para sumar profundidad a tus proyectos.',
    displayOrder: 4,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-sellos',
    name: 'Sellos',
    slug: 'sellos',
    image: sellosImage,
    description: 'Diseños para personalizar piezas y dejar una marca propia.',
    displayOrder: 5,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-laminas-termotransferibles',
    name: 'Láminas Termotransferibles',
    slug: 'laminas-termotransferibles',
    image: categoryLaminasTermotransferiblesImage,
    description: 'Motivos listos para transferir y renovar objetos con facilidad.',
    displayOrder: 6,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-laminas-uv',
    name: 'Láminas UV',
    slug: 'laminas-uv',
    image: categoryLaminasUvImage,
    description: 'Detalles decorativos para composiciones delicadas y originales.',
    displayOrder: 7,
    isActive: true,
  },
  {
    catalogArea: 'art',
    id: 'category-accesorios',
    name: 'Accesorios',
    slug: 'accesorios',
    image: accesoriosImage,
    description: 'Complementos prácticos para trabajar con comodidad.',
    displayOrder: 8,
    isActive: true,
  },
  {
    catalogArea: 'decoration',
    id: 'category-cajas-decoradas',
    name: 'Cajas decoradas',
    slug: 'cajas-decoradas',
    image: categoryCajasDecoradasImage,
    description: 'Cajas pintadas a mano y listas para usar o regalar.',
    displayOrder: 1,
    isActive: true,
  },
  {
    catalogArea: 'decoration',
    id: 'category-decoracion-hogar',
    name: 'Decoración para el hogar',
    slug: 'decoracion-para-el-hogar',
    image: categoryDecoracionHogarImage,
    description: 'Piezas terminadas para sumar calidez y personalidad a cada espacio.',
    displayOrder: 2,
    isActive: true,
  },
  {
    catalogArea: 'decoration',
    id: 'category-fechas-especiales',
    name: 'Fechas especiales',
    slug: 'fechas-especiales',
    image: categoryFechasEspecialesImage,
    description: 'Adornos preparados para celebraciones y momentos especiales.',
    displayOrder: 3,
    isActive: true,
  },
  {
    catalogArea: 'decoration',
    id: 'category-regalos-personalizados',
    name: 'Regalos personalizados',
    slug: 'regalos-personalizados',
    image: categoryRegalosPersonalizadosImage,
    description: 'Regalos artesanales terminados con una presentación cuidada.',
    displayOrder: 4,
    isActive: true,
  },
]
