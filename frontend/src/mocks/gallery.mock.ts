import accesoriosImage from '@/assets/images/accesorios.webp'
import fibroFacilImage from '@/assets/images/fibro-facil.webp'
import laminasImage from '@/assets/images/laminas.webp'
import moldesSiliconaImage from '@/assets/images/moldes-silicona.webp'
import pincelesImage from '@/assets/images/pinceles.webp'
import type { IGalleryItem } from '@/shared/types/content'

export const galleryMock: IGalleryItem[] = [
  {
    id: 'gallery-fibro-facil',
    title: 'Bases para transformar',
    alt: 'Objetos de Fibro Fácil listos para intervenir',
    image: fibroFacilImage,
    size: 'large',
  },
  {
    id: 'gallery-laminas',
    title: 'Detalles que cuentan historias',
    alt: 'Láminas decorativas con flores, un moño y un colibrí',
    image: laminasImage,
    size: 'medium',
  },
  {
    id: 'gallery-moldes',
    title: 'Formas para experimentar',
    alt: 'Moldes de silicona con motivos florales',
    image: moldesSiliconaImage,
    size: 'small',
  },
  {
    id: 'gallery-pinceles',
    title: 'Herramientas para cada trazo',
    alt: 'Pinceles organizados en frascos decorados',
    image: pincelesImage,
    size: 'medium',
  },
  {
    id: 'gallery-accesorios',
    title: 'Todo a mano',
    alt: 'Herramientas y accesorios para manualidades',
    image: accesoriosImage,
    size: 'small',
  },
]
