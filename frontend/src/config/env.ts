import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_SITE_URL: z
    .string()
    .url()
    .transform((value, context) => {
      const url = new URL(value)

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        context.addIssue({
          code: 'custom',
          message: 'VITE_SITE_URL debe ser un origen HTTP o HTTPS sin ruta',
        })

        return z.NEVER
      }

      return url.origin
    }),
  VITE_TURNSTILE_SITE_KEY: z.string().min(1),
})

export const env = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  VITE_SITE_URL: import.meta.env.VITE_SITE_URL ?? 'https://margaritas-arteydeco.vercel.app',
  VITE_TURNSTILE_SITE_KEY: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA',
})
