import { useEffect, useMemo, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import logoHeaderImage from '@/assets/images/logo-header-optimized.webp'
import { CartButton } from '@/features/cart'
import { buildCatalogMenu, isCatalogMenuGroup, usePublicCategories } from '@/features/catalog'
import type { CatalogMenuNodeType } from '@/features/catalog'
import { usePublicSettings } from '@/features/settings'
import { RecentOrderLink } from '@/features/public-orders/components/RecentOrderLink'
import { Drawer, IconButton } from '@/shared/components'
import { MobileNavigationGroup } from './MobileNavigationGroup'

const NAVIGATION_ITEMS = [
  { href: '/#categorias', label: 'Categorías' },
  { href: '/productos', label: 'Productos' },
  { href: '/#contacto', label: 'Contacto' },
]

const PRODUCTS_GROUP_ID = 'mobile-menu-products'

function scrollToSection(hash: string) {
  document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
}

function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src !== logoHeaderImage) {
    event.currentTarget.src = logoHeaderImage
  }
}

function getCatalogAreaParam(search: string) {
  return new URLSearchParams(search).get('area')
}

export function SiteHeader() {
  const location = useLocation()
  const { data: settings } = usePublicSettings()
  const { data: categories } = usePublicCategories()
  const logoSource = settings?.logoUrl ?? logoHeaderImage
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([])
  const [isScrolled, setIsScrolled] = useState(false)
  const mobileNavigationItems = useMemo<CatalogMenuNodeType[]>(
    () => [
      { href: '/#categorias', label: 'Categorías' },
      { id: PRODUCTS_GROUP_ID, items: buildCatalogMenu(categories ?? []), label: 'Productos' },
      { href: '/#contacto', label: 'Contacto' },
    ],
    [categories],
  )

  useEffect(() => {
    let animationFrameId = 0

    function handleScroll() {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 24)
      })
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return

    const animationFrame = window.requestAnimationFrame(() => {
      scrollToSection(location.hash)
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [location.hash, location.pathname])

  function closeMenu() {
    setIsMenuOpen(false)
    setExpandedGroupIds([])
  }

  function handleBrandNavigation() {
    closeMenu()

    if (location.pathname !== '/') return

    window.requestAnimationFrame(() => {
      window.scrollTo({ left: 0, top: 0 })
    })
  }

  function handleSectionNavigation(href: string) {
    closeMenu()

    if (location.pathname !== '/' || !href.startsWith('/#')) return

    window.requestAnimationFrame(() => {
      scrollToSection(href.slice(1))
    })
  }

  function handleGroupToggle(groupId: string) {
    setExpandedGroupIds((currentIds) =>
      currentIds.includes(groupId)
        ? currentIds.filter((expandedId) => expandedId !== groupId)
        : [...currentIds, groupId],
    )
  }

  function isNavigationItemActive(href: string) {
    if (href === '/#categorias') {
      return location.pathname === '/' && (!location.hash || location.hash === '#categorias')
    }

    if (href === '/productos') {
      return location.pathname === '/productos'
    }

    return location.pathname === '/' && `${location.pathname}${location.hash}` === href
  }

  function isMobileLinkActive(href: string) {
    if (href.startsWith('/#')) {
      return isNavigationItemActive(href)
    }

    const [linkPathname = '', linkSearch = ''] = href.split('?')

    if (location.pathname !== linkPathname) return false
    if (linkPathname !== '/productos') return true

    return getCatalogAreaParam(location.search) === getCatalogAreaParam(linkSearch)
  }

  return (
    <header className={`landing-header${isScrolled ? ' landing-header--scrolled' : ''}`}>
      <div className="landing-header__inner">
        <Link
          aria-label="Ir al inicio"
          className="landing-header__brand"
          onClick={handleBrandNavigation}
          to="/"
        >
          <img
            alt={settings?.businessName ?? 'Margaritas Arte & Deco'}
            className="landing-header__logo"
            decoding="async"
            fetchPriority="high"
            height="544"
            onError={handleLogoError}
            src={logoSource}
            width="1097"
          />
        </Link>

        <nav aria-label="Navegación principal" className="landing-header__desktop-nav">
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              aria-current={isNavigationItemActive(item.href) ? 'page' : undefined}
              className={
                isNavigationItemActive(item.href) ? 'landing-header__link--active' : undefined
              }
              key={item.href}
              onClick={() => handleSectionNavigation(item.href)}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
          <RecentOrderLink />
        </nav>

        <div className="landing-header__actions">
          <CartButton />
          <IconButton
            aria-label="Abrir menú"
            className="landing-header__menu-button"
            onClick={() => setIsMenuOpen(true)}
            variant="ghost"
          >
            <Menu aria-hidden="true" size={24} strokeWidth={2} />
          </IconButton>
        </div>
      </div>

      <Drawer className="landing-mobile-menu" isOpen={isMenuOpen} onClose={closeMenu} title="Menú">
        <nav aria-label="Navegación móvil" className="landing-mobile-menu__nav">
          {mobileNavigationItems.map((item) =>
            isCatalogMenuGroup(item) ? (
              <MobileNavigationGroup
                expandedGroupIds={expandedGroupIds}
                id={item.id}
                isLinkActive={isMobileLinkActive}
                items={item.items}
                key={item.id}
                label={item.label}
                onNavigate={handleSectionNavigation}
                onToggle={handleGroupToggle}
              />
            ) : (
              <Link
                aria-current={isMobileLinkActive(item.href) ? 'page' : undefined}
                key={item.href}
                onClick={() => handleSectionNavigation(item.href)}
                to={item.href}
              >
                {item.label}
              </Link>
            ),
          )}
          <RecentOrderLink onNavigate={closeMenu} />
        </nav>
      </Drawer>
    </header>
  )
}
