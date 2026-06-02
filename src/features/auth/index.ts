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

// ⚠️  Server actions (signInWithPassword, signUpWithPassword, signOut) NÃO são
// re-exportadas aqui para evitar o erro "Server Action not found" do Next.js 15.x.
// Importe-as diretamente de './application/actions' onde necessário.
export type { AuthActionState } from './application/types';
export { initialAuthState } from './application/types';

export { LoginForm } from './presentation/login-form';
