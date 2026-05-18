import { Money } from '@/shared/money/money';

import type { DRELine, DREStatement } from '../domain/dre-statement';
import type { DREComparison, DREMetrics, MetricDelta } from '../domain/metrics';

/**
 * Extract top-level metrics from a single period column of a DREStatement.
 *
 * `periodIndex` defaults to the last column (most recent period).
 */
export function computeMetrics(statement: DREStatement, periodIndex = statement.periods.length - 1): DREMetrics {
  const lineByType = indexLines(statement.lines);

  const get = (typeKey: keyof typeof lineByType): Money => {
    const l = lineByType[typeKey];
    return l?.perPeriod[periodIndex] ?? Money.zero(statement.currency);
  };

  const revenueGross = get('revenue_gross');
  const revenueNet   = get('revenue_net');
  const grossProfit  = get('gross_profit');
  const ebitda       = get('ebitda');
  const netProfit    = get('net_profit');

  return {
    revenueGross,
    revenueNet,
    grossProfit,
    ebitda,
    netProfit,
    grossMargin:  safeRatio(grossProfit, revenueNet),
    ebitdaMargin: safeRatio(ebitda, revenueNet),
    netMargin:    safeRatio(netProfit, revenueNet),
  };
}

/**
 * Build a side-by-side comparison between the most recent period and any earlier one.
 */
export function compareMetrics(statement: DREStatement, currentIndex: number, priorIndex: number): DREComparison {
  const current = computeMetrics(statement, currentIndex);
  const prior   = computeMetrics(statement, priorIndex);

  const d = (a: Money, b: Money): MetricDelta => ({
    absolute: a.subtract(b),
    percentage: percentChange(b, a),
  });

  return {
    current,
    prior,
    delta: {
      revenueGross: d(current.revenueGross, prior.revenueGross),
      revenueNet:   d(current.revenueNet,   prior.revenueNet),
      grossProfit:  d(current.grossProfit,  prior.grossProfit),
      ebitda:       d(current.ebitda,       prior.ebitda),
      netProfit:    d(current.netProfit,    prior.netProfit),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Find one line per derived type (revenue_gross, ebitda, ...). Picks the subtotal if available. */
function indexLines(lines: ReadonlyArray<DRELine>) {
  const result: Record<string, DRELine | undefined> = {};
  for (const l of lines) {
    if (!result[l.type] || l.isSubtotal) result[l.type] = l;
  }
  return result as {
    revenue_gross?: DRELine;
    revenue_net?:   DRELine;
    gross_profit?:  DRELine;
    ebitda?:        DRELine;
    net_profit?:    DRELine;
  };
}

function safeRatio(numerator: Money, denominator: Money): number {
  if (denominator.isZero()) return 0;
  return numerator.toNumber() / denominator.toNumber();
}

function percentChange(from: Money, to: Money): number | null {
  if (from.isZero()) return null;
  return (to.toNumber() - from.toNumber()) / Math.abs(from.toNumber());
}
