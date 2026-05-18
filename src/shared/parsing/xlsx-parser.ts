import 'server-only';

import * as XLSX from 'xlsx';

export interface XlsxParseResult {
  sheetName: string;
  headers: string[];
  rows: Record<string, string | number>[];
  errors: string[];
}

/**
 * Parse the first sheet of an XLSX buffer into header + row dictionaries.
 *
 * Heuristic for the header row: assume row 1 contains headers. If the user
 * has metadata above (common in bank exports), they'll need to clean it first
 * — we don't try to detect that here.
 */
export function parseXlsxBuffer(buf: ArrayBuffer | Uint8Array | Buffer): XlsxParseResult {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayBuffer);
  const workbook = XLSX.read(u8, { type: 'array', cellDates: false, cellNF: false });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { sheetName: '', headers: [], rows: [], errors: ['Workbook tem nenhuma planilha.'] };
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    return { sheetName, headers: [], rows: [], errors: ['Planilha vazia.'] };
  }

  const raw: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: false,
  });

  if (raw.length === 0) {
    return { sheetName, headers: [], rows: [], errors: ['Planilha sem linhas.'] };
  }

  const headerRow = raw[0] ?? [];
  const headers = headerRow.map((h, i) =>
    typeof h === 'string' ? h.trim() : h !== null && h !== undefined ? String(h) : `col_${i + 1}`,
  );

  const rows: Record<string, string | number>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r) continue;
    const obj: Record<string, string | number> = {};
    let hasValue = false;
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] ?? `col_${c + 1}`;
      const cell = r[c];
      if (cell !== null && cell !== undefined && cell !== '') {
        obj[key] = cell as string | number;
        hasValue = true;
      } else {
        obj[key] = '';
      }
    }
    if (hasValue) rows.push(obj);
  }

  return { sheetName, headers, rows, errors: [] };
}
