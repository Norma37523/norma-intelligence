/**
 * Parse Brazilian-formatted numbers ("1.234,56") into bigint minor units.
 *
 * Accepts:
 *  - "1.234,56"          → 123456 minor units
 *  - "1234,56"           → 123456
 *  - "1234.56"           → 123456  (ambiguous; treated as US-style decimal)
 *  - "R$ 1.234,56"       → 123456
 *  - "(1.234,56)" or "-1.234,56" → -123456
 *  - ""                  → null
 *  - bigint / number     → passes through with rounding
 *
 * Returns null if the input can't be confidently parsed.
 */
export function parseBrazilianAmountToMinor(input: unknown): bigint | null {
  if (input === null || input === undefined) return null;

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return null;
    return BigInt(Math.round(input * 100));
  }

  if (typeof input === 'bigint') {
    return input;
  }

  if (typeof input !== 'string') return null;

  let s = input.trim();
  if (s === '' || s === '-' || s === '0,00' || s === '0.00') {
    return s === '' ? null : 0n;
  }

  // Detect parentheses negative.
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1).trim();
  }

  // Strip currency symbols and stray text.
  s = s.replace(/R\$\s*/gi, '');
  s = s.replace(/\s/g, '');

  // Leading minus
  if (s.startsWith('-')) {
    sign = sign * -1;
    s = s.slice(1);
  }
  if (s.startsWith('+')) s = s.slice(1);

  // Trailing CR/DR markers from Brazilian bank exports.
  if (/[CD]$/i.test(s)) {
    const marker = s.slice(-1).toUpperCase();
    if (marker === 'D') sign = sign * -1;
    s = s.slice(0, -1);
  }

  if (s === '') return null;

  // Decide separator: if both "." and "," present, last one is decimal.
  const hasDot = s.includes('.');
  const hasComma = s.includes(',');
  let decimalSep: '.' | ',' | null = null;

  if (hasDot && hasComma) {
    decimalSep = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.';
  } else if (hasComma) {
    // 1234,56 → decimal. 1,234 (no dot) → ambiguous BR convention; assume decimal if exactly 2 fraction digits.
    decimalSep = ',';
  } else if (hasDot) {
    const frac = s.split('.').pop() ?? '';
    decimalSep = frac.length === 2 ? '.' : null;
  }

  if (decimalSep === null) {
    // Integer-only string.
    if (!/^\d+$/.test(s)) return null;
    return BigInt(sign) * BigInt(s) * 100n;
  }

  // Split into whole + fractional.
  const otherSep = decimalSep === ',' ? '.' : ',';
  const cleaned = s.split(otherSep).join('');
  const idx = cleaned.lastIndexOf(decimalSep);
  if (idx < 0) return null;
  const whole = cleaned.slice(0, idx).replace(/[^\d]/g, '');
  const fracRaw = cleaned.slice(idx + 1).replace(/[^\d]/g, '');
  if (whole === '' && fracRaw === '') return null;
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(fracRaw)) return null;

  const frac = (fracRaw + '00').slice(0, 2);
  const minor = BigInt(whole === '' ? '0' : whole) * 100n + BigInt(frac);
  return BigInt(sign) * minor;
}
