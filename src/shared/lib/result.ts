/**
 * Result<T, E> — discriminated union for error handling without exceptions.
 *
 * Use case: application-layer use cases return Result so the presentation
 * layer can pattern-match on outcomes (`ok` vs `err`) instead of try/catch
 * chains. Reserve exceptions for truly exceptional conditions (programmer
 * errors, infrastructure failures).
 */
export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/** Unwrap a Result or throw — use only when you've already validated `ok`. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw result.error instanceof Error ? result.error : new Error(String(result.error));
  }
  return result.value;
}
