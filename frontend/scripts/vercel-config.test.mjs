import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
const csp = config.headers
  .find(({ source }) => source === '/(.*)')
  .headers.find(({ key }) => key === 'Content-Security-Policy')
  .value

test('allows only the Turnstile origin required by the widget', () => {
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com/)
  assert.match(csp, /connect-src 'self' https:\/\/margarita-backend\.vercel\.app https:\/\/challenges\.cloudflare\.com/)
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com/)
  assert.doesNotMatch(csp, /https:\/\/\*\.cloudflare\.com/)
  assert.doesNotMatch(csp, /frame-src 'none'/)
})

test('uses the private noindex shell for withdrawal routes', () => {
  const rewrites = new Map(config.rewrites.map(({ source, destination }) => [source, destination]))
  const headers = new Map(config.headers.map(({ source, headers: routeHeaders }) => [
    source,
    new Map(routeHeaders.map(({ key, value }) => [key, value])),
  ]))

  for (const pathname of ['/arrepentimiento', '/arrepentimiento/consulta']) {
    assert.equal(rewrites.get(pathname), '/route-shells/private.html')
    assert.equal(headers.get(pathname).get('X-Robots-Tag'), 'noindex, nofollow, noarchive')
  }
})
