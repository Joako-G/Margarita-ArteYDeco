import { z } from 'zod'

const envSchema = z.object({
  VITE_API_URL: z.string().url(),
  VITE_TURNSTILE_SITE_KEY: z.string().min(1),
})

export const env = envSchema.parse({
  VITE_API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  VITE_TURNSTILE_SITE_KEY:
    import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA',
})
