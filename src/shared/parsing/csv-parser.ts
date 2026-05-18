import 'server-only';

import Papa from 'papaparse';

import { decodeBufferToUtf8 } from './encoding';

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  errors: string[];
  delimiter: string;
}

/**
 * Parse a CSV buffer into header + row dictionaries.
 *
 * Auto-detects delimiter (`;` / `,` / `\t`), and handles UTF-8 / Latin-1.
 * Skips empty rows. Trims headers.
 */
export function parseCsvBuffer(buf: ArrayBuffer | Uint8Array | Buffer): CsvParseResult {
  const text = decodeBufferToUtf8(buf);

  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    dynamicTyping: false,
  });

  const headers = (result.meta.fields ?? []).map((h) => h.trim()).filter(Boolean);

  return {
    headers,
    rows: result.data.filter((row): row is Record<string, string> =>
      row !== null && typeof row === 'object',
    ),
    errors: result.errors.map((e) => `${e.type}: ${e.message} (row ${e.row ?? '?'})`),
    delimiter: result.meta.delimiter || ',',
  };
}
