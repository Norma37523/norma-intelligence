import { createClient } from '@supabase/supabase-js';

import { clientEnv, serverEnv } from '@/shared/config/env';
import type { Database } from '@/shared/types/database.types';

/**
 * Privileged Supabase client that **bypasses RLS**.
 *
 * Use ONLY in:
 *  - Server Actions or Route Handlers that have already authorized the caller.
 *  - Background jobs (cron, webhooks) where there is no user session.
 *
 * NEVER import this from a Client Component or page that is reachable
 * without prior server-side authorization. Leaking the service role key is
 * a critical incident.
 */
export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('createSupabaseAdminClient must never run in the browser.');
  }
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
