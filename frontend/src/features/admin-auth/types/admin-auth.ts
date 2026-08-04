export interface IAdminProfile {
  email: string
  fullName: string
  role: 'administrator'
}

export interface IAdminSession {
  authenticated: true
  profile: IAdminProfile
}

export interface IAdminCredentials {
  email: string
  password: string
}
