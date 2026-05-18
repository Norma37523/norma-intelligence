import 'server-only';

import { buildStatement } from './build-statement';
import { computeMetrics, compareMetrics } from './compute-metrics';
import { buildComparative, extractSeries } from './compare-periods';
import type { Period } from '../domain/period';
import { periodRange } from '../domain/period';
import {
  loadDREGroups,
  loadDREMappings,
  loadAccountsForDRE,
  loadEntriesForPeriods,
} from '../infrastructure/dre-repository';
import { requireSession } from '@/features/auth/server';

export interface LoadedDRE {
  readonly statement: ReturnType<typeof buildStatement>;
  readonly metrics: ReturnType<typeof computeMetrics>;
  readonly comparison: ReturnType<typeof compareMetrics> | null;
  readonly comparative: ReturnType<typeof buildComparative>;
  readonly series: {
    revenueGross: ReturnType<typeof extractSeries>;
    ebitda: ReturnType<typeof extractSeries>;
    netProfit: ReturnType<typeof extractSeries>;
  };
  readonly hasData: boolean;
}

/**
 * Top-level orchestrator — loads everything the DRE page needs.
 * Pure read; doesn't write snapshots (yet).
 */
export async function loadStatement(
  companyId: string,
  endPeriod: Period,
  monthsBack: number,
): Promise<LoadedDRE> {
  const session = await requireSession();

  const periods = periodRange(endPeriod, monthsBack);

  const [groups, mappings, accounts, entries] = await Promise.all([
    loadDREGroups(companyId),
    loadDREMappings(companyId),
    loadAccountsForDRE(companyId),
    loadEntriesForPeriods(companyId, periods),
  ]);

  const statement = buildStatement({
    organizationId: session.currentOrganizationId ?? '',
    companyId,
    periods,
    groups,
    mappings,
    accounts,
    entries,
  });

  const lastIdx = periods.length - 1;
  const priorIdx = lastIdx - 1;
  const metrics = computeMetrics(statement, lastIdx);
  const comparison = priorIdx >= 0 ? compareMetrics(statement, lastIdx, priorIdx) : null;
  const comparative = buildComparative(statement);

  return {
    statement,
    metrics,
    comparison,
    comparative,
    series: {
      revenueGross: extractSeries(statement, 'revenue_gross'),
      ebitda: extractSeries(statement, 'ebitda'),
      netProfit: extractSeries(statement, 'net_profit'),
    },
    hasData: entries.length > 0 && groups.length > 0,
  };
}
