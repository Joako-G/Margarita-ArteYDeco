import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'

import categoryPlaceholderImage from '@/assets/images/product-placeholder.webp'
import { DeferredImage, IconButton } from '@/shared/components'
import type { ICategory } from '@/shared/types/catalog'
import './CategoryFilter.css'

interface ICategoryScrollState {
  canScrollBackward: boolean
  canScrollForward: boolean
  hasOverflow: boolean
}

interface ICategoryFilterProps {
  allLabel?: string
  ariaLabel?: string
  categories: ICategory[]
  isDisabled?: boolean
  onSelect: (slug: string) => void
  productCountByCategory: Record<string, number>
  selectedSlug: string
}

const INITIAL_SCROLL_STATE: ICategoryScrollState = {
  canScrollBackward: false,
  canScrollForward: false,
  hasOverflow: false,
}

export function CategoryFilter({
  allLabel = 'Todos',
  ariaLabel = 'Filtrar productos por categoría',
  categories,
  isDisabled = false,
  onSelect,
  productCountByCategory,
  selectedSlug,
}: ICategoryFilterProps) {
  const categoryFilterRef = useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = useState(INITIAL_SCROLL_STATE)
  const totalProductCount = categories.reduce(
    (sum, category) => sum + (productCountByCategory[category.id] ?? 0),
    0,
  )
  const categoryCollectionKey = categories.map((category) => category.id).join(':')
  const updateScrollState = useCallback(() => {
    const categoryFilter = categoryFilterRef.current

    if (!categoryFilter) {
      return
    }

    const scrollTolerance = 2
    const maximumScrollLeft = categoryFilter.scrollWidth - categoryFilter.clientWidth
    const nextScrollState = {
      canScrollBackward: categoryFilter.scrollLeft > scrollTolerance,
      canScrollForward: categoryFilter.scrollLeft < maximumScrollLeft - scrollTolerance,
      hasOverflow: maximumScrollLeft > scrollTolerance,
    }

    setScrollState((currentScrollState) => {
      if (
        currentScrollState.canScrollBackward === nextScrollState.canScrollBackward &&
        currentScrollState.canScrollForward === nextScrollState.canScrollForward &&
        currentScrollState.hasOverflow === nextScrollState.hasOverflow
      ) {
        return currentScrollState
      }

      return nextScrollState
    })
  }, [])

  useEffect(() => {
    const categoryFilter = categoryFilterRef.current

    if (!categoryFilter) {
      return
    }

    categoryFilter.scrollLeft = 0
    const animationFrameId = window.requestAnimationFrame(updateScrollState)
    const resizeObserver = new ResizeObserver(updateScrollState)

    resizeObserver.observe(categoryFilter)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
    }
  }, [categoryCollectionKey, updateScrollState])

  const handleCategoryScroll = (direction: 'backward' | 'forward') => {
    const categoryFilter = categoryFilterRef.current

    if (!categoryFilter) {
      return
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    categoryFilter.scrollBy({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      left: direction === 'forward' ? categoryFilter.clientWidth : -categoryFilter.clientWidth,
    })
  }

  return (
    <div
      className={`category-filter-navigation${
        scrollState.hasOverflow ? ' category-filter-navigation--overflowing' : ''
      }`}
    >
      <IconButton
        aria-hidden={!scrollState.hasOverflow}
        aria-label="Ver categorías anteriores"
        className="category-filter-navigation__arrow"
        disabled={isDisabled || !scrollState.canScrollBackward}
        onClick={() => handleCategoryScroll('backward')}
        variant="secondary"
      >
        <ChevronLeft aria-hidden="true" size={24} strokeWidth={2} />
      </IconButton>

      <div
        aria-label={ariaLabel}
        className="category-filter"
        onScroll={updateScrollState}
        ref={categoryFilterRef}
        role="group"
      >
        <button
          aria-label={`Ver ${allLabel.toLocaleLowerCase('es-AR')}`}
          aria-pressed={selectedSlug === 'all'}
          className={`category-filter__item category-filter__item--all${
            selectedSlug === 'all' ? ' category-filter__item--selected' : ''
          }`}
          disabled={isDisabled}
          onClick={() => onSelect('all')}
          type="button"
        >
          <span className="category-filter__visual">
            <LayoutGrid aria-hidden="true" size={32} strokeWidth={2} />
            {selectedSlug === 'all' && <SelectionCheck />}
          </span>
          <span className="category-filter__details">
            <span className="category-filter__name">{allLabel}</span>
            <span className="category-filter__count">{formatProductCount(totalProductCount)}</span>
          </span>
        </button>

        {categories.map((category) => {
          const isSelected = selectedSlug === category.slug
          const productCount = productCountByCategory[category.id] ?? 0

          return (
            <button
              aria-label={`Ver productos de ${category.name}`}
              aria-pressed={isSelected}
              className={`category-filter__item${
                isSelected ? ' category-filter__item--selected' : ''
              }`}
              disabled={isDisabled}
              key={category.id}
              onClick={() => onSelect(category.slug)}
              type="button"
            >
              <span className="category-filter__visual">
                <DeferredImage
                  alt=""
                  className="category-filter__image"
                  fallbackAlt=""
                  fallbackSrc={categoryPlaceholderImage}
                  height="160"
                  src={category.image}
                  width="160"
                />
                {isSelected && <SelectionCheck />}
              </span>
              <span className="category-filter__details">
                <span className="category-filter__name">{category.name}</span>
                <span className="category-filter__count">{formatProductCount(productCount)}</span>
              </span>
            </button>
          )
        })}
      </div>

      <IconButton
        aria-hidden={!scrollState.hasOverflow}
        aria-label="Ver más categorías"
        className="category-filter-navigation__arrow"
        disabled={isDisabled || !scrollState.canScrollForward}
        onClick={() => handleCategoryScroll('forward')}
        variant="secondary"
      >
        <ChevronRight aria-hidden="true" size={24} strokeWidth={2} />
      </IconButton>
    </div>
  )
}

function formatProductCount(count: number) {
  return `${count} ${count === 1 ? 'producto' : 'productos'}`
}

function SelectionCheck() {
  return (
    <span aria-hidden="true" className="category-filter__check">
      <Check size={18} strokeWidth={3} />
    </span>
  )
}
