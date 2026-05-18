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

export {
  createUpload,
  previewUpload,
  commitUpload,
  deleteUpload,
} from './application/actions';
export type { UploadActionState, UploadPreview } from './application/types';
export { initialUploadState } from './application/types';

export { UploadDropzone } from './presentation/upload-dropzone';
export { PreviewTable } from './presentation/preview-table';
export { CommitButton } from './presentation/commit-button';
