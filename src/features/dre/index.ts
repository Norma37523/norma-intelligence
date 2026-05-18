/** Public API of the `dre` feature — client-safe surface. */
export type { DREStatement, DRELine, DRELineType } from './domain';
export type { DREMetrics, MetricDelta, DREComparison } from './domain';
export { Period, periodRange } from './domain';

export { MetricsCards } from './presentation/metrics-cards';
export { DRETable } from './presentation/dre-table';
export { ComparativeChart } from './presentation/comparative-chart';
export { PeriodSelector } from './presentation/period-selector';
