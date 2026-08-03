import type { ServerSupabaseClient } from '../config/supabase.js'
import {
  adminProductCategoryRowSchema,
  adminProductCategoryRowsSchema,
  adminProductDetailRowSchema,
  adminProductRowsSchema,
  adminProductSettingsRowSchema,
} from '../schemas/admin-products.schema.js'
import type {
  IAdminProductCategoryOption,
  IAdminProductCreateInput,
  IAdminProductFilters,
  IAdminProductPage,
  IAdminProductRecord,
  IAdminProductStateUpdateInput,
  IAdminProductUpdateInput,
} from '../types/admin-products.js'
import { RepositoryError } from '../utils/app-error.js'
import { escapePostgrestLikePattern } from '../utils/postgrest-pattern.js'

export class ProductSlugConflictError extends Error {
  public constructor() {
    super('The product slug is already in use')
    this.name = 'ProductSlugConflictError'
  }
}

export interface IAdminProductRepository {
  create(input: IAdminProductCreateInput): Promise<IAdminProductRecord>
  findById(productId: string): Promise<IAdminProductRecord | null>
  findCategoryById(categoryId: string): Promise<IAdminProductCategoryOption | null>
  findCategoryOptions(): Promise<readonly IAdminProductCategoryOption[]>
  findPage(filters: IAdminProductFilters): Promise<IAdminProductPage>
  softDelete(productId: string, expectedUpdatedAt: string): Promise<boolean>
  update(productId: string, input: IAdminProductUpdateInput): Promise<IAdminProductRecord | null>
  updateImage(
    productId: string,
    imagePath: string | null,
    expectedUpdatedAt: string,
  ): Promise<IAdminProductRecord | null>
  updateState(
    productId: string,
    input: IAdminProductStateUpdateInput,
  ): Promise<IAdminProductRecord | null>
}

function mapProduct(row: unknown): IAdminProductRecord {
  const product = adminProductDetailRowSchema.safeParse(row)

  if (!product.success) {
    throw new RepositoryError('El producto administrativo devolvió un formato inválido')
  }

  return {
    catalogArea: product.data.category.catalog_area,
    categoryId: product.data.category_id,
    categoryName: product.data.category.name,
    description: product.data.description,
    id: product.data.id,
    imagePath: product.data.image_path,
    isActive: product.data.is_active,
    isFeatured: product.data.is_featured,
    name: product.data.name,
    price: product.data.price,
    slug: product.data.slug,
    stockQuantity: product.data.stock_quantity,
    updatedAt: product.data.updated_at,
  }
}

const PRODUCT_DETAIL_SELECT = `
  id,
  category_id,
  name,
  slug,
  description,
  price,
  stock_quantity,
  image_path,
  is_active,
  is_featured,
  updated_at,
  category:categories!inner(name,catalog_area)
`

export class AdminProductRepository implements IAdminProductRepository {
  public constructor(private readonly client: ServerSupabaseClient) {}

