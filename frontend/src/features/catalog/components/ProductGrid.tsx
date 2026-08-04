import { ProductCard } from '@/features/products'
import type { ICategory, IProduct } from '@/shared/types/catalog'

interface IProductGridProps {
  categoryById: ReadonlyMap<string, ICategory>
  products: IProduct[]
}

export function ProductGrid({ categoryById, products }: IProductGridProps) {
  return (
    <div className="catalog-page__grid" id="catalog-product-grid">
      {products.map((product) => (
        <div className="catalog-page__product-entry" key={product.id}>
          <ProductCard
            catalogArea={categoryById.get(product.categoryId)?.catalogArea ?? 'art'}
            product={product}
          />
        </div>
      ))}
    </div>
  )
}
