import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const directory = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(directory, '../../../..')

async function readFrontendFile(relativePath) {
  return readFile(resolve(frontendRoot, relativePath), 'utf8')
}

test('las páginas legales mantienen el alcance aprobado y no inventan identidad fiscal', async () => {
  const [terms, privacy, withdrawal] = await Promise.all([
    readFrontendFile('src/features/legal/components/TermsAndConditions.tsx'),
    readFrontendFile('src/features/legal/components/PrivacyPolicy.tsx'),
    readFrontendFile('src/pages/ConsumerWithdrawal/index.tsx'),
  ])
  const legalCopy = `${terms}\n${privacy}\n${withdrawal}`.toLowerCase()

  for (const excludedClaim of ['cuit', 'arca', 'monotributo', 'regularización fiscal']) {
    assert.equal(legalCopy.includes(excludedClaim), false, `claim must remain absent: ${excludedClaim}`)
  }
})

test('la privacidad documenta el buzón restringido sin crear persistencia adicional', async () => {
  const privacy = await readFrontendFile('src/features/legal/components/PrivacyPolicy.tsx')

  assert.match(privacy, /margaritas\.arteydeco\.jujuy@gmail\.com/)
  assert.match(privacy, /hilo de correo restringido/)
  assert.match(privacy, /No se crea una tabla, API ni nueva\s+persistencia/)
  assert.match(privacy, /contador y revisión legal final/)
})

test('las divulgaciones técnicas conservan cookies necesarias, fuentes locales y Turnstile condicional', async () => {
  const [privacy, indexHtml, variables] = await Promise.all([
    readFrontendFile('src/features/legal/components/PrivacyPolicy.tsx'),
    readFrontendFile('index.html'),
    readFrontendFile('src/styles/variables.css'),
  ])

  assert.match(privacy, /únicamente cookies técnicas/)
  assert.match(privacy, /no mostramos\s+un banner de consentimiento/)
  assert.match(privacy, /Cloudflare Turnstile/)
  assert.match(privacy, /períodos concretos y los\s+disparadores/)
  assert.equal(indexHtml.includes('fonts.googleapis.com'), false)
  assert.match(variables, /@font-face/)
})
