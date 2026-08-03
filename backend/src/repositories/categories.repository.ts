import type { ServerSupabaseClient } from '../config/supabase.js'
import { categoryRowsSchema } from '../schemas/categories.schema.js'
import type { ICategoryFilters, ICategoryRow } from '../types/catalog.js'
import { RepositoryError } from '../utils/app-error.js'

export interface ICategoryRepository {
  findPublic(filters: ICategoryFilters): Promise<readonly ICategoryRow[]>
}

export class CategoryRepository implements ICategoryRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPublic(filters: ICategoryFilters): Promise<readonly ICategoryRow[]> {
    let query = this.client
      .from('categories')
      .select('id,catalog_area,name,slug,image_path,description,display_order')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (filters.catalogArea !== undefined) {
      query = query.eq('catalog_area', filters.catalogArea)
    }

    const { data, error } = await query
      .order('catalog_area', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error !== null) {
      throw new RepositoryError()
    }

    const parsedRows = categoryRowsSchema.safeParse(data)

    if (!parsedRows.success) {
      throw new RepositoryError('La fuente de categorías devolvió un formato inválido')
    }

    return parsedRows.data.map((row) => ({
      catalogArea: row.catalog_area,
      description: row.description,
      displayOrder: row.display_order,
      id: row.id,
      imagePath: row.image_path,
      name: row.name,
      slug: row.slug,
    }))
  }
}
