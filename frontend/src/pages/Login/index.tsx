import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { useAdminLogin, useAdminSession } from '@/features/admin-auth'
import {
  adminLoginSchema,
  type AdminLoginFormValues,
} from '@/features/admin-auth/schemas/admin-login.schema'
import { getAdminAuthErrorMessage } from '@/features/admin-auth/utils/admin-auth-errors'
import { getAdminRedirectPath } from '@/features/admin-auth/utils/admin-route-state'
import { Button, Input } from '@/shared/components'

import '@/features/admin-auth/admin-auth.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const login = useAdminLogin()
  const session = useAdminSession()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const passwordChanged = typeof location.state === 'object'
    && location.state !== null
    && 'passwordChanged' in location.state
    && location.state.passwordChanged === true
  const form = useForm<AdminLoginFormValues>({
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    resolver: zodResolver(adminLoginSchema),
  })

  useEffect(() => {
    document.title = 'Acceso administrativo | Margarita Arte & Deco'

    return () => {
      document.title = 'Margarita Arte & Deco'
    }
  }, [])

  async function handleSubmit(values: AdminLoginFormValues) {
    setSubmitError(null)

    try {
      await login.mutateAsync(values)
      navigate(getAdminRedirectPath(location.state), { replace: true })
    } catch (error) {
      setSubmitError(getAdminAuthErrorMessage(error))
    }
  }

  if (session.isSuccess) {
    return <Navigate replace to={getAdminRedirectPath(location.state)} />
  }

  return (
    <main className="admin-login" aria-labelledby="admin-login-title">
      <section className="admin-login__brand" aria-label="Margarita Arte & Deco">
        <div>
          <p className="admin-login__eyebrow">Área privada</p>
          <h1 id="admin-login-title">Administración</h1>
          <p>Gestioná el negocio desde un espacio protegido y separado de la tienda.</p>
        </div>
        <div className="admin-login__security-note">
          <ShieldCheck aria-hidden="true" size={22} />
          <span>Tu acceso se mantiene protegido mientras administrás la tienda.</span>
        </div>
      </section>

      <section className="admin-login__form-panel" aria-labelledby="admin-login-form-title">
        <div className="admin-login__form-heading">
          <span className="admin-login__icon" aria-hidden="true">
            <LockKeyhole size={22} />
          </span>
          <div>
            <p className="admin-login__eyebrow">Bienvenida</p>
            <h2 id="admin-login-form-title">Iniciar sesión</h2>
          </div>
        </div>
        <p className="admin-login__intro">Ingresá con el correo y la contraseña de administración.</p>

        {submitError ? (
          <div className="admin-login__error" role="alert">
            {submitError}
          </div>
        ) : null}

        {passwordChanged ? (
          <div className="admin-login__success" role="status">
            Contraseña actualizada. Iniciá sesión nuevamente.
          </div>
        ) : null}

        <form className="admin-login__form" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
          <Input
            autoComplete="username"
            error={form.formState.errors.email?.message}
            label="Correo electrónico"
            placeholder="nombre@correo.com"
            type="email"
            {...form.register('email')}
          />
          <Input
            autoComplete="current-password"
            error={form.formState.errors.password?.message}
            label="Contraseña"
            placeholder="Ingresá tu contraseña"
            type="password"
            {...form.register('password')}
          />
          <Button
            className="admin-login__submit"
            isLoading={login.isPending}
            loadingText="Ingresando…"
            size="large"
            type="submit"
          >
            Ingresar al panel
          </Button>
        </form>
        <p className="admin-login__help">Este acceso es exclusivo para la persona administradora.</p>
      </section>
    </main>
  )
}
