import 'server-only';

import { parseCsvBuffer } from '@/shared/parsing/csv-parser';
import { parseXlsxBuffer } from '@/shared/parsing/xlsx-parser';

import type { RawRow } from '../domain';

export type SourceFormat = 'csv' | 'xlsx';

export interface ParsedFile {
  readonly format: SourceFormat;
  readonly headers: string[];
  readonly rows: RawRow[];
  readonly errors: string[];
}

export function detectFormat(filename: string, mimeType: string | null): SourceFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) return 'csv';
  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xls')) return 'xlsx';
  if (mimeType) {
    if (mimeType.includes('csv') || mimeType.includes('text/plain')) return 'csv';
    if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) return 'xlsx';
  }
  return null;
}

/**
 * Parse a file buffer into a ParsedFile. Throws if format can't be detected.
 */
export function parseFile(
  buffer: ArrayBuffer | Uint8Array | Buffer,
  filename: string,
  mimeType: string | null = null,
): ParsedFile {
  const format = detectFormat(filename, mimeType);
  if (!format) {
    throw new Error(`Formato não suportado: ${filename}. Use CSV ou XLSX.`);
  }

  if (format === 'csv') {
    const r = parseCsvBuffer(buffer);
    return { format, headers: r.headers, rows: r.rows, errors: r.errors };
  }

  const r = parseXlsxBuffer(buffer);
  return { format, headers: r.headers, rows: r.rows, errors: r.errors };
}
