/**
 * Tagged application errors. The `code` is stable and machine-readable; the
 * `message` is user-facing (PT-BR by default).
 */
export type AppErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  override readonly cause?: unknown;

  constructor(code: AppErrorCode, message: string, status: number, cause?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Sessão expirada. Faça login novamente.') {
    super('UNAUTHENTICATED', message, 401);
    this.name = 'UnauthenticatedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Você não tem permissão para acessar este recurso.') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super('NOT_FOUND', message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(fieldErrors: Record<string, string[]>, message = 'Dados inválidos.') {
    super('VALIDATION_FAILED', message, 422);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflito de estado.') {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}
