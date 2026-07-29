import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

export function RouteScrollManager() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (hash) return

    window.scrollTo({ left: 0, top: 0 })
  }, [hash, pathname])

  return <Outlet />
}
