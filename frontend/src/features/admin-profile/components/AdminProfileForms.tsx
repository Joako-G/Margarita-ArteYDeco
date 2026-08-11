import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, CircleCheck, KeyRound, Mail, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

import { routes } from '@/config/routes'
import { Button, Input } from '@/shared/components'
import { getApiErrorCode } from '@/shared/services/api/errors'

import {
  adminProfileEmailSchema,
  adminProfileNameSchema,
  adminProfilePasswordSchema,
  type AdminProfileEmailFormType,
  type AdminProfileNameFormType,
  type AdminProfilePasswordFormType,
} from '../schemas/admin-profile.schema'
import {
  useAdminProfile,
  useRequestAdminEmailChange,
  useUpdateAdminPassword,
  useUpdateAdminProfileName,
} from '../hooks/useAdminProfile'
import type { IAdminProfileDetail } from '../types/admin-profile'
import { getAdminProfileErrorMessage } from '../utils/admin-profile-errors'

type FeedbackType = { message: string; type: 'error' | 'success' } | null

function Feedback({ value }: { value: FeedbackType }) {
  if (!value) return null

  return (
    <div
      className={`admin-profile__feedback admin-profile__feedback--${value.type}`}
      role={value.type === 'error' ? 'alert' : 'status'}
    >
      {value.type === 'success'
        ? <CircleCheck aria-hidden="true" size={20} />
        : <CircleAlert aria-hidden="true" size={20} />}
      <p>{value.message}</p>
    </div>
  )
}

export function AdminProfileNameForm({ profile }: { profile: IAdminProfileDetail }) {
  const profileQuery = useAdminProfile()
  const mutation = useUpdateAdminProfileName()
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const form = useForm<AdminProfileNameFormType>({
    defaultValues: { fullName: profile.fullName },
    mode: 'onBlur',
    resolver: zodResolver(adminProfileNameSchema),
  })

  async function handleSubmit(values: AdminProfileNameFormType) {
    setFeedback(null)
    try {
      await mutation.mutateAsync({
        expectedUpdatedAt: profile.updatedAt,
        fullName: values.fullName.trim(),
      })
      setFeedback({ message: 'Listo, tu nombre ya está actualizado en el panel.', type: 'success' })
      form.reset({ fullName: values.fullName.trim() })
    } catch (error) {
      if (getApiErrorCode(error) === 'ADMIN_PROFILE_UPDATE_CONFLICT') {
        void profileQuery.refetch()
      }
      setFeedback({ message: getAdminProfileErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className="admin-profile__panel" aria-labelledby="admin-profile-name-title">
      <div className="admin-profile__section-heading">
        <span aria-hidden="true"><UserRound size={20} /></span>
        <div>
          <h2 id="admin-profile-name-title">Nombre visible</h2>
          <p>Se muestra en el encabezado y en el menú de la cuenta.</p>
        </div>
      </div>
      <Feedback value={feedback} />
      <form className="admin-profile__form" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
        <Input
          autoComplete="name"
          error={form.formState.errors.fullName?.message}
          label="Nombre completo"
          placeholder="Ej.: María González"
          {...form.register('fullName')}
        />
        <Button isLoading={mutation.isPending} loadingText="Guardando…" type="submit">
          Guardar nombre
        </Button>
      </form>
    </section>
  )
}

export function AdminProfileEmailForm({ profile }: { profile: IAdminProfileDetail }) {
  const mutation = useRequestAdminEmailChange()
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const form = useForm<AdminProfileEmailFormType>({
    defaultValues: { currentPassword: '', email: profile.email },
    mode: 'onBlur',
    resolver: zodResolver(adminProfileEmailSchema),
  })

  async function handleSubmit(values: AdminProfileEmailFormType) {
    setFeedback(null)
    try {
      const result = await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        email: values.email.trim().toLowerCase(),
      })
      const message = result.status === 'confirmation_pending'
        ? `Enviamos la confirmación a ${result.email}. El correo actual seguirá activo hasta completar la verificación.`
        : 'Listo, tu correo cambió correctamente. Usalo la próxima vez que inicies sesión.'
      setFeedback({ message, type: 'success' })
      form.reset({ currentPassword: '', email: result.email })
    } catch (error) {
      setFeedback({ message: getAdminProfileErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className="admin-profile__panel" aria-labelledby="admin-profile-email-title">
      <div className="admin-profile__section-heading">
        <span aria-hidden="true"><Mail size={20} /></span>
        <div>
          <h2 id="admin-profile-email-title">Correo de acceso</h2>
          <p>Por seguridad, el nuevo correo debe confirmarse antes de reemplazar al actual.</p>
        </div>
      </div>
      <Feedback value={feedback} />
      <form className="admin-profile__form" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
        <Input
          autoComplete="email"
          error={form.formState.errors.email?.message}
          label="Nuevo correo electrónico"
          placeholder="Ej.: maria@correo.com"
          type="email"
          {...form.register('email')}
        />
        <Input
          autoComplete="current-password"
          error={form.formState.errors.currentPassword?.message}
          helpText="Necesaria para autorizar el cambio."
          label="Contraseña actual"
          placeholder="Ingresá tu contraseña actual"
          type="password"
          {...form.register('currentPassword')}
        />
        <Button isLoading={mutation.isPending} loadingText="Solicitando…" type="submit">
          Cambiar correo
        </Button>
      </form>
    </section>
  )
}

export function AdminProfilePasswordForm() {
  const navigate = useNavigate()
  const mutation = useUpdateAdminPassword()
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const form = useForm<AdminProfilePasswordFormType>({
    defaultValues: { confirmPassword: '', currentPassword: '', newPassword: '' },
    mode: 'onBlur',
    resolver: zodResolver(adminProfilePasswordSchema),
  })

  async function handleSubmit(values: AdminProfilePasswordFormType) {
    setFeedback(null)
    try {
      await mutation.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      navigate(routes.adminLogin, {
        replace: true,
        state: { passwordChanged: true },
      })
    } catch (error) {
      setFeedback({ message: getAdminProfileErrorMessage(error), type: 'error' })
    }
  }

  return (
    <section className="admin-profile__panel" aria-labelledby="admin-profile-password-title">
      <div className="admin-profile__section-heading">
        <span aria-hidden="true"><KeyRound size={20} /></span>
        <div>
          <h2 id="admin-profile-password-title">Contraseña</h2>
          <p>Al guardarla se cerrarán todas las sesiones y deberás volver a ingresar.</p>
        </div>
      </div>
      <Feedback value={feedback} />
      <form className="admin-profile__form" noValidate onSubmit={form.handleSubmit(handleSubmit)}>
        <Input
          autoComplete="current-password"
          error={form.formState.errors.currentPassword?.message}
          label="Contraseña actual"
          placeholder="Ingresá tu contraseña actual"
          type="password"
          {...form.register('currentPassword')}
        />
        <Input
          autoComplete="new-password"
          error={form.formState.errors.newPassword?.message}
          helpText="Usá al menos 12 caracteres."
          label="Nueva contraseña"
          placeholder="Escribí una contraseña segura"
          type="password"
          {...form.register('newPassword')}
        />
        <Input
          autoComplete="new-password"
          error={form.formState.errors.confirmPassword?.message}
          label="Repetir nueva contraseña"
          placeholder="Volvé a escribir la nueva contraseña"
          type="password"
          {...form.register('confirmPassword')}
        />
        <Button isLoading={mutation.isPending} loadingText="Actualizando…" type="submit">
          Actualizar contraseña
        </Button>
      </form>
    </section>
  )
}
