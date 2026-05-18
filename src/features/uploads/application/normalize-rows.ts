import { parseBrazilianAmountToMinor } from '@/shared/parsing/br-number';
import { parseBrazilianDateToIso } from '@/shared/parsing/br-date';

import type { ColumnMapping, NormalizedRow, RawRow, RowIssue } from '../domain';

/**
 * Apply a column mapping to raw rows and produce typed, normalized rows.
 *
 * Money normalization:
 *  - If `amount` column is mapped, parse it as signed BR number.
 *  - If `debit_amount` + `credit_amount` are mapped, take whichever is non-zero
 *    and assign sign accordingly (debit → negative).
 *
 * Each row carries `issues[]` — non-empty issues with level=error indicate the
 * row would be rejected at commit.
 */
export function normalizeRows(rawRows: RawRow[], mapping: ColumnMapping): NormalizedRow[] {
  return rawRows.map((raw, idx) => normalizeOne(raw, mapping, idx + 2)); // +2: row 1 is header
}

function normalizeOne(raw: RawRow, mapping: ColumnMapping, sourceLineNumber: number): NormalizedRow {
  const issues: RowIssue[] = [];

  // Date
  const rawDate = mapping.entry_date ? raw[mapping.entry_date] : null;
  let entryDate: string | null = null;
  if (rawDate === null || rawDate === undefined || rawDate === '') {
    issues.push({ level: 'error', code: 'missing_date', message: 'Data ausente.' });
  } else {
    entryDate = parseBrazilianDateToIso(rawDate);
    if (!entryDate) {
      issues.push({
        level: 'error',
        code: 'invalid_date',
        message: `Data inválida: "${String(rawDate)}".`,
      });
    }
  }

  // Description
  const rawDesc = mapping.description ? raw[mapping.description] : null;
  const description = rawDesc !== null && rawDesc !== undefined ? String(rawDesc).trim() : '';
  if (!description) {
    issues.push({ level: 'warning', code: 'missing_description', message: 'Descrição ausente.' });
  }

  // Amount
  let amountMinor = 0n;
  let direction: 'debit' | 'credit' = 'credit';
  let amountResolved = false;

  if (mapping.amount) {
    const parsed = parseBrazilianAmountToMinor(raw[mapping.amount]);
    if (parsed === null) {
      issues.push({
        level: 'error',
        code: 'invalid_amount',
        message: `Valor inválido: "${String(raw[mapping.amount] ?? '')}".`,
      });
    } else {
      amountMinor = parsed;
      direction = parsed < 0n ? 'debit' : 'credit';
      amountResolved = true;
    }
  } else if (mapping.debit_amount || mapping.credit_amount) {
    const debit = mapping.debit_amount ? parseBrazilianAmountToMinor(raw[mapping.debit_amount]) : null;
    const credit = mapping.credit_amount ? parseBrazilianAmountToMinor(raw[mapping.credit_amount]) : null;
    const dAbs = debit ? abs(debit) : 0n;
    const cAbs = credit ? abs(credit) : 0n;
    if (dAbs > 0n && cAbs === 0n) {
      amountMinor = -dAbs;
      direction = 'debit';
      amountResolved = true;
    } else if (cAbs > 0n && dAbs === 0n) {
      amountMinor = cAbs;
      direction = 'credit';
      amountResolved = true;
    } else if (dAbs > 0n && cAbs > 0n) {
      issues.push({
        level: 'warning',
        code: 'invalid_amount',
        message: 'Linha tem débito e crédito simultâneos.',
      });
    }
  }

  if (!amountResolved) {
    issues.push({ level: 'error', code: 'missing_amount', message: 'Valor ausente.' });
  }

  const documentNumber = pickString(raw, mapping.document_number);
  const counterpartyName = pickString(raw, mapping.counterparty_name);
  const counterpartyTaxId = pickString(raw, mapping.counterparty_tax_id);

  return {
    sourceLineNumber,
    entryDate,
    description,
    amountMinor,
    direction,
    documentNumber,
    counterpartyName,
    counterpartyTaxId,
    raw,
    issues,
  };
}

function pickString(raw: RawRow, key: string | undefined): string | null {
  if (!key) return null;
  const v = raw[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function abs(b: bigint): bigint {
  return b < 0n ? -b : b;
}
