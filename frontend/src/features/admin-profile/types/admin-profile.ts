export interface IAdminProfileDetail {
  createdAt: string
  email: string
  fullName: string
  role: 'administrator'
  updatedAt: string
}

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

export interface IAdminEmailChangeResult {
  email: string
  status: 'confirmed' | 'confirmation_pending'
}
