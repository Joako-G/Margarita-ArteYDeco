import type { IAdminProfileRepository } from '../repositories/admin-profiles.repository.js'
import type { AdminLoginInput } from '../schemas/admin-auth.schema.js'
import type { IAdminSession } from '../types/admin-auth.js'
import { AppError } from '../utils/app-error.js'
import type { IAdminAuthProvider } from './admin-auth.provider.js'

export interface IAdminAuthService {
  authenticate(accessToken: string | null, refreshToken: string | null): Promise<{
    profile: IAdminSession['profile']
    tokensToSet: IAdminSession['tokens'] | null
  }>
  login(input: AdminLoginInput): Promise<IAdminSession>
  logout(accessToken: string | null, refreshToken: string | null): Promise<void>
}

function invalidCredentialsError(): AppError {
  return new AppError(
    401,
    'El correo o la contraseña no son correctos',
    'INVALID_ADMIN_CREDENTIALS',
  )
}

export class AdminAuthService implements IAdminAuthService {
  public constructor(
    private readonly authProvider: IAdminAuthProvider,
    private readonly profileRepository: IAdminProfileRepository,
  ) {}

  public async authenticate(
    accessToken: string | null,
    refreshToken: string | null,
  ): Promise<{
    profile: IAdminSession['profile']
    tokensToSet: IAdminSession['tokens'] | null
  }> {
    if (accessToken !== null) {
      const validation = await this.authProvider.getUser(accessToken)

      if (validation.status === 'authenticated') {
        const profile = await this.getAuthorizedProfile(validation.userId)
        return { profile, tokensToSet: null }
      }
    }

    if (refreshToken === null) {
      throw this.unauthorizedError()
    }

    const refreshed = await this.authProvider.refresh(refreshToken)

    if (refreshed.status === 'invalid_token') {
      throw this.unauthorizedError()
    }

    const profile = await this.getAuthorizedProfile(refreshed.identity.userId)
    return { profile, tokensToSet: refreshed.identity.tokens }
  }

  public async login(input: AdminLoginInput): Promise<IAdminSession> {
    const result = await this.authProvider.signIn(input.email, input.password)

    if (result.status === 'invalid_credentials') {
      throw invalidCredentialsError()
    }

    const profile = await this.profileRepository.findByUserId(result.identity.userId)

    if (profile === null || !profile.isActive) {
      await this.authProvider.signOut(
        result.identity.tokens.accessToken,
        result.identity.tokens.refreshToken,
      )
      throw invalidCredentialsError()
    }

    return { profile, tokens: result.identity.tokens }
  }

  public async logout(accessToken: string | null, refreshToken: string | null): Promise<void> {
    if (accessToken === null || refreshToken === null) {
      return
    }

    await this.authProvider.signOut(accessToken, refreshToken)
  }

  private async getAuthorizedProfile(userId: string): Promise<IAdminSession['profile']> {
    const profile = await this.profileRepository.findByUserId(userId)

    if (profile === null || !profile.isActive) {
      throw this.unauthorizedError()
    }

    return profile
  }

  private unauthorizedError(): AppError {
    return new AppError(401, 'Tu sesión no es válida o venció', 'ADMIN_SESSION_REQUIRED')
  }
}
