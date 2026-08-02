import { motion, useReducedMotion } from 'framer-motion'

import { ProductCard } from '@/features/products'
import type { ICategory, IProduct } from '@/shared/types/catalog'

interface IProductGridProps {
  categoryById: ReadonlyMap<string, ICategory>
  products: IProduct[]
}

const GRID_VARIANTS = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.025,
    },
  },
}

const CARD_VARIANTS = {
  hidden: {
    opacity: 0,
    y: 10,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
    y: 0,
  },
}

export function ProductGrid({ categoryById, products }: IProductGridProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      animate="visible"
      className="catalog-page__grid"
      id="catalog-product-grid"
      initial={prefersReducedMotion ? false : 'hidden'}
      variants={GRID_VARIANTS}
    >
      {products.map((product) => (
        <motion.div
          className="catalog-page__product-entry"
          key={product.id}
          variants={CARD_VARIANTS}
        >
          <ProductCard
            catalogArea={categoryById.get(product.categoryId)?.catalogArea ?? 'art'}
            product={product}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
