/**
 * Server-only barrel for the `auth` feature.
 *
 * Importing this from a Client Component will fail at build time, by design.
 * Use `@/features/auth` for the client-safe surface.
 */
import 'server-only';

export { getSession, requireSession } from './application/get-session';
