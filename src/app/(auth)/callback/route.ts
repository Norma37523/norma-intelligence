import { NextResponse, type NextRequest } from 'next/server';

import { createSupabaseServerClient } from '@/shared/supabase/server';

/**
 * Email-confirmation / magic-link callback.
 *
 * Supabase redirects the user here with `?code=...`. We exchange the code
 * for a session (sets cookies) and forward to `next` or the app dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/app';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}
