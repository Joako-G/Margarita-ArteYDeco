import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, PackageOpen, Search } from 'lucide-react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { CategoryFilter } from '@/features/categories'
import {
  Button,
  Container,
  EmptyState,
  Input,
  Section,
  Select,
  Typography,
} from '@/shared/components'
import type { ICategory, IProduct } from '@/shared/types/catalog'
import { applyDocumentMetadata } from '@/router/document-metadata'
import { getCategoryRouteMetadata } from '@/router/route-metadata'

import { CatalogHero } from './components/CatalogHero'
import { ProductGrid } from './components/ProductGrid'
import { ProductGridSkeleton } from './components/ProductGridSkeleton'
import { useCatalog } from './hooks/useCatalog'
import { useCatalogPageSize } from './hooks/useCatalogPageSize'
import {
  filterCategoriesByArea,
  getCatalogAreaQuery,
  parseCatalogArea,
  type CatalogAreaFilterType,
} from './utils/catalog-area'
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
  const [searchParams] = useSearchParams()
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

  const activeCategories = useMemo(
    () =>
      categories
        .filter((category) => category.isActive)
        .sort((first, second) => first.displayOrder - second.displayOrder),
    [categories],
  )
  const categoryById = useMemo(
    () => new Map(activeCategories.map((category) => [category.id, category])),
    [activeCategories],
  )
  const hasValidCategory = !slug || activeCategories.some((category) => category.slug === slug)
  const selectedSlug = slug && hasValidCategory ? slug : 'all'
  const selectedCategory = activeCategories.find((category) => category.slug === selectedSlug)
  const requestedArea = parseCatalogArea(searchParams.get('area'))
  const selectedArea: CatalogAreaFilterType =
    selectedCategory?.catalogArea ?? requestedArea ?? 'all'
  const visibleCategories = useMemo(
    () => filterCategoriesByArea(activeCategories, selectedArea),
    [activeCategories, selectedArea],
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
  const areaProducts = useMemo(
    () =>
      selectedArea === 'all'
        ? publicProducts
        : publicProducts.filter(
            (product) => categoryById.get(product.categoryId)?.catalogArea === selectedArea,
          ),
    [categoryById, publicProducts, selectedArea],
  )
  const productCountByCategory = useMemo(
    () =>
      areaProducts.reduce<Record<string, number>>((counts, product) => {
        counts[product.categoryId] = (counts[product.categoryId] ?? 0) + 1
        return counts
      }, {}),
    [areaProducts],
  )
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm)
  const displayedProducts = useMemo(() => {
    const matchingProducts = areaProducts.filter((product) => {
      const matchesCategory = selectedSlug === 'all' || product.categoryId === selectedCategory?.id
      const searchableText = normalizeSearchTerm(`${product.name} ${product.description}`)

      return matchesCategory && searchableText.includes(normalizedSearchTerm)
    })

    return sortProducts(matchingProducts, sort)
  }, [areaProducts, normalizedSearchTerm, selectedCategory?.id, selectedSlug, sort])
  const selectedFilterKey = `${selectedArea}:${selectedSlug}`
  const paginationKey = createPaginationKey(selectedFilterKey, searchTerm, sort)
  const visibleProductCount =
    pagination.key === paginationKey ? Math.max(pagination.count, productsPerPage) : productsPerPage
  const visibleProducts = displayedProducts.slice(0, visibleProductCount)
  const remainingProductCount = displayedProducts.length - visibleProducts.length
  const hasMoreProducts = remainingProductCount > 0

  useEffect(() => {
    if (!slug || !selectedCategory) return

    applyDocumentMetadata(
      getCategoryRouteMetadata(selectedCategory.name, selectedCategory.description),
      `/categoria/${selectedCategory.slug}`,
    )
  }, [selectedCategory, slug])

  function selectCategory(categorySlug: string) {
    const nextFilterKey = `${selectedArea}:${categorySlug}`
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(nextFilterKey, searchTerm, sort),
    })

    if (categorySlug !== 'all') {
      navigate(`/categoria/${categorySlug}`)
      return
    }

    navigate(
      selectedArea === 'all'
        ? '/productos'
        : `/productos?area=${getCatalogAreaQuery(selectedArea)}`,
    )
  }

  function selectArea(area: CatalogAreaFilterType) {
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(`${area}:all`, searchTerm, sort),
    })
    navigate(area === 'all' ? '/productos' : `/productos?area=${getCatalogAreaQuery(area)}`)
  }

  function changeSearchTerm(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm)
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(selectedFilterKey, nextSearchTerm, sort),
    })
  }

  function changeSort(nextSort: CatalogSortType) {
    setSort(nextSort)
    setPagination({
      count: productsPerPage,
      key: createPaginationKey(selectedFilterKey, searchTerm, nextSort),
    })
  }

  function showMoreProducts() {
    setPagination({
      count: visibleProductCount + productsPerPage,
      key: paginationKey,
    })
  }

  function showAllProducts() {
    setSearchTerm('')
    setPagination({
      count: productsPerPage,
      key: createPaginationKey('all:all', '', sort),
    })
    navigate('/productos')
  }

  const selectionLabel = selectedCategory
    ? `Estás viendo: ${selectedCategory.name}`
    : selectedArea === 'art'
      ? 'Todos los productos de Arte'
      : selectedArea === 'decoration'
        ? 'Todas las Decoraciones'
        : 'Todos los productos'
  const isControlsDisabled = isPending || isError

  if (!isPending && !isError && !hasValidCategory) {
    return <Navigate replace to="/productos" />
  }

  return (
    <main className="catalog-page" id="main-content">
      <CatalogHero />

      <Section
        aria-label="Filtros de productos"
        className="catalog-page__filters"
        background="muted"
      >
        <Container>
          <div aria-label="Filtrar por área del catálogo" className="catalog-page__area-filter">
            {(
              [
                { label: 'Todos', value: 'all' },
                { label: 'Arte', value: 'art' },
                { label: 'Decoraciones', value: 'decoration' },
              ] as const
            ).map((option) => (
              <button
                aria-pressed={selectedArea === option.value}
                className={
                  selectedArea === option.value
                    ? 'catalog-page__area-button catalog-page__area-button--selected'
                    : 'catalog-page__area-button'
                }
                disabled={isControlsDisabled}
                key={option.value}
                onClick={() => selectArea(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <CategoryFilter
            allLabel={selectedArea === 'decoration' ? 'Todas' : 'Todos'}
            categories={visibleCategories}
            isDisabled={isControlsDisabled}
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
              {isPending ? (
                <span aria-hidden="true" className="catalog-page__count-placeholder" />
              ) : isError ? null : (
                <p aria-live="polite" className="catalog-page__count">
                  {displayedProducts.length}{' '}
                  {displayedProducts.length === 1 ? 'producto encontrado' : 'productos encontrados'}
                </p>
              )}
            </div>
            <div className="catalog-page__controls">
              <Input
                className="catalog-page__search"
                disabled={isControlsDisabled}
                label="Buscar"
                onChange={(event) => changeSearchTerm(event.target.value)}
                placeholder="Buscá por nombre o material"
                type="search"
                value={searchTerm}
              />
              <Select
                disabled={isControlsDisabled}
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

          {isPending ? (
            <ProductGridSkeleton />
          ) : isError ? (
            <EmptyState
              action={<Button onClick={() => refetch()}>Reintentar</Button>}
              description="Intentá nuevamente en unos minutos."
              icon={<PackageOpen />}
              title="Ocurrió un problema al cargar los productos."
            />
          ) : displayedProducts.length > 0 ? (
            <>
              <ProductGrid categoryById={categoryById} products={visibleProducts} />
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
              action={<Button onClick={showAllProducts}>Ver todos los productos</Button>}
              description="Probá otra categoría o limpiá los filtros."
              icon={<Search />}
              title="No encontramos productos para esta búsqueda."
            />
          )}
        </Container>
      </Section>
    </main>
  )
}
