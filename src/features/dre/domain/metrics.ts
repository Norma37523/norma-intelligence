import type { Money } from '@/shared/money/money';

/**
 * Top-level metrics extracted from a DRE statement.
 * Margins are stored as decimal fractions (0.215 = 21.5%).
 */
export interface DREMetrics {
  readonly revenueGross: Money;
  readonly revenueNet: Money;
  readonly grossProfit: Money;
  readonly ebitda: Money;
  readonly netProfit: Money;

  readonly grossMargin: number;          // grossProfit / revenueNet
  readonly ebitdaMargin: number;         // ebitda / revenueNet
  readonly netMargin: number;            // netProfit / revenueNet
}

/** Period-over-period delta (this period vs prior). */
export interface MetricDelta {
  readonly absolute: Money;
  readonly percentage: number | null;    // null when prior was zero
}

/** Side-by-side comparison of two periods. */
export interface DREComparison {
  readonly current: DREMetrics;
  readonly prior: DREMetrics;
  readonly delta: {
    revenueGross: MetricDelta;
    revenueNet: MetricDelta;
    grossProfit: MetricDelta;
    ebitda: MetricDelta;
    netProfit: MetricDelta;
  };
}
