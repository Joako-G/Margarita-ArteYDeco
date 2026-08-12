import assert from 'node:assert/strict'
import test from 'node:test'

import { createSocialLinks } from './social-links.ts'

test('renderiza únicamente las redes configuradas', () => {
  const links = createSocialLinks({
    facebook: null,
    instagram: 'https://instagram.com/margaritas',
    tiktok: 'https://tiktok.com/@margaritas',
  })

  assert.deepEqual(
    links.map(({ id, url }) => ({ id, url })),
    [
      { id: 'instagram', url: 'https://instagram.com/margaritas' },
      { id: 'tiktok', url: 'https://tiktok.com/@margaritas' },
    ],
  )
})

test('oculta TikTok cuando no está configurado', () => {
  const links = createSocialLinks({
    facebook: null,
    instagram: null,
    tiktok: null,
  })

  assert.deepEqual(links, [])
})
