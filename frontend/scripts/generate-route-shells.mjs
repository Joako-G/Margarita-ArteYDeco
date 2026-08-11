import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = resolve(projectDirectory, 'dist')
const shellsDirectory = resolve(distDirectory, 'route-shells')
const defaultSiteUrl = 'https://margaritas-arteydeco.vercel.app'
const siteUrl = new URL(process.env.VITE_SITE_URL ?? defaultSiteUrl).origin
const defaultDescription =
  'Materiales, herramientas y accesorios para manualidades, decoración y proyectos creativos.'

const routeShells = [
  {
    fileName: 'products.html',
    pathname: '/productos',
    title: 'Productos | Margaritas Arte & Deco',
    description:
      'Explorá materiales para crear y decoraciones artesanales listas para regalar o transformar tus espacios.',
    robots: 'index, follow',
  },
  {
    fileName: 'privacy.html',
    pathname: '/politica-de-privacidad',
    title: 'Política de Privacidad | Margaritas Arte & Deco',
    description:
      'Conocé cómo Margaritas Arte & Deco recopila, utiliza y protege los datos personales de quienes compran en nuestro sitio.',
    robots: 'index, follow',
  },
  {
    fileName: 'terms.html',
    pathname: '/terminos-y-condiciones',
    title: 'Términos y Condiciones | Margaritas Arte & Deco',
    description:
      'Conocé las condiciones para utilizar el sitio y enviar pedidos a Margaritas Arte & Deco.',
    robots: 'index, follow',
  },
  {
    fileName: 'category.html',
    pathname: null,
    title: 'Productos por categoría | Margaritas Arte & Deco',
    description:
      'Explorá materiales y herramientas organizados por categoría para encontrar lo que necesitás para tu próximo proyecto.',
    robots: 'index, follow',
  },
  {
    fileName: 'private.html',
    pathname: null,
    title: 'Área privada | Margaritas Arte & Deco',
    description: defaultDescription,
    robots: 'noindex, nofollow',
  },
]

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function setMeta(html, attribute, key, content) {
  const pattern = new RegExp(`<meta\\s+${attribute}="${escapeRegExp(key)}"[\\s\\S]*?\\/?>`, 'i')
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`

  if (pattern.test(html)) return html.replace(pattern, tag)

  return html.replace('</head>', `  ${tag}\n</head>`)
}

function removeMeta(html, attribute, key) {
  const pattern = new RegExp(`\\s*<meta\\s+${attribute}="${escapeRegExp(key)}"[\\s\\S]*?\\/?>`, 'i')

  return html.replace(pattern, '')
}

function setCanonical(html, pathname) {
  const canonicalPattern = /<link\s+rel="canonical"[\s\S]*?\/?>/i

  if (pathname === null) return html.replace(/\s*<link\s+rel="canonical"[\s\S]*?\/?>/i, '')

  const canonicalUrl = new URL(pathname, `${siteUrl}/`).href

  return html.replace(
    canonicalPattern,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
  )
}

function createShell(sourceHtml, metadata) {
  let html = sourceHtml.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(metadata.title)}</title>`,
  )
  html = setMeta(html, 'name', 'description', metadata.description)
  html = setMeta(html, 'name', 'robots', metadata.robots)
  html = setMeta(html, 'property', 'og:title', metadata.title)
  html = setMeta(html, 'property', 'og:description', metadata.description)
  html = setMeta(html, 'name', 'twitter:title', metadata.title)
  html = setMeta(html, 'name', 'twitter:description', metadata.description)
  html = setCanonical(html, metadata.pathname)

  if (metadata.pathname === null) {
    html = removeMeta(html, 'property', 'og:url')
  } else {
    html = setMeta(html, 'property', 'og:url', new URL(metadata.pathname, `${siteUrl}/`).href)
  }

  return html
}

const sourceHtml = await readFile(resolve(distDirectory, 'index.html'), 'utf8')
await mkdir(shellsDirectory, { recursive: true })

await Promise.all(
  routeShells.map((metadata) =>
    writeFile(
      resolve(shellsDirectory, metadata.fileName),
      createShell(sourceHtml, metadata),
      'utf8',
    ),
  ),
)

await copyFile(
  resolve(projectDirectory, 'src/assets/images/hero-decoracion-800.webp'),
  resolve(distDirectory, 'social-preview.webp'),
)
