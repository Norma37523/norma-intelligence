export type AuthActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string }
  | { status: 'error'; message?: string; fieldErrors?: Record<string, string[]> };

export const initialAuthState: AuthActionState = { status: 'idle' };
