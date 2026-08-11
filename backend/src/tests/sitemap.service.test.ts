import { describe, expect, it, vi } from 'vitest'

import type { ICategoryService } from '../services/categories.service.js'
import { SitemapService } from '../services/sitemap.service.js'

describe('SitemapService', () => {
  it('escapes generated URLs and includes only configured public pages', async () => {
    const categoryService: ICategoryService = {
      listPublic: vi.fn().mockResolvedValue([
        {
          catalogArea: 'art',
          description: '',
          displayOrder: 0,
          id: 'category-id',
          imageUrl: null,
          name: 'Arte & Deco',
          slug: 'arte-&-deco',
        },
      ]),
    }
    const service = new SitemapService(categoryService, 'https://example.com')

    const sitemap = await service.generate()

    expect(sitemap).toContain('<loc>https://example.com/productos</loc>')
    expect(sitemap).toContain('<loc>https://example.com/categoria/arte-%26-deco</loc>')
    expect(sitemap).not.toContain('/recuperar-pedido')
  })
})
