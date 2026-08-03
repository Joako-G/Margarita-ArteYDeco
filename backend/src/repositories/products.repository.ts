import type { ServerSupabaseClient } from '../config/supabase.js'
import { productRowsSchema } from '../schemas/products.schema.js'
import type { IProductFilters, IProductRow } from '../types/catalog.js'
import { RepositoryError } from '../utils/app-error.js'
import { escapePostgrestLikePattern } from '../utils/postgrest-pattern.js'

export interface IProductRepository {
  findPublic(filters: IProductFilters): Promise<readonly IProductRow[]>
}

export class ProductRepository implements IProductRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPublic(filters: IProductFilters): Promise<readonly IProductRow[]> {
    let query = this.client
      .from('products')
      .select(`
        id,
        category_id,
        name,
        slug,
        description,
        price,
        stock_quantity,
        image_path,
        is_featured,
        created_at,
        updated_at,
        category:categories!inner(catalog_area,slug)
      `)
      .eq('is_active', true)
      .is('deleted_at', null)
      .eq('category.is_active', true)
      .is('category.deleted_at', null)

    if (filters.catalogArea !== undefined) {
      query = query.eq('category.catalog_area', filters.catalogArea)
    }

    if (filters.categorySlug !== undefined) {
      query = query.eq('category.slug', filters.categorySlug)
    }

    if (filters.featured !== undefined) {
      query = query.eq('is_featured', filters.featured)
    }

    if (filters.search !== undefined) {
      query = query.ilike('name', `%${escapePostgrestLikePattern(filters.search)}%`)
    }

    switch (filters.sort) {
      case 'name':
        query = query.order('name', { ascending: true }).order('id', { ascending: true })
        break
      case 'newest':
        query = query
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
        break
      case 'priceAsc':
        query = query
          .order('price', { ascending: true })
          .order('name', { ascending: true })
          .order('id', { ascending: true })
        break
      case 'priceDesc':
        query = query
          .order('price', { ascending: false })
          .order('name', { ascending: true })
          .order('id', { ascending: true })
        break
      case 'featured':
        query = query
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
        break
    }

    const { data, error } = await query.limit(filters.limit)

    if (error !== null) {
      throw new RepositoryError()
    }

    const parsedRows = productRowsSchema.safeParse(data)

    if (!parsedRows.success) {
      throw new RepositoryError('La fuente de productos devolvió un formato inválido')
    }

    return parsedRows.data.map((row) => ({
      catalogArea: row.category.catalog_area,
      categoryId: row.category_id,
      createdAt: row.created_at,
      description: row.description,
      id: row.id,
      imagePath: row.image_path,
      isFeatured: row.is_featured,
      name: row.name,
      price: row.price,
      slug: row.slug,
      stockQuantity: row.stock_quantity,
      updatedAt: row.updated_at,
    }))
  }
}
