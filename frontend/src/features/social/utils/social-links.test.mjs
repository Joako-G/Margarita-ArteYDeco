import assert from 'node:assert/strict'
import test from 'node:test'

import { createSocialLinks, TEMPORARY_TIKTOK_URL } from './social-links.ts'

test('renderiza únicamente las redes configuradas y TikTok temporal', () => {
  const links = createSocialLinks({
    facebook: null,
    instagram: 'https://instagram.com/margaritas',
  })

  assert.deepEqual(
    links.map(({ id, url }) => ({ id, url })),
    [
      { id: 'instagram', url: 'https://instagram.com/margaritas' },
      { id: 'tiktok', url: TEMPORARY_TIKTOK_URL },
    ],
  )
})
