export const ADMINISTRATOR_ROLE = 'administrator' as const

export interface IAdminProfile {
  email: string
  fullName: string
  id: string
  isActive: boolean
  role: typeof ADMINISTRATOR_ROLE
}

export interface IAdminProfileDetail extends IAdminProfile {
  createdAt: string
  updatedAt: string
}

export type AdminEmailChangeResult =
  | { email: string; status: 'confirmed' }
  | { email: string; status: 'confirmation_pending' }

export type AdminCredentialUpdateResult =
  | { status: 'updated' }
  | { status: 'invalid_current_password' }
  | { status: 'email_unavailable' }
  | { status: 'rate_limited' }
  | { status: 'same_password' }
  | { status: 'weak_password' }

export interface IAdminSessionTokens {
  accessToken: string
  expiresAt: Date
  refreshToken: string
}

export interface IAdminAuthIdentity {
  tokens: IAdminSessionTokens
  userId: string
}

export interface IAdminSession {
  profile: IAdminProfile
  tokens: IAdminSessionTokens
}

export type AdminSignInResult =
  | { status: 'authenticated'; identity: IAdminAuthIdentity }
  | { status: 'invalid_credentials' }

export type AdminTokenValidationResult =
  | { status: 'authenticated'; userId: string }
  | { status: 'invalid_token' }

export type AdminRefreshResult =
  | { status: 'authenticated'; identity: IAdminAuthIdentity }
  | { status: 'invalid_token' }
