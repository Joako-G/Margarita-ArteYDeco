import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import { routes } from '@/config/routes'
import { Button } from '@/shared/components'

import type { IAdminProfile } from '../types/admin-auth'

interface IAdminAccountProps {
  isLoggingOut: boolean
  onLogout: () => void
  onNavigate?: () => void
  profile?: IAdminProfile
}

function getInitials(fullName?: string) {
  const initials = fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return initials || 'AD'
}

export function AdminAccountMenu({
  isLoggingOut,
  onLogout,
  profile,
}: IAdminAccountProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const displayName = profile?.fullName || 'Administración'

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function handleLogout() {
    setIsOpen(false)
    onLogout()
  }

  return (
    <div className="admin-account-menu" ref={containerRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="admin-account-menu__trigger"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="admin-account-menu__avatar">
          {getInitials(profile?.fullName)}
        </span>
        <span className="admin-account-menu__trigger-copy">
          <strong>{displayName}</strong>
          <small>Administrador</small>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="admin-account-menu__chevron"
          size={18}
        />
      </button>

      {isOpen ? (
        <div className="admin-account-menu__panel" id={panelId}>
          <div className="admin-account-menu__session">
            <ShieldCheck aria-hidden="true" size={20} />
            <span>
              <small>Sesión protegida</small>
              <strong>{displayName}</strong>
            </span>
          </div>
          {profile?.email ? (
            <p className="admin-account-menu__email" title={profile.email}>
              {profile.email}
            </p>
          ) : null}
          <Link
            className="admin-account-menu__profile-link"
            onClick={() => setIsOpen(false)}
            to={routes.adminProfile}
          >
            <UserRound aria-hidden="true" size={18} />
            Mi perfil
          </Link>
          <Button
            className="admin-account-menu__logout"
            isLoading={isLoggingOut}
            loadingText="Saliendo…"
            onClick={handleLogout}
            size="small"
            variant="ghost"
          >
            <LogOut aria-hidden="true" size={18} />
            Cerrar sesión
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function AdminMobileAccount({
  isLoggingOut,
  onLogout,
  onNavigate,
  profile,
}: IAdminAccountProps) {
  const displayName = profile?.fullName || 'Administración'

  return (
    <section aria-label="Cuenta administrativa" className="admin-mobile-account">
      <div className="admin-mobile-account__profile">
        <span aria-hidden="true" className="admin-mobile-account__avatar">
          {getInitials(profile?.fullName)}
        </span>
        <span className="admin-mobile-account__copy">
          <strong>{displayName}</strong>
          {profile?.email ? <small title={profile.email}>{profile.email}</small> : null}
        </span>
      </div>
      <Link
        className="admin-mobile-account__profile-link"
        onClick={onNavigate}
        to={routes.adminProfile}
      >
        <UserRound aria-hidden="true" size={18} />
        Mi perfil
      </Link>
      <Button
        className="admin-mobile-account__logout"
        isLoading={isLoggingOut}
        loadingText="Saliendo…"
        onClick={onLogout}
        size="small"
        variant="ghost"
      >
        <LogOut aria-hidden="true" size={18} />
        Cerrar sesión
      </Button>
    </section>
  )
}
