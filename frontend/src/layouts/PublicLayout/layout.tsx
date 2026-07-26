import { Outlet } from 'react-router-dom'

import { SiteFooter } from './components/SiteFooter'
import { SiteHeader } from './components/SiteHeader'
import '@/features/landing/landing.css'
import './styles.css'

export function PublicLayout() {
  return (
    <>
      <a className="public-layout__skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <SiteHeader />
      <Outlet />
      <SiteFooter />
    </>
  )
}
