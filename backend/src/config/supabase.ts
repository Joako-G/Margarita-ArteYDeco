import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { IDatabase } from '../types/database.js'
import type { IEnv } from './env.js'

export type ServerSupabaseClient = SupabaseClient<IDatabase>

export function createSupabaseClient(
  env: Pick<IEnv, 'supabaseSecretKey' | 'supabaseUrl'>,
): ServerSupabaseClient {
  return createClient<IDatabase>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'margarita-api/0.1.0',
      },
    },
  })
}
