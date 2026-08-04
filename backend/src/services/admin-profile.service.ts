import type { IAdminProfileRepository } from '../repositories/admin-profiles.repository.js'
import type {
  AdminEmailChangeResult,
  IAdminProfileDetail,
} from '../types/admin-auth.js'
import { AppError } from '../utils/app-error.js'
import type { IAdminAccountProvider } from './admin-auth.provider.js'

export interface IAdminProfileNameInput {
  expectedUpdatedAt: string
  fullName: string
}

export interface IAdminProfileEmailInput {
  currentPassword: string
  email: string
}

export interface IAdminProfilePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface IAdminProfileService {
  get(userId: string): Promise<IAdminProfileDetail>
  requestEmailChange(
    userId: string,
    input: IAdminProfileEmailInput,
    accessToken: string,
    refreshToken: string,
  ): Promise<AdminEmailChangeResult>
  updateFullName(userId: string, input: IAdminProfileNameInput): Promise<IAdminProfileDetail>
  updatePassword(
    input: IAdminProfilePasswordInput,
    accessToken: string,
    refreshToken: string,
  ): Promise<void>
}

export class AdminProfileService implements IAdminProfileService {
  public constructor(
    private readonly repository: IAdminProfileRepository,
    private readonly accountProvider: IAdminAccountProvider,
  ) {}

  public async get(userId: string): Promise<IAdminProfileDetail> {
    const profile = await this.repository.findDetailByUserId(userId)

    if (profile === null || !profile.isActive) {
      throw new AppError(404, 'Perfil administrativo no encontrado', 'ADMIN_PROFILE_NOT_FOUND')
    }

    return profile
  }

  public async updateFullName(
    userId: string,
    input: IAdminProfileNameInput,
  ): Promise<IAdminProfileDetail> {
    const profile = await this.repository.updateFullName(
      userId,
      input.fullName,
      input.expectedUpdatedAt,
    )

    if (profile === null) {
      throw new AppError(
        409,
        'El perfil cambió mientras lo editabas. Recargá la información e intentá nuevamente.',
        'ADMIN_PROFILE_UPDATE_CONFLICT',
      )
    }

    return profile
  }

  public async requestEmailChange(
    userId: string,
    input: IAdminProfileEmailInput,
    accessToken: string,
    refreshToken: string,
  ): Promise<AdminEmailChangeResult> {
    const profile = await this.get(userId)

    if (profile.email.toLowerCase() === input.email.toLowerCase()) {
      throw new AppError(400, 'El nuevo correo debe ser diferente al actual', 'ADMIN_EMAIL_UNCHANGED')
    }

    const result = await this.accountProvider.requestEmailChange(
      accessToken,
      refreshToken,
      input.currentPassword,
      input.email,
    )

    if (result.status === 'confirmed' || result.status === 'confirmation_pending') {
      return result
    }

    throw this.toCredentialError(result.status)
  }

  public async updatePassword(
    input: IAdminProfilePasswordInput,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    if (input.currentPassword === input.newPassword) {
      throw new AppError(400, 'La nueva contraseña debe ser diferente', 'ADMIN_PASSWORD_UNCHANGED')
    }

    const result = await this.accountProvider.updatePassword(
      accessToken,
      refreshToken,
      input.currentPassword,
      input.newPassword,
    )

    if (result.status !== 'updated') {
      throw this.toCredentialError(result.status)
    }
  }

  private toCredentialError(status: string): AppError {
    if (status === 'invalid_current_password') {
      return new AppError(401, 'La contraseña actual no es correcta', 'INVALID_CURRENT_PASSWORD')
    }

    if (status === 'email_unavailable') {
      return new AppError(409, 'Ese correo no está disponible', 'ADMIN_EMAIL_UNAVAILABLE')
    }

    if (status === 'rate_limited') {
      return new AppError(429, 'Esperá unos minutos antes de intentarlo nuevamente', 'ADMIN_PROFILE_RATE_LIMITED')
    }

    if (status === 'same_password') {
      return new AppError(400, 'La nueva contraseña debe ser diferente', 'ADMIN_PASSWORD_UNCHANGED')
    }

    if (status === 'weak_password') {
      return new AppError(400, 'La nueva contraseña no cumple los requisitos de seguridad', 'ADMIN_PASSWORD_WEAK')
    }

    return new AppError(503, 'No pudimos actualizar el perfil', 'ADMIN_PROFILE_AUTH_UNAVAILABLE')
  }
}
