import type { ServerSupabaseClient } from '../config/supabase.js'
import { adminProfileRowSchema } from '../schemas/admin-auth.schema.js'
import type { IAdminProfile } from '../types/admin-auth.js'
import { RepositoryError } from '../utils/app-error.js'

export interface IAdminProfileRepository {
  findByUserId(userId: string): Promise<IAdminProfile | null>
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
}
