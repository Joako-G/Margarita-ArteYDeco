import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import logoHeaderImage from '@/assets/images/logo-header.png'
import { Drawer, IconButton } from '@/shared/components'

const NAVIGATION_ITEMS = [
  { href: '/#inicio', label: 'Inicio' },
  { href: '/productos', label: 'Productos' },
  { href: '/#inspiracion', label: 'Inspiración' },
  { href: '/#nosotros', label: 'Nosotros' },
  { href: '/#contacto', label: 'Contacto' },
]

const LANDING_SECTION_IDS = ['inicio', 'inspiracion', 'nosotros', 'contacto']
const DESKTOP_NAVIGATION_MEDIA_QUERY = '(min-width: 1024px)'

export function SiteHeader() {
  const location = useLocation()
  const [activeLandingSection, setActiveLandingSection] = useState<string | null>(null)
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
      document.querySelector(location.hash)?.scrollIntoView()
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [location.hash, location.pathname])

  useEffect(() => {
    if (location.pathname !== '/') {
      return
    }

    const desktopNavigationMediaQuery = window.matchMedia(DESKTOP_NAVIGATION_MEDIA_QUERY)
    let animationFrameId = 0

    function updateActiveLandingSection() {
      if (!desktopNavigationMediaQuery.matches) {
        setActiveLandingSection(null)
        return
      }

      const isAtPageEnd =
        Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2

      if (isAtPageEnd) {
        setActiveLandingSection('contacto')
        return
      }

      const headerHeight =
        document.querySelector<HTMLElement>('.landing-header')?.getBoundingClientRect().height ?? 0
      const activationLine = headerHeight + window.innerHeight / 3
      let nextActiveSection = LANDING_SECTION_IDS[0]

      LANDING_SECTION_IDS.forEach((sectionId) => {
        const section = document.getElementById(sectionId)

        if (section && section.getBoundingClientRect().top <= activationLine) {
          nextActiveSection = sectionId
        }
      })

      setActiveLandingSection((currentSection) =>
        currentSection === nextActiveSection ? currentSection : nextActiveSection,
      )
    }

    function scheduleActiveSectionUpdate() {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(updateActiveLandingSection)
    }

    scheduleActiveSectionUpdate()
    const pageResizeObserver = new ResizeObserver(scheduleActiveSectionUpdate)

    pageResizeObserver.observe(document.documentElement)
    desktopNavigationMediaQuery.addEventListener('change', scheduleActiveSectionUpdate)
    window.addEventListener('resize', scheduleActiveSectionUpdate)
    window.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      pageResizeObserver.disconnect()
      desktopNavigationMediaQuery.removeEventListener('change', scheduleActiveSectionUpdate)
      window.removeEventListener('resize', scheduleActiveSectionUpdate)
      window.removeEventListener('scroll', scheduleActiveSectionUpdate)
    }
  }, [location.pathname])

  function handleNavigate() {
    setIsMenuOpen(false)
  }

  function isNavigationItemActive(href: string, shouldUseScrollPosition = false) {
    if (href === '/productos') {
      return location.pathname === '/productos' || location.pathname.startsWith('/categoria/')
    }

    if (shouldUseScrollPosition && location.pathname === '/' && activeLandingSection) {
      return href === `/#${activeLandingSection}`
    }

    if (href === '/#inicio') {
      return location.pathname === '/' && (!location.hash || location.hash === '#inicio')
    }

    return location.pathname === '/' && `${location.pathname}${location.hash}` === href
  }

  return (
    <header className={`landing-header${isScrolled ? ' landing-header--scrolled' : ''}`}>
      <div className="landing-header__inner">
        <Link aria-label="Ir al inicio" className="landing-header__brand" to="/#inicio">
          <img
            alt="Margaritas Arte & Deco"
            className="landing-header__logo"
            height="544"
            src={logoHeaderImage}
            width="1097"
          />
        </Link>

        <nav aria-label="Navegación principal" className="landing-header__desktop-nav">
          {NAVIGATION_ITEMS.map((item) => (
            <Link
              aria-current={isNavigationItemActive(item.href, true) ? 'location' : undefined}
              className={
                isNavigationItemActive(item.href, true)
                  ? 'landing-header__link--active'
                  : undefined
              }
              key={item.href}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <IconButton
          aria-label="Abrir menú"
          className="landing-header__menu-button"
          onClick={() => setIsMenuOpen(true)}
          variant="ghost"
        >
          <Menu aria-hidden="true" size={24} strokeWidth={2} />
        </IconButton>
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
              aria-current={isNavigationItemActive(item.href) ? 'location' : undefined}
              key={item.href}
              onClick={handleNavigate}
              to={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Drawer>
    </header>
  )
}