  public async findPage(filters: IAdminProductFilters): Promise<IAdminProductPage> {
    const settingsResult = await this.client
      .from('settings')
      .select('low_stock_threshold')
      .eq('singleton_key', true)
      .maybeSingle()

    if (settingsResult.error !== null || settingsResult.data === null) {
      throw new RepositoryError('No fue posible consultar el umbral de stock bajo')
    }

    const settings = adminProductSettingsRowSchema.safeParse(settingsResult.data)

    if (!settings.success) {
      throw new RepositoryError('La configuración devolvió un formato inválido')
    }

    const lowStockThreshold = settings.data.low_stock_threshold
    let query = this.client
      .from('products')
      .select(`
        id,
        category_id,
        name,
        slug,
        price,
        stock_quantity,
        image_path,
        is_active,
        is_featured,
        updated_at,
        category:categories!inner(name,catalog_area)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .is('category.deleted_at', null)

    if (filters.publication !== 'all') {
      query = query.eq('is_active', filters.publication === 'active')
    }

    if (filters.search !== undefined) {
      query = query.ilike('name', `%${escapePostgrestLikePattern(filters.search)}%`)
    }

    switch (filters.stock) {
      case 'inStock':
        query = query.gt('stock_quantity', 0)
        break
      case 'lowStock':
        query = query.gt('stock_quantity', 0).lte('stock_quantity', lowStockThreshold)
        break
      case 'outOfStock':
        query = query.eq('stock_quantity', 0)
        break
      case 'all':
        break
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
      case 'priceAsc':
        query = query.order('price', { ascending: true })
        break
      case 'priceDesc':
        query = query.order('price', { ascending: false })
        break
      case 'stockAsc':
        query = query.order('stock_quantity', { ascending: true })
        break
      case 'stockDesc':
        query = query.order('stock_quantity', { ascending: false })
        break
    }

    const firstRow = (filters.page - 1) * filters.pageSize
    const { count, data, error } = await query
      .order('id', { ascending: true })
      .range(firstRow, firstRow + filters.pageSize - 1)

    if (error !== null || count === null) {
      throw new RepositoryError('No fue posible consultar los productos administrativos')
    }

    const rows = adminProductRowsSchema.safeParse(data)

    if (!rows.success) {
      throw new RepositoryError('El listado administrativo devolvió un formato inválido')
    }

    return {
      items: rows.data.map((product) => ({
        catalogArea: product.category.catalog_area,
        categoryId: product.category_id,
        categoryName: product.category.name,
        id: product.id,
        imagePath: product.image_path,
        isActive: product.is_active,
        isFeatured: product.is_featured,
        name: product.name,
        price: product.price,
        slug: product.slug,
        stockQuantity: product.stock_quantity,
        updatedAt: product.updated_at,
      })),
      lowStockThreshold,
      totalItems: count,
    }
  }

  public async findCategoryOptions(): Promise<readonly IAdminProductCategoryOption[]> {
    const { data, error } = await this.client
      .from('categories')
      .select('id,name,catalog_area,is_active')
      .is('deleted_at', null)
      .order('catalog_area', { ascending: true })
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    if (error !== null) {
      throw new RepositoryError('No fue posible consultar las categorías')
    }

    const rows = adminProductCategoryRowsSchema.safeParse(data)

    if (!rows.success) {
      throw new RepositoryError('Las categorías devolvieron un formato inválido')
    }

    return rows.data.map((category) => ({
      catalogArea: category.catalog_area,
      id: category.id,
      isActive: category.is_active,
      name: category.name,
    }))
  }

  public async findCategoryById(categoryId: string): Promise<IAdminProductCategoryOption | null> {
    const { data, error } = await this.client
      .from('categories')
      .select('id,name,catalog_area,is_active')
      .eq('id', categoryId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error !== null) {
      throw new RepositoryError('No fue posible consultar la categoría')
    }

    if (data === null) return null

    const row = adminProductCategoryRowSchema.safeParse(data)
    if (!row.success) throw new RepositoryError('La categoría devolvió un formato inválido')

    return {
      catalogArea: row.data.catalog_area,
      id: row.data.id,
      isActive: row.data.is_active,
      name: row.data.name,
    }
  }

  public async findById(productId: string): Promise<IAdminProductRecord | null> {
    const { data, error } = await this.client
      .from('products')
      .select(PRODUCT_DETAIL_SELECT)
      .eq('id', productId)
      .is('deleted_at', null)
      .is('category.deleted_at', null)
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible consultar el producto')
    return data === null ? null : mapProduct(data)
  }

  public async create(input: IAdminProductCreateInput): Promise<IAdminProductRecord> {
    const { data, error } = await this.client
      .from('products')
      .insert({
        category_id: input.categoryId,
        description: input.description,
        image_path: null,
        is_active: input.isActive,
        is_featured: input.isFeatured,
        name: input.name,
        price: input.price,
        slug: input.slug,
        stock_quantity: input.stockQuantity,
      })
      .select('id')
      .single()

    if (error?.code === '23505') throw new ProductSlugConflictError()
    if (error !== null || data === null) throw new RepositoryError('No fue posible crear el producto')

    const product = await this.findById(data.id)
    if (product === null) throw new RepositoryError('No fue posible recuperar el producto creado')
    return product
  }

  public async update(
    productId: string,
    input: IAdminProductUpdateInput,
  ): Promise<IAdminProductRecord | null> {
    const { data, error } = await this.client
      .from('products')
      .update({
        category_id: input.categoryId,
        description: input.description,
        is_active: input.isActive,
        is_featured: input.isFeatured,
        name: input.name,
        price: input.price,
        slug: input.slug,
      })
      .eq('id', productId)
      .eq('updated_at', input.expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error?.code === '23505') throw new ProductSlugConflictError()
    if (error !== null) throw new RepositoryError('No fue posible actualizar el producto')
    if (data === null) return null
    return this.findById(productId)
  }

  public async updateImage(
    productId: string,
    imagePath: string | null,
    expectedUpdatedAt: string,
  ): Promise<IAdminProductRecord | null> {
    const { data, error } = await this.client
      .from('products')
      .update({ image_path: imagePath })
      .eq('id', productId)
      .eq('updated_at', expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible vincular la imagen')
    if (data === null) return null
    return this.findById(productId)
  }

  public async updateState(
    productId: string,
    input: IAdminProductStateUpdateInput,
  ): Promise<IAdminProductRecord | null> {
    const { data, error } = await this.client
      .from('products')
      .update({
        ...(input.isActive === undefined ? {} : { is_active: input.isActive }),
        ...(input.isFeatured === undefined ? {} : { is_featured: input.isFeatured }),
      })
      .eq('id', productId)
      .eq('updated_at', input.expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible actualizar el estado del producto')
    if (data === null) return null
    return this.findById(productId)
  }

  public async softDelete(productId: string, expectedUpdatedAt: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('updated_at', expectedUpdatedAt)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle()

    if (error !== null) throw new RepositoryError('No fue posible eliminar el producto')
    return data !== null
  }
}
