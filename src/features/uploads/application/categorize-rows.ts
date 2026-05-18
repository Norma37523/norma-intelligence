import { normalizeHeader } from '../domain';
import { DEFAULT_RULES, type CategorizationRule } from '../domain';
import type { CategorizedRow, NormalizedRow } from '../domain';

/**
 * Minimal shape of a chart_of_accounts row needed to score matches.
 */
export interface AccountCandidate {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  readonly is_analytical: boolean;
}

/**
 * Historical entry: one already-categorized counterparty → which account was used.
 * Built by the repository from past financial_entries.
 */
export interface HistoricalMatch {
  readonly counterpartyKey: string;        // normalized counterparty or description token
  readonly accountId: string;
  readonly hits: number;                   // how many times this was used
}

export interface CategorizerInput {
  readonly accounts: ReadonlyArray<AccountCandidate>;
  readonly history: ReadonlyArray<HistoricalMatch>;
  /** Default cash/bank account used as the *other* side of every entry. */
  readonly defaultCashAccountId: string | null;
  /** Account used when nothing matches (gets `needsReview: true`). */
  readonly fallbackSuspenseAccountId: string | null;
  /** Optional override rules. Falls back to DEFAULT_RULES. */
  readonly rules?: ReadonlyArray<CategorizationRule>;
}

/**
 * Assign debit/credit account ids to each normalized row.
 *
 * Strategy:
 *   1. Lookup by counterparty in history (highest priority — explicit signal).
 *   2. Apply rule patterns against the description.
 *   3. Fallback to the suspense account with needsReview=true.
 *
 * The other side of the entry (cash account) is always the company's default
 * bank/cash account. Debit/credit assignment follows the row direction:
 *   - direction='credit' (money in)  → debit cash,  credit revenue/liability
 *   - direction='debit'  (money out) → debit expense, credit cash
 */
export function categorizeRows(
  rows: ReadonlyArray<NormalizedRow>,
  input: CategorizerInput,
): CategorizedRow[] {
  const rules = input.rules ?? DEFAULT_RULES;
  const historyIndex = buildHistoryIndex(input.history);

  return rows.map((row) => categorizeOne(row, rules, historyIndex, input));
}

function categorizeOne(
  row: NormalizedRow,
  rules: ReadonlyArray<CategorizationRule>,
  historyIndex: Map<string, HistoricalMatch>,
  input: CategorizerInput,
): CategorizedRow {
  const searchText = [row.description, row.counterpartyName ?? ''].join(' ').toLowerCase();

  // 1. History lookup
  const historyKey = makeHistoryKey(row.counterpartyName ?? row.description);
  const historyHit = historyIndex.get(historyKey);
  if (historyHit) {
    return assignAccounts(row, historyHit.accountId, input.defaultCashAccountId, {
      source: 'history',
      score: Math.min(0.6 + historyHit.hits * 0.05, 0.98),
      needsReview: false,
    });
  }

  // 2. Rules
  const matchedRule = rules.find((r) => r.pattern.test(searchText));
  if (matchedRule) {
    const account = pickAccountForRule(input.accounts, matchedRule);
    if (account) {
      return assignAccounts(row, account.id, input.defaultCashAccountId, {
        source: 'rule',
        score: 0.7,
        needsReview: false,
      });
    }
  }

  // 3. Fallback
  return assignAccounts(row, input.fallbackSuspenseAccountId, input.defaultCashAccountId, {
    source: 'fallback',
    score: 0,
    needsReview: true,
  });
}

function assignAccounts(
  row: NormalizedRow,
  primaryAccountId: string | null,
  cashAccountId: string | null,
  categorization: CategorizedRow['categorization'],
): CategorizedRow {
  // money out → primary on debit, cash on credit
  // money in  → cash on debit, primary on credit
  let debitAccountId: string | null;
  let creditAccountId: string | null;
  if (row.direction === 'debit') {
    debitAccountId = primaryAccountId;
    creditAccountId = cashAccountId;
  } else {
    debitAccountId = cashAccountId;
    creditAccountId = primaryAccountId;
  }

  return {
    ...row,
    debitAccountId,
    creditAccountId,
    costCenterId: null,
    categorization,
  };
}

function pickAccountForRule(
  accounts: ReadonlyArray<AccountCandidate>,
  rule: CategorizationRule,
): AccountCandidate | null {
  const candidates = accounts.filter(
    (a) => a.is_analytical && a.account_type === rule.accountTypeHint,
  );
  if (candidates.length === 0) return null;

  // Score by how many of the rule's nameContains tokens appear in the account name.
  let best: { acc: AccountCandidate; score: number } | null = null;
  for (const acc of candidates) {
    const norm = normalizeHeader(acc.name);
    const score = rule.nameContains.reduce(
      (s, token) => (norm.includes(normalizeHeader(token)) ? s + 1 : s),
      0,
    );
    if (score > 0 && (!best || score > best.score)) {
      best = { acc, score };
    }
  }
  // If no hint matched any account, return the first analytical of that type.
  return best?.acc ?? candidates[0] ?? null;
}

function buildHistoryIndex(history: ReadonlyArray<HistoricalMatch>): Map<string, HistoricalMatch> {
  const map = new Map<string, HistoricalMatch>();
  for (const h of history) {
    const existing = map.get(h.counterpartyKey);
    if (!existing || h.hits > existing.hits) {
      map.set(h.counterpartyKey, h);
    }
  }
  return map;
}

export function makeHistoryKey(counterpartyOrDescription: string): string {
  return normalizeHeader(counterpartyOrDescription).slice(0, 80);
}
