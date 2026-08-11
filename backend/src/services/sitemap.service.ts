import type { ICategoryService } from './categories.service.js'

const STATIC_PUBLIC_PATHS = [
  '/',
  '/productos',
  '/politica-de-privacidad',
  '/terminos-y-condiciones',
] as const

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export interface ISitemapService {
  generate(): Promise<string>
}

export class SitemapService implements ISitemapService {
  public constructor(
    private readonly categoryService: ICategoryService,
    private readonly publicSiteUrl: string,
  ) {}

  public async generate(): Promise<string> {
    const categories = await this.categoryService.listPublic({})
    const paths = [
      ...STATIC_PUBLIC_PATHS,
      ...categories.map((category) => `/categoria/${encodeURIComponent(category.slug)}`),
    ]
    const urls = paths.map((path) => {
      const location = new URL(path, `${this.publicSiteUrl}/`).href

      return `  <url><loc>${escapeXml(location)}</loc></url>`
    })

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n')
  }
}
