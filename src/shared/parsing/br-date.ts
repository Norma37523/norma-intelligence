/**
 * Parse Brazilian-formatted dates into ISO-8601 (YYYY-MM-DD) strings.
 *
 * Accepts:
 *  - "DD/MM/YYYY", "DD-MM-YYYY", "DD.MM.YYYY"
 *  - "DD/MM/YY"     → assumes 20YY for YY < 70, 19YY otherwise
 *  - "YYYY-MM-DD"   → passes through (Excel ISO format)
 *  - Excel serial   → number of days since 1899-12-30 (Excel epoch)
 *  - Date object    → ISO date portion
 *
 * Returns null if the input can't be confidently parsed.
 */
export function parseBrazilianDateToIso(input: unknown): string | null {
  if (input === null || input === undefined) return null;

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return null;
    return input.toISOString().slice(0, 10);
  }

  if (typeof input === 'number' && Number.isFinite(input)) {
    // Excel serial date (days since 1899-12-30, accounting for the 1900 leap-year bug).
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + input * 86_400_000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (s === '') return null;

  // ISO date (full or YYYY-MM-DD prefix)
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch as [string, string, string, string];
    return isValid(y, m, d) ? `${y}-${m}-${d}` : null;
  }

  // BR date with /, -, or .
  const brMatch = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2}|\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyRaw] = brMatch as [string, string, string, string];
    const yyyy = yyRaw.length === 2
      ? (Number(yyRaw) < 70 ? `20${yyRaw}` : `19${yyRaw}`)
      : yyRaw;
    const dPad = dd.padStart(2, '0');
    const mPad = mm.padStart(2, '0');
    return isValid(yyyy, mPad, dPad) ? `${yyyy}-${mPad}-${dPad}` : null;
  }

  return null;
}

function isValid(yyyy: string, mm: string, dd: string): boolean {
  const y = Number(yyyy);
  const m = Number(mm);
  const d = Number(dd);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}
