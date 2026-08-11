import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  adminCategoryDisplayOrderRowSchema,
  adminCategoryRowSchema,
  adminCategoryRowsSchema,
} from '../schemas/admin-categories.schema.js'
import type {
  IAdminCategoryCreateInput,
  IAdminCategoryFilters,
  IAdminCategoryPage,
  IAdminCategoryRecord,
  IAdminCategoryUpdateInput,
} from '../types/admin-categories.js'
import { RepositoryError } from '../utils/app-error.js'
import { escapePostgrestLikePattern } from '../utils/postgrest-pattern.js'

export class CategorySlugConflictError extends Error {
  public constructor() {
    super('The category name or slug is already in use')
    this.name = 'CategorySlugConflictError'
  }
}

export class CategoryAreaConflictError extends Error {
  public constructor() {
    super('The category area cannot change while products are associated')
    this.name = 'CategoryAreaConflictError'
  }
}

export interface IAdminCategoryRepository {
  create(input: IAdminCategoryCreateInput): Promise<IAdminCategoryRecord>
  findById(categoryId: string): Promise<IAdminCategoryRecord | null>
  findNextDisplayOrder(catalogArea: IAdminCategoryCreateInput['catalogArea']): Promise<number>
  findPage(filters: IAdminCategoryFilters): Promise<IAdminCategoryPage>
  softDelete(categoryId: string, expectedUpdatedAt: string): Promise<boolean>
  update(
    categoryId: string,
    input: IAdminCategoryUpdateInput,
  ): Promise<IAdminCategoryRecord | null>
  updateImage(
    categoryId: string,
    imagePath: string,
    expectedUpdatedAt: string,
  ): Promise<IAdminCategoryRecord | null>
  updatePublication(
    categoryId: string,
    isActive: boolean,
    expectedUpdatedAt: string,
  ): Promise<IAdminCategoryRecord | null>
}

const CATEGORY_SELECT = `
  id,
  catalog_area,
  name,
  slug,
  image_path,
  description,
  display_order,
  is_active,
  updated_at,
  products(count)
`

function mapCategory(row: unknown): IAdminCategoryRecord {
  const category = adminCategoryRowSchema.safeParse(row)

  if (!category.success) {
    throw new RepositoryError('La categoría administrativa devolvió un formato inválido')
  }

  return {
    catalogArea: category.data.catalog_area,
    description: category.data.description,
    displayOrder: category.data.display_order,
    id: category.data.id,
    imagePath: category.data.image_path,
    isActive: category.data.is_active,
    name: category.data.name,
    productCount: category.data.products[0]?.count ?? 0,
    slug: category.data.slug,
    updatedAt: category.data.updated_at,
  }
}

export class AdminCategoryRepository implements IAdminCategoryRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPage(filters: IAdminCategoryFilters): Promise<IAdminCategoryPage> {
    let query = this.client
      .from('categories')
      .select(CATEGORY_SELECT, { count: 'exact' })
      .is('deleted_at', null)

    if (filters.area !== 'all') query = query.eq('catalog_area', filters.area)
    if (filters.publication !== 'all') {
      query = query.eq('is_active', filters.publication === 'active')
    }
    if (filters.search !== undefined) {
      query = query.ilike('name', `%${escapePostgrestLikePattern(filters.search)}%`)
    }

    switch (filters.sort) {
      case 'nameAsc':
        query = query.order('name', { ascending: true })
        break
      case 'nameDesc':
        query = query.order('name', { ascending: false })
        break
      case 'newest':
        query = query.order('updated_at', { ascending: false })
        break
      case 'orderAsc':
        query = query
          .order('catalog_area', { ascending: true })
          .order('display_order', { ascending: true })
        break
      case 'orderDesc':
        query = query
          .order('catalog_area', { ascending: true })
          .order('display_order', { ascending: false })
        break
    }

    const firstRow = (filters.page - 1) * filters.pageSize
    const { count, data, error } = await query
      .order('id', { ascending: true })
      .range(firstRow, firstRow + filters.pageSize - 1)

    if (error !== null || count === null) {
      throw new RepositoryError('No fue posible consultar las categorías administrativas')
    }

    const rows = adminCategoryRowsSchema.safeParse(data)
    if (!rows.success) throw new RepositoryError('El listado de categorías devolvió un formato inválido')

    return { items: rows.data.map(mapCategory), totalItems: count }
  }

  public async findById(categoryId: string): Promise<IAdminCategoryRecord | null> {
    const { data, error } = await this.client
      .from('categories')
      .select(CATEGORY_SELECT)
      .eq('id', categoryId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible consultar la categoría')
    return data === null ? null : mapCategory(data)
  }

  public async findNextDisplayOrder(
    catalogArea: IAdminCategoryCreateInput['catalogArea'],
  ): Promise<number> {
    const { data, error } = await this.client
      .from('categories')
      .select('display_order')
      .eq('catalog_area', catalogArea)
      .is('deleted_at', null)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError('No fue posible calcular el orden de la categoría')
    }
    if (data === null) return 0

    const row = adminCategoryDisplayOrderRowSchema.safeParse(data)
    if (!row.success || row.data.display_order >= 2_147_483_647) {
      throw new RepositoryError('No fue posible asignar un orden válido a la categoría')
    }
    return row.data.display_order + 1
  }

  public async create(input: IAdminCategoryCreateInput): Promise<IAdminCategoryRecord> {
    const { error } = await this.client.from('categories').insert({
      catalog_area: input.catalogArea,
      description: input.description,
      display_order: input.displayOrder,
      id: input.id,
      image_path: input.imagePath,
      is_active: false,
      name: input.name,
      slug: input.slug,
    })

    if (error?.code === '23505') throw new CategorySlugConflictError()
    if (error !== null) throw new RepositoryError('No fue posible crear la categoría')

    const category = await this.findById(input.id)
    if (category === null) throw new RepositoryError('No fue posible recuperar la categoría creada')
    return category
  }

  public async update(
    categoryId: string,
    input: IAdminCategoryUpdateInput,
  ): Promise<IAdminCategoryRecord | null> {
    const { data, error } = await this.client
      .from('categories')
      .update({
        catalog_area: input.catalogArea,
        description: input.description,
        display_order: input.displayOrder,
        is_active: input.isActive,
        name: input.name,
        slug: input.slug,
      })
      .eq('id', categoryId)
      .eq('updated_at', input.expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error?.code === '23505') throw new CategorySlugConflictError()
    if (error?.code === '23514') throw new CategoryAreaConflictError()
    if (error !== null) throw new RepositoryError('No fue posible actualizar la categoría')
    return data === null ? null : this.findById(categoryId)
  }

  public async updateImage(
    categoryId: string,
    imagePath: string,
    expectedUpdatedAt: string,
  ): Promise<IAdminCategoryRecord | null> {
    const { data, error } = await this.client
      .from('categories')
      .update({ image_path: imagePath })
      .eq('id', categoryId)
      .eq('updated_at', expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible vincular la imagen')
    return data === null ? null : this.findById(categoryId)
  }

  public async updatePublication(
    categoryId: string,
    isActive: boolean,
    expectedUpdatedAt: string,
  ): Promise<IAdminCategoryRecord | null> {
    const { data, error } = await this.client
      .from('categories')
      .update({ is_active: isActive })
      .eq('id', categoryId)
      .eq('updated_at', expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible actualizar la publicación')
    return data === null ? null : this.findById(categoryId)
  }

  public async softDelete(categoryId: string, expectedUpdatedAt: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', categoryId)
      .eq('updated_at', expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible eliminar la categoría')
    return data !== null
  }
}
