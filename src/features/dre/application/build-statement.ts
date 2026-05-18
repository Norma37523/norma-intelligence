import { Money } from '@/shared/money/money';

import type { DRELine, DRELineType, DREStatement } from '../domain/dre-statement';
import type { Period } from '../domain/period';

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

export interface DREGroupInput {
  readonly id: string;
  readonly parentId: string | null;
  readonly label: string;
  readonly lineType: DRELineType;
  readonly sign: 1 | -1;
  readonly sortOrder: number;
  readonly isSubtotal: boolean;
}

export interface AccountMappingInput {
  readonly accountId: string;
  readonly dreGroupId: string;
  readonly weight: number;            // -1..1, usually 1
}

export interface EntryInput {
  /** "YYYY-MM" period the entry belongs to (derived from entry_date). */
  readonly period: string;
  readonly debitAccountId: string | null;
  readonly creditAccountId: string | null;
  /** Always positive minor units; direction tells which side moved. */
  readonly amountMinor: bigint;
  readonly direction: 'debit' | 'credit';
}

export interface AccountInput {
  readonly id: string;
  /** From chart_of_accounts.account_type — used to decide if a hit on debit or credit increments the DRE line. */
  readonly accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
}

export interface BuildStatementArgs {
  readonly organizationId: string;
  readonly companyId: string;
  readonly periods: ReadonlyArray<Period>;            // ordered oldest → newest
  readonly groups: ReadonlyArray<DREGroupInput>;
  readonly mappings: ReadonlyArray<AccountMappingInput>;
  readonly accounts: ReadonlyArray<AccountInput>;
  readonly entries: ReadonlyArray<EntryInput>;
}

/* -------------------------------------------------------------------------- */
/* Core: build DREStatement                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Build a DRE statement from raw inputs.
 *
 * Algorithm:
 *   1. Index accounts → DRE groups via mappings.
 *   2. Walk entries; for each, determine its "primary" account (revenue or
 *      expense side) and bucket it into the matching DRE group + period.
 *   3. Aggregate per (group, period) into Money.
 *   4. Build a hierarchical tree of DRELine nodes; bubble up subtotals.
 *   5. Add computed lines (revenue_net, gross_profit, ebitda, net_profit)
 *      as virtual subtotals derived from line types.
 */
export function buildStatement(args: BuildStatementArgs): DREStatement {
  const { groups, mappings, accounts, entries, periods } = args;

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const mappingByAccount = new Map<string, AccountMappingInput[]>();
  for (const m of mappings) {
    if (!mappingByAccount.has(m.accountId)) mappingByAccount.set(m.accountId, []);
    mappingByAccount.get(m.accountId)!.push(m);
  }

  const groupById = new Map(groups.map((g) => [g.id, g]));

  // Bucket: groupId → periodIndex → minor units (signed bigint)
  const bucket = new Map<string, bigint[]>();
  const periodIndex = new Map(periods.map((p, i) => [p.toString(), i]));

  function ensureBucket(gid: string): bigint[] {
    let arr = bucket.get(gid);
    if (!arr) {
      arr = new Array<bigint>(periods.length).fill(0n);
      bucket.set(gid, arr);
    }
    return arr;
  }

  for (const e of entries) {
    const idx = periodIndex.get(e.period);
    if (idx === undefined) continue;

    // The "primary" leg is the one whose account type isn't cash/bank-like.
    // Revenue accounts (credit nature) → credit side is the value entry.
    // Expense accounts (debit nature)  → debit side is the value entry.
    const debitAcc = e.debitAccountId ? accountById.get(e.debitAccountId) : undefined;
    const creditAcc = e.creditAccountId ? accountById.get(e.creditAccountId) : undefined;

    const candidates: Array<{ accountId: string; signed: bigint }> = [];

    if (debitAcc && (debitAcc.accountType === 'expense' || debitAcc.accountType === 'asset' || debitAcc.accountType === 'liability')) {
      // debit increases expenses / decreases liabilities; for DRE we care about expense rises.
      if (debitAcc.accountType === 'expense') {
        candidates.push({ accountId: debitAcc.id, signed: -e.amountMinor });   // expense → negative
      }
    }
    if (creditAcc && creditAcc.accountType === 'revenue') {
      candidates.push({ accountId: creditAcc.id, signed: e.amountMinor });     // revenue → positive
    }
    // Edge case: contra-revenue (returns / deductions) often modelled as a debit to a revenue account.
    if (debitAcc && debitAcc.accountType === 'revenue') {
      candidates.push({ accountId: debitAcc.id, signed: -e.amountMinor });
    }
    if (creditAcc && creditAcc.accountType === 'expense') {
      candidates.push({ accountId: creditAcc.id, signed: e.amountMinor });     // expense reversal
    }

    for (const c of candidates) {
      const maps = mappingByAccount.get(c.accountId);
      if (!maps) continue;
      for (const m of maps) {
        const g = groupById.get(m.dreGroupId);
        if (!g) continue;
        const arr = ensureBucket(m.dreGroupId);
        const scaled = (c.signed * BigInt(Math.round(m.weight * 1000))) / 1000n;
        arr[idx] = arr[idx]! + scaled * BigInt(g.sign);
      }
    }
  }

  // Build leaf lines from buckets.
  const groupsBySort = [...groups].sort((a, b) => a.sortOrder - b.sortOrder);
  const lines = groupsBySort.map((g): DRELine => {
    const arr = bucket.get(g.id) ?? new Array<bigint>(periods.length).fill(0n);
    const perPeriod = arr.map((minor) => Money.fromMinor(minor, 'BRL'));
    const total = perPeriod.reduce((acc, m) => acc.add(m), Money.zero('BRL'));
    return {
      id: g.id,
      groupId: g.id,
      label: g.label,
      type: g.lineType,
      value: total,
      perPeriod,
      depth: g.parentId ? 1 : 0,
      isSubtotal: g.isSubtotal,
    };
  });

  // Append derived subtotals (revenue_net, gross_profit, ebitda, net_profit).
  const derived = computeDerivedLines(lines, periods.length);
  const merged = mergeWithDerived(lines, derived);

  return {
    organizationId: args.organizationId,
    companyId: args.companyId,
    periods: periods.map((p) => p.toString()),
    currency: 'BRL',
    lines: merged,
    generatedAt: new Date(),
  };
}

