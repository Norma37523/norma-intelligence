import type { Money } from '@/shared/money/money';
import type { OrganizationId } from '@/features/organizations/domain/organization';

/**
 * Forecast domain model.
 *
 * Each forecast scenario projects a financial metric (revenue, cost, EBITDA,
 * cash position, …) into the future using either a statistical model
 * (linear/exponential, seasonal) or a manual override. Multiple scenarios
 * coexist per organization (baseline, optimistic, pessimistic).
 */

export type ForecastMethod = 'linear' | 'seasonal' | 'manual' | 'driver_based';

export type ForecastScenario = 'baseline' | 'optimistic' | 'pessimistic' | 'custom';

export interface ForecastPoint {
  /** ISO-8601 month, e.g. "2026-07-01" — always first day of the month. */
  readonly periodStart: Date;
  readonly value: Money;
  /** 95% confidence interval, when applicable. */
  readonly confidenceLow?: Money;
  readonly confidenceHigh?: Money;
}

export interface Forecast {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly metric: 'revenue' | 'cost' | 'ebitda' | 'cash';
  readonly scenario: ForecastScenario;
  readonly method: ForecastMethod;
  readonly horizonMonths: number;
  readonly points: ReadonlyArray<ForecastPoint>;
  readonly generatedAt: Date;
}
