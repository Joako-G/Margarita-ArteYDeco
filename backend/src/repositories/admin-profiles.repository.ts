import type { ServerSupabaseClient } from '../config/supabase.js'
import { adminProfileDetailRowSchema, adminProfileRowSchema } from '../schemas/admin-auth.schema.js'
import type { IAdminProfile, IAdminProfileDetail } from '../types/admin-auth.js'
import { RepositoryError } from '../utils/app-error.js'

export interface IAdminProfileRepository {
  findDetailByUserId(userId: string): Promise<IAdminProfileDetail | null>
  findByUserId(userId: string): Promise<IAdminProfile | null>
  updateFullName(
    userId: string,
    fullName: string,
    expectedUpdatedAt: string,
  ): Promise<IAdminProfileDetail | null>
}

export class AdminProfileRepository implements IAdminProfileRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findByUserId(userId: string): Promise<IAdminProfile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,full_name,role,is_active')
      .eq('id', userId)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError('No fue posible validar el perfil administrativo')
    }

    if (data === null) {
      return null
    }

    const parsedProfile = adminProfileRowSchema.safeParse(data)

    if (!parsedProfile.success) {
      throw new RepositoryError('El perfil administrativo devolvió un formato inválido')
    }

    return {
      email: parsedProfile.data.email,
      fullName: parsedProfile.data.full_name,
      id: parsedProfile.data.id,
      isActive: parsedProfile.data.is_active,
      role: parsedProfile.data.role,
    }
  }

  public async findDetailByUserId(userId: string): Promise<IAdminProfileDetail | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('id,email,full_name,role,is_active,created_at,updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError('No fue posible obtener el perfil administrativo')
    }

    return data === null ? null : this.toDetail(data)
  }

  public async updateFullName(
    userId: string,
    fullName: string,
    expectedUpdatedAt: string,
  ): Promise<IAdminProfileDetail | null> {
    const { data, error } = await this.client
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)
      .eq('updated_at', expectedUpdatedAt)
      .select('id,email,full_name,role,is_active,created_at,updated_at')
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError('No fue posible actualizar el perfil administrativo')
    }

    return data === null ? null : this.toDetail(data)
  }

  private toDetail(data: unknown): IAdminProfileDetail {
    const parsedProfile = adminProfileDetailRowSchema.safeParse(data)

    if (!parsedProfile.success) {
      throw new RepositoryError('El perfil administrativo devolvió un formato inválido')
    }

    return {
      createdAt: parsedProfile.data.created_at,
      email: parsedProfile.data.email,
      fullName: parsedProfile.data.full_name,
      id: parsedProfile.data.id,
      isActive: parsedProfile.data.is_active,
      role: parsedProfile.data.role,
      updatedAt: parsedProfile.data.updated_at,
    }
  }
}