/* -------------------------------------------------------------------------- */
/* Derived subtotals                                                           */
/* -------------------------------------------------------------------------- */

function sumByType(lines: ReadonlyArray<DRELine>, types: DRELineType[], periodCount: number): Money[] {
  const acc = new Array<Money>(periodCount).fill(Money.zero('BRL'));
  for (const l of lines) {
    if (!types.includes(l.type)) continue;
    for (let i = 0; i < periodCount; i++) {
      acc[i] = acc[i]!.add(l.perPeriod[i] ?? Money.zero('BRL'));
    }
  }
  return acc;
}

function computeDerivedLines(lines: ReadonlyArray<DRELine>, periodCount: number): DRELine[] {
  const revenueGross = sumByType(lines, ['revenue_gross'], periodCount);
  const deductions   = sumByType(lines, ['deduction'], periodCount);
  const costs        = sumByType(lines, ['cost'], periodCount);
  const opEx         = sumByType(lines, ['operating_expense'], periodCount);
  const dep          = sumByType(lines, ['depreciation'], periodCount);
  const financial    = sumByType(lines, ['financial_result'], periodCount);
  const taxes        = sumByType(lines, ['taxes'], periodCount);

  const revenueNet  = revenueGross.map((m, i) => m.add(deductions[i] ?? Money.zero('BRL')));
  const grossProfit = revenueNet.map((m, i) => m.add(costs[i] ?? Money.zero('BRL')));
  const ebitda      = grossProfit.map((m, i) => m.add(opEx[i] ?? Money.zero('BRL')));
  const netProfit   = ebitda.map((m, i) =>
    m
      .add(dep[i] ?? Money.zero('BRL'))
      .add(financial[i] ?? Money.zero('BRL'))
      .add(taxes[i] ?? Money.zero('BRL')),
  );

  const total = (arr: Money[]) => arr.reduce((s, m) => s.add(m), Money.zero('BRL'));

  return [
    derivedLine('__revenue_net', 'Receita líquida', 'revenue_net', revenueNet, total(revenueNet), 100),
    derivedLine('__gross_profit', 'Lucro bruto', 'gross_profit', grossProfit, total(grossProfit), 300),
    derivedLine('__ebitda', 'EBITDA', 'ebitda', ebitda, total(ebitda), 500),
    derivedLine('__net_profit', 'Resultado líquido', 'net_profit', netProfit, total(netProfit), 999),
  ];
}

function derivedLine(
  id: string,
  label: string,
  type: DRELineType,
  perPeriod: Money[],
  total: Money,
  _sort: number,
): DRELine {
  return {
    id,
    groupId: null,
    label,
    type,
    value: total,
    perPeriod,
    depth: 0,
    isSubtotal: true,
  };
}

const TYPE_ORDER: DRELineType[] = [
  'revenue_gross',
  'deduction',
  'revenue_net',
  'cost',
  'gross_profit',
  'operating_expense',
  'ebitda',
  'depreciation',
  'financial_result',
  'taxes',
  'net_profit',
];

function mergeWithDerived(real: DRELine[], derived: DRELine[]): DRELine[] {
  const byType = new Map<DRELineType, DRELine[]>();
  for (const l of [...real, ...derived]) {
    if (!byType.has(l.type)) byType.set(l.type, []);
    byType.get(l.type)!.push(l);
  }
  const out: DRELine[] = [];
  for (const t of TYPE_ORDER) {
    const bucket = byType.get(t) ?? [];
    out.push(...bucket);
  }
  return out;
}
