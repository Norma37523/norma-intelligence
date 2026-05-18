import type { OrganizationId } from '@/features/organizations/domain/organization';

export type InsightSeverity = 'info' | 'warning' | 'critical';

export type InsightKind =
  | 'variance_spike'
  | 'trend_break'
  | 'ratio_anomaly'
  | 'forecast_deviation'
  | 'narrative_summary'
  | 'reconciliation_alert'
  | 'cash_flow_warning';

export type InsightOrigin = 'rule' | 'statistic' | 'llm' | 'hybrid';

/**
 * Stored insight — mirrors public.insights row.
 */
export interface Insight {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly companyId: string;
  readonly kind: InsightKind;
  readonly severity: InsightSeverity;
  readonly origin: InsightOrigin;
  readonly title: string;
  readonly body: string;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly relatedPeriodStart: string | null;
  readonly relatedPeriodEnd: string | null;
  readonly score: number | null;
  readonly createdAt: Date;
  readonly dismissedAt: Date | null;
}
