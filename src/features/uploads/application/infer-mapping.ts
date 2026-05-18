import type { CanonicalColumn, ColumnMapping, RawRow } from '../domain';
import { HEADER_SYNONYMS, normalizeHeader } from '../domain';

/**
 * Infer a column mapping from headers (and optionally a sample of rows).
 *
 * Strategy:
 *  1. For each canonical column, look for an exact synonym match in headers.
 *  2. If not found, fall back to substring match.
 *  3. For the `amount` family, prefer a single signed `amount` column;
 *     otherwise fall back to debit/credit pair if both present.
 */
export function inferColumnMapping(headers: string[], _sampleRows: RawRow[] = []): ColumnMapping {
  const normHeaders = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }));
  const mapping: ColumnMapping = {};

  for (const slot of Object.keys(HEADER_SYNONYMS) as CanonicalColumn[]) {
    if (slot === 'ignore') continue;
    const synonyms = HEADER_SYNONYMS[slot];
    if (synonyms.length === 0) continue;

    let match = normHeaders.find((h) => synonyms.includes(h.norm));
    if (!match) {
      match = normHeaders.find((h) => synonyms.some((s) => h.norm.includes(s)));
    }
    if (match && !Object.values(mapping).includes(match.original)) {
      mapping[slot] = match.original;
    }
  }

  // If we got both debit_amount and credit_amount AND an amount, drop the pair.
  if (mapping.amount && (mapping.debit_amount || mapping.credit_amount)) {
    delete mapping.debit_amount;
    delete mapping.credit_amount;
  }

  return mapping;
}

/**
 * Score how confident we are in the inferred mapping.
 * Returns 0..1; UI may warn the user if below ~0.5.
 */
export function scoreMapping(mapping: ColumnMapping): number {
  const hasDate = !!mapping.entry_date;
  const hasDesc = !!mapping.description;
  const hasAmount = !!mapping.amount || (!!mapping.debit_amount && !!mapping.credit_amount);
  const extras = [
    mapping.document_number,
    mapping.counterparty_name,
    mapping.counterparty_tax_id,
    mapping.cost_center,
  ].filter(Boolean).length;

  let score = 0;
  if (hasDate) score += 0.35;
  if (hasDesc) score += 0.3;
  if (hasAmount) score += 0.3;
  score += Math.min(extras * 0.05, 0.15);
  return Math.min(score, 1);
}
