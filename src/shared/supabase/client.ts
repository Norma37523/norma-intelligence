'use client';

import { createBrowserClient } from '@supabase/ssr';

import { clientEnv } from '@/shared/config/env';
import type { Database } from '@/shared/types/database.types';

/**
 * Supabase client for Client Components and browser-side hooks.
 *
 * Use sparingly — prefer Server Components / Server Actions for data access.
 * This client respects RLS and inherits the user's session from cookies.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
