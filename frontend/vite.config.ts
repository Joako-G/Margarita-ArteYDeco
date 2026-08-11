import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_SITE_URL = 'https://margaritas-arteydeco.vercel.app'

function getSiteUrl(mode: string): string {
  const value = loadEnv(mode, process.cwd(), '').VITE_SITE_URL ?? DEFAULT_SITE_URL
  const url = new URL(value)

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error('VITE_SITE_URL debe ser un origen HTTP o HTTPS sin ruta')
  }

  return url.origin
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const siteUrl = getSiteUrl(mode)

  return {
    build: {
      chunkSizeWarningLimit: 550,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
              return 'vendor-icons'
            }

            if (
              /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/.test(id)
            ) {
              return 'vendor-react'
            }

            if (/[\\/]node_modules[\\/](@tanstack|axios)[\\/]/.test(id)) {
              return 'vendor-remote-state'
            }
          },
        },
      },
    },
    define: {
      'import.meta.env.VITE_SITE_URL': JSON.stringify(siteUrl),
    },
    plugins: [
      react(),
      {
        name: 'canonical-site-url',
        transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
