import { useMemo, useState } from 'react'
import { ChevronDown, PackageOpen, Search } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { CategoryFilter } from '@/features/categories'
import { useSyncCartProducts } from '@/features/cart'
import { ProductCard } from '@/features/products'
import {
  Button,
  Container,
  EmptyState,
  Input,
  Section,
  Select,
  Skeleton,
  Typography,
} from '@/shared/components'
import type { ICategory, IProduct } from '@/shared/types/catalog'

import { useCatalog } from './hooks/useCatalog'
import { useCatalogPageSize } from './hooks/useCatalogPageSize'
import './catalog.css'

type CatalogSortType = 'name' | 'newest' | 'price-asc' | 'price-desc'

const SORT_OPTIONS: { label: string; value: CatalogSortType }[] = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price-asc', label: 'Menor precio' },
  { value: 'price-desc', label: 'Mayor precio' },
  { value: 'name', label: 'Nombre: A a Z' },
]
const EMPTY_CATEGORIES: ICategory[] = []
const EMPTY_PRODUCTS: IProduct[] = []

interface ICatalogPaginationState {
  count: number
  key: string
}

function normalizeSearchTerm(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
}

function createPaginationKey(categorySlug: string, searchTerm: string, sort: CatalogSortType) {
  return `${categorySlug}:${normalizeSearchTerm(searchTerm)}:${sort}`
}

function sortProducts(products: IProduct[], sort: CatalogSortType) {
  return [...products].sort((first, second) => {
    if (sort === 'price-asc') return first.price - second.price
    if (sort === 'price-desc') return second.price - first.price
    if (sort === 'name') return first.name.localeCompare(second.name, 'es-AR')

    return (
      second.createdAt.localeCompare(first.createdAt) ||
      first.name.localeCompare(second.name, 'es-AR')
    )
  })
}

