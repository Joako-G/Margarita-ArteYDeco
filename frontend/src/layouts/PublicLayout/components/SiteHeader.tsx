import { useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import logoHeaderImage from '@/assets/images/logo-header-optimized.webp'
import { CartButton } from '@/features/cart'
import { usePublicSettings } from '@/features/settings'
import { RecentOrderLink } from '@/features/public-orders/components/RecentOrderLink'
import { Drawer, IconButton } from '@/shared/components'

const NAVIGATION_ITEMS = [
  { href: '/#categorias', label: 'Categorías' },
  { href: '/productos', label: 'Productos' },
  { href: '/#contacto', label: 'Contacto' },
]

function scrollToSection(hash: string) {
  document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
}

function handleLogoError(event: SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src !== logoHeaderImage) {
    event.currentTarget.src = logoHeaderImage
  }
}

export function SiteHeader() {
  const location = useLocation()
  const { data: settings } = usePublicSettings()
  const logoSource = settings?.logoUrl ?? logoHeaderImage
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

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

  function handleBrandNavigation() {
    setIsMenuOpen(false)

    if (location.pathname !== '/') return

    window.requestAnimationFrame(() => {
      window.scrollTo({ left: 0, top: 0 })
    })
  }

  function handleSectionNavigation(href: string) {
    setIsMenuOpen(false)

    if (location.pathname !== '/' || !href.startsWith('/#')) return

    window.requestAnimationFrame(() => {
      scrollToSection(href.slice(1))
    })
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

      <Drawer
        className="landing-mobile-menu"
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title="Menú"
      >
        <nav aria-label="Navegación móvil" className="landing-mobile-menu__nav">
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              aria-current={isNavigationItemActive(item.href) ? 'page' : undefined}
              key={item.href}
              onClick={() => handleSectionNavigation(item.href)}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
          <RecentOrderLink onNavigate={() => setIsMenuOpen(false)} />
        </nav>
      </Drawer>
    </header>
  )
}
