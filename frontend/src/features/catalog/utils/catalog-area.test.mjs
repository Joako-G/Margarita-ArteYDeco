import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCatalogMenu,
  filterCategoriesByArea,
  getCatalogAreaQuery,
  isCatalogMenuGroup,
  parseCatalogArea,
} from './catalog-area.ts'

const categories = [
  { catalogArea: 'art', id: 'art-1' },
  { catalogArea: 'decoration', id: 'decoration-1' },
  { catalogArea: 'art', id: 'art-2' },
]

test('convierte los valores públicos de la URL al área interna', () => {
  assert.equal(parseCatalogArea('arte'), 'art')
  assert.equal(parseCatalogArea('decoraciones'), 'decoration')
  assert.equal(parseCatalogArea('otro'), null)
  assert.equal(parseCatalogArea(null), null)
})

test('genera el valor público de URL correspondiente a cada área', () => {
  assert.equal(getCatalogAreaQuery('art'), 'arte')
  assert.equal(getCatalogAreaQuery('decoration'), 'decoraciones')
})

test('filtra categorías sin mezclar Arte y Decoraciones', () => {
  assert.deepEqual(
    filterCategoriesByArea(categories, 'art').map((category) => category.id),
    ['art-1', 'art-2'],
  )
  assert.deepEqual(
    filterCategoriesByArea(categories, 'decoration').map((category) => category.id),
    ['decoration-1'],
  )
  assert.equal(filterCategoriesByArea(categories, 'all').length, 3)
})

const menuCategories = [
  {
    catalogArea: 'art',
    displayOrder: 1,
    id: 'art-1',
    isActive: true,
    name: 'Estampas',
    slug: 'estampas',
  },
  {
    catalogArea: 'art',
    displayOrder: 0,
    id: 'art-2',
    isActive: true,
    name: 'Láminas de seda',
    slug: 'laminas-de-seda',
  },
  {
    catalogArea: 'art',
    displayOrder: 2,
    id: 'art-3',
    isActive: false,
    name: 'Categoría pausada',
    slug: 'categoria-pausada',
  },
  {
    catalogArea: 'decoration',
    displayOrder: 0,
    id: 'decoration-1',
    isActive: true,
    name: 'Decoración para el hogar',
    slug: 'decoracion-para-el-hogar',
  },
]

test('arma el menú con el acceso a todo el catálogo y un grupo por área', () => {
  const menu = buildCatalogMenu(menuCategories)

  assert.deepEqual(menu[0], { href: '/productos', label: 'Ver todo en Productos' })
  assert.equal(menu.length, 3)
  assert.deepEqual(
    menu.slice(1).map((node) => [isCatalogMenuGroup(node), node.label]),
    [
      [true, 'Arte'],
      [true, 'Decoraciones'],
    ],
  )
})

test('cada área abre con su acceso a todo y sigue con sus categorías por orden', () => {
  const [, artGroup, decorationGroup] = buildCatalogMenu(menuCategories)

  assert.deepEqual(artGroup.items, [
    { href: '/productos?area=arte', label: 'Ver todo en Arte' },
    { href: '/categoria/laminas-de-seda', label: 'Láminas de seda' },
    { href: '/categoria/estampas', label: 'Estampas' },
  ])
  assert.deepEqual(decorationGroup.items, [
    { href: '/productos?area=decoraciones', label: 'Ver todo en Decoraciones' },
    { href: '/categoria/decoracion-para-el-hogar', label: 'Decoración para el hogar' },
  ])
})

test('deja fuera del menú las categorías inactivas', () => {
  const [, artGroup] = buildCatalogMenu(menuCategories)

  assert.equal(
    artGroup.items.some((item) => item.href === '/categoria/categoria-pausada'),
    false,
  )
})

test('arma el menú sin categorías y sin alterar el listado recibido', () => {
  const originalOrder = menuCategories.map((category) => category.id)
  const [, artGroup, decorationGroup] = buildCatalogMenu([])

  assert.deepEqual(artGroup.items, [
    { href: '/productos?area=arte', label: 'Ver todo en Arte' },
  ])
  assert.deepEqual(decorationGroup.items, [
    { href: '/productos?area=decoraciones', label: 'Ver todo en Decoraciones' },
  ])

  buildCatalogMenu(menuCategories)
  assert.deepEqual(
    menuCategories.map((category) => category.id),
    originalOrder,
  )
})

test('distingue los grupos del menú de los enlaces simples', () => {
  assert.equal(isCatalogMenuGroup({ href: '/productos', label: 'Ver todo en Productos' }), false)
  assert.equal(isCatalogMenuGroup({ id: 'grupo', items: [], label: 'Arte' }), true)
})
