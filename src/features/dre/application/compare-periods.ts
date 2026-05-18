import { Money } from '@/shared/money/money';

import type { DRELine, DREStatement } from '../domain/dre-statement';

/**
 * Build a monthly comparative view from a multi-period DREStatement.
 *
 * Returns a flat array, one row per top-level DRE line, with the value at
 * each period and the period-over-period delta percentages. Designed to
 * feed both the comparative table and the chart.
 */
export interface ComparativePeriodCell {
  readonly period: string;
  readonly value: Money;
  readonly deltaPct: number | null;     // vs previous period (null for first)
}

export interface ComparativeRow {
  readonly id: string;
  readonly label: string;
  readonly type: DRELine['type'];
  readonly isSubtotal: boolean;
  readonly cells: ReadonlyArray<ComparativePeriodCell>;
}

export interface ComparativeView {
  readonly periods: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ComparativeRow>;
}

export function buildComparative(statement: DREStatement): ComparativeView {
  const rows: ComparativeRow[] = statement.lines.map((line) => ({
    id: line.id,
    label: line.label,
    type: line.type,
    isSubtotal: line.isSubtotal,
    cells: line.perPeriod.map((value, i): ComparativePeriodCell => {
      const prev = i > 0 ? line.perPeriod[i - 1] : null;
      return {
        period: statement.periods[i]!,
        value,
        deltaPct: prev && !prev.isZero()
          ? (value.toNumber() - prev.toNumber()) / Math.abs(prev.toNumber())
          : null,
      };
    }),
  }));

  return { periods: statement.periods, rows };
}

/**
 * Helper: take a single line (by type) and produce a simple {period, value} series
 * suitable for plotting. Pre-computes monetary values as numbers for chart libs.
 */
export interface SeriesPoint {
  readonly period: string;
  readonly value: number;
}

export function extractSeries(statement: DREStatement, type: DRELine['type']): SeriesPoint[] {
  const line = statement.lines.find((l) => l.type === type && l.isSubtotal)
    ?? statement.lines.find((l) => l.type === type);
  if (!line) return statement.periods.map((p) => ({ period: p, value: 0 }));
  return line.perPeriod.map((m, i) => ({
    period: statement.periods[i]!,
    value: m.toNumber(),
  }));
}

/** No-op import to keep Money in this file's surface (used downstream). */
export const _MoneyRef = Money;
