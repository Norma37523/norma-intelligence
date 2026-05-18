/**
 * Auth domain types.
 *
 * The domain layer holds entities and value objects that are framework-agnostic.
 * No imports from Next.js, Supabase, or React are allowed here.
 */

export type UserId = string;
export type OrganizationId = string;

export type MemberRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface AuthenticatedUser {
  readonly id: UserId;
  readonly email: string;
  readonly fullName: string | null;
  readonly avatarUrl: string | null;
}

export interface OrganizationMembership {
  readonly organizationId: OrganizationId;
  readonly role: MemberRole;
}

export interface SessionContext {
  readonly user: AuthenticatedUser;
  readonly memberships: ReadonlyArray<OrganizationMembership>;
  readonly currentOrganizationId: OrganizationId | null;
}
