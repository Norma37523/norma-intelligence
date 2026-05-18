/**
 * Domain shapes used across the upload pipeline.
 *
 *   raw  →  ParsedRow  →  NormalizedRow  →  CategorizedRow  →  financial_entries
 *           (string columns)  (typed, normalized)   (with account/cost center)
 */

/** A single row from the parsed file — strings/numbers keyed by the file's original headers. */
export type RawRow = Record<string, string | number>;

/**
 * Canonical column intent. The mapper translates raw headers into these slots.
 */
export type CanonicalColumn =
  | 'entry_date'
  | 'description'
  | 'amount'               // single column, signed
  | 'debit_amount'         // separate debit column
  | 'credit_amount'        // separate credit column
  | 'document_number'
  | 'counterparty_name'
  | 'counterparty_tax_id'
  | 'cost_center'
  | 'debit_account_code'
  | 'credit_account_code'
  | 'notes'
  | 'ignore';

/** Mapping from each canonical slot to a file header (or null if missing). */
export type ColumnMapping = Partial<Record<CanonicalColumn, string>>;

/** A row after applying the column mapping, with normalized types. */
export interface NormalizedRow {
  readonly sourceLineNumber: number;       // 1-based row index in the file
  readonly entryDate: string | null;        // ISO yyyy-mm-dd
  readonly description: string;
  readonly amountMinor: bigint;             // signed; debit = negative, credit = positive
  readonly direction: 'debit' | 'credit';
  readonly documentNumber: string | null;
  readonly counterpartyName: string | null;
  readonly counterpartyTaxId: string | null;
  readonly raw: RawRow;
  readonly issues: ReadonlyArray<RowIssue>;
}

export type RowIssueLevel = 'warning' | 'error';

export interface RowIssue {
  readonly level: RowIssueLevel;
  readonly code:
    | 'missing_date'
    | 'invalid_date'
    | 'missing_amount'
    | 'invalid_amount'
    | 'missing_description'
    | 'duplicate'
    | 'unknown_account';
  readonly message: string;
}

/** After categorization: account id assignments + confidence. */
export interface CategorizedRow extends NormalizedRow {
  readonly debitAccountId: string | null;
  readonly creditAccountId: string | null;
  readonly costCenterId: string | null;
  readonly categorization: {
    readonly source: 'history' | 'rule' | 'manual' | 'fallback';
    readonly score: number;                 // 0..1
    readonly needsReview: boolean;
  };
}
