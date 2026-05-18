/**
 * Public API of the `auth` feature — client-safe surface.
 *
 * Server-only members (e.g. requireSession) live in ./server to keep this
 * barrel importable from Client Components.
 */
export type {
  AuthenticatedUser,
  SessionContext,
  OrganizationMembership,
  MemberRole,
} from './domain/session';

export { signInWithPassword, signUpWithPassword, signOut } from './application/actions';
export type { AuthActionState } from './application/types';
export { initialAuthState } from './application/types';

export { LoginForm } from './presentation/login-form';
