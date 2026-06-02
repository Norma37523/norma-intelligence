/**
 * Public API of the `uploads` feature — client-safe surface.
 * Server-only members (server actions etc.) are re-exported here because they're
 * already RPC-safe ('use server'). Repositories and parsers live in ./server.
 */
export type {
  RawRow,
  CanonicalColumn,
  ColumnMapping,
  NormalizedRow,
  CategorizedRow,
  RowIssue,
  RowIssueLevel,
} from './domain';

// ⚠️  Server actions NÃO re-exportadas aqui para evitar "Server Action not found".
// Importe de '@/features/uploads/application/actions' diretamente.
export type { UploadActionState, UploadPreview } from './application/types';
export { initialUploadState } from './application/types';

export { UploadDropzone } from './presentation/upload-dropzone';
export { PreviewTable } from './presentation/preview-table';
export { CommitButton } from './presentation/commit-button';
