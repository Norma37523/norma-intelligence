import 'server-only';

import { createSupabaseServerClient } from '@/shared/supabase/server';
import { UnauthenticatedError } from '@/shared/errors/app-error';

import type { MemberRole, SessionContext } from '../domain/session';

interface ProfileRow {
  full_name: string | null;
  avatar_url: string | null;
  default_organization_id: string | null;
}

interface MembershipRow {
  organization_id: string;
  role: MemberRole;
}

/**
 * Load the current authenticated session — user, memberships, current org.
 * Returns null if there is no authenticated user.
 */
export async function getSession(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, membershipsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, default_organization_id')
      .eq('id', user.id)
      .maybeSingle()
      .returns<ProfileRow | null>(),
    supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .returns<MembershipRow[]>(),
  ]);

  const profile = profileResult.data;
  const memberships = membershipsResult.data ?? [];

  const currentOrganizationId =
    profile?.default_organization_id ?? memberships[0]?.organization_id ?? null;

  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
    memberships: memberships.map((m) => ({
      organizationId: m.organization_id,
      role: m.role,
    })),
    currentOrganizationId,
  };
}

/**
 * Server-side guard. Throws UnauthenticatedError if no session.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (!session) throw new UnauthenticatedError();
  return session;
}
