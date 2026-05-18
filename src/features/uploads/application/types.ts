import type { CategorizedRow, ColumnMapping } from '../domain';

export interface UploadPreview {
  readonly uploadId: string;
  readonly format: 'csv' | 'xlsx';
  readonly headers: string[];
  readonly mapping: ColumnMapping;
  readonly mappingScore: number;
  readonly rows: CategorizedRow[];
  readonly stats: {
    total: number;
    withErrors: number;
    needsReview: number;
    autoCategorized: number;
  };
  readonly warnings: string[];
}

export type UploadActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string; uploadId?: string }
  | { status: 'error'; message: string };

export const initialUploadState: UploadActionState = { status: 'idle' };