export function CatalogPage() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { data, isError, isPending, refetch } = useCatalog()
  const productsPerPage = useCatalogPageSize()
  const [searchTerm, setSearchTerm] = useState('')
  const [sort, setSort] = useState<CatalogSortType>('newest')
  const [pagination, setPagination] = useState<ICatalogPaginationState>({
    count: productsPerPage,
    key: '',
  })
  const categories = data?.categories ?? EMPTY_CATEGORIES
  const products = data?.products ?? EMPTY_PRODUCTS

  useSyncCartProducts(data?.products)

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.isActive)
        .sort((first, second) => first.displayOrder - second.displayOrder),
    [categories],
  )
  const publicProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.isActive &&
          activeCategories.some((category) => category.id === product.categoryId),
      ),
    [activeCategories, products],
  )
  const productCountByCategory = useMemo(
    () =>
      publicProducts.reduce<Record<string, number>>((counts, product) => {
        counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1
        return counts
      }, {}),
    [publicProducts],
  )
  const hasValidCategory = !slug || activeCategories.some((category) => category.slug === slug)
  const selectedSlug = slug && hasValidCategory ? slug : 'all'
  const selectedCategory = activeCategories.find((category) => category.slug === selectedSlug)
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm)
  const displayedProducts = useMemo(() => {
    const matchingProducts = publicProducts.filter((product) => {
      const matchesCategory = selectedSlug === 'all' || product.categoryId === selectedCategory?.id
      const searchableText = normalizeSearchTerm(`${product.name} ${product.description}`)

      return matchesCategory && searchableText.includes(normalizedSearchTerm)
    })

    return sortProducts(matchingProducts, sort)
  }, [normalizedSearchTerm, publicProducts, selectedCategory?.id, selectedSlug, sort])
  const paginationKey = createPaginationKey(selectedSlug, searchTerm, sort)
  const visibleProductCount =
    pagination.key === paginationKey ? Math.max(pagination.count, productsPerPage) : productsPerPage
  const visibleProducts = displayedProducts.slice(0, visibleProductCount)
  const remainingProductCount = displayedProducts.length - visibleProducts.length
  const hasMoreProducts = remainingProductCount > 0

  function selectCategory(categorySlug: string) {
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(categorySlug, searchTerm, sort),
    })
    navigate(categorySlug === 'all' ? '/productos' : `/categoria/${categorySlug}`)
  }

  function changeSearchTerm(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(selectedSlug, nextSearchTerm, sort),
    })
  }

  function changeSort(nextSort: CatalogSortType) {
    setSort(nextSort)
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(selectedSlug, searchTerm, nextSort),
    })
  }

  function showMoreProducts() {
    setPagination({
      count: visibleProductCount + productsPerPage,
      key: paginationKey,
    })
  }

  const selectionLabel = selectedCategory
    ? `Estás viendo: ${selectedCategory.name}`
    : 'Todos los productos'

  if (!isPending && !hasValidCategory) {
    return <Navigate replace to="/productos" />
  }

  if (isPending) {
    return <CatalogLoadingState />
  }

  if (isError) {
    return (
      <main id="main-content">
        <Section>
          <Container>
            <EmptyState
              action={<Button onClick={() => refetch()}>Intentar nuevamente</Button>}
              description="No pudimos cargar el catálogo. Intentá nuevamente en unos minutos."
              icon={<PackageOpen />}
              title="Ocurrió un problema inesperado."
            />
          </Container>
        </Section>
      </main>
    )
  }

  return (
    <main className="catalog-page" id="main-content">
      <Section aria-labelledby="catalog-title" className="catalog-page__intro" background="muted">
        <Container>
          <div className="catalog-page__heading">
            <Typography as="h1" id="catalog-title" variant="h1">
              Encontrá materiales para tu próxima idea
            </Typography>
            <Typography>
              Explorá el catálogo, elegí lo que necesitás y empezá a imaginar tu próximo proyecto.
            </Typography>
          </div>
          <CategoryFilter
            categories={activeCategories}
            onSelect={selectCategory}
            productCountByCategory={productCountByCategory}
            selectedSlug={selectedSlug}
          />
        </Container>
      </Section>

      <Section aria-labelledby="catalog-results-title">
        <Container>
          <div className="catalog-page__results-header">
            <div>
              <Typography as="h2" id="catalog-results-title" variant="h2">
                {selectionLabel}
              </Typography>
              <p aria-live="polite" className="catalog-page__count">
                {displayedProducts.length}{' '}
                {displayedProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
              </p>
            </div>
            <div className="catalog-page__controls">
              <Input
                className="catalog-page__search"
                label="Buscar"
                onChange={(event) => changeSearchTerm(event.target.value)}
                placeholder="Buscá por nombre o material"
                type="search"
                value={searchTerm}
              />
              <Select
                label="Ordenar por"
                onChange={(event) => changeSort(event.target.value as CatalogSortType)}
                value={sort}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {displayedProducts.length > 0 ? (
            <>
              <div className="catalog-page__grid" id="catalog-product-grid">
                {visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="catalog-page__pagination">
                <p aria-live="polite" className="catalog-page__progress">
                  Mostrando {visibleProducts.length} de {displayedProducts.length}{' '}
                  {displayedProducts.length === 1 ? 'producto' : 'productos'}
                </p>
                {hasMoreProducts ? (
                  <Button
                    aria-controls="catalog-product-grid"
                    onClick={showMoreProducts}
                    variant="secondary"
                  >
                    Ver más productos
                    <ChevronDown
                      aria-hidden="true"
                      className="catalog-page__more-icon"
                      size={18}
                      strokeWidth={2}
                    />
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <EmptyState
              action={
                <button
                  className="catalog-page__reset"
                  onClick={() => setSearchTerm('')}
                  type="button"
                >
                  Limpiar búsqueda
                </button>
              }
              description="Probá explorando otra sección o cambiando las palabras de tu búsqueda."
              icon={<Search />}
              title="Todavía no encontramos productos para esta categoría."
            />
          )}
        </Container>
      </Section>
    </main>
  )
}

function CatalogLoadingState() {
  return (
    <main className="catalog-page" id="main-content">
      <Section aria-label="Cargando catálogo" background="muted">
        <Container className="catalog-page__loading">
          <Skeleton className="catalog-page__skeleton-title" label="Cargando título del catálogo" />
          <Skeleton className="catalog-page__skeleton-copy" label="Cargando descripción" />
          <div className="catalog-page__skeleton-categories">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton
                className="catalog-page__skeleton-category"
                key={index}
                label="Cargando categoría"
              />
            ))}
          </div>
        </Container>
      </Section>
    </main>
  )
}
