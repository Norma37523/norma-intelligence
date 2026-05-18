import type { Money } from '@/shared/money/money';
import type { OrganizationId } from '@/features/organizations/domain/organization';

/**
 * DRE Gerencial domain model.
 *
 * Structure here is the *shape* — actual grouping per company lives in
 * the database (chart_of_accounts + dre_groups + dre_account_mappings).
 */
export type DRELineType =
  | 'revenue_gross'
  | 'deduction'
  | 'revenue_net'
  | 'cost'
  | 'gross_profit'
  | 'operating_expense'
  | 'ebitda'
  | 'depreciation'
  | 'financial_result'
  | 'taxes'
  | 'net_profit';

export interface DRELine {
  readonly id: string;
  readonly groupId: string | null;
  readonly label: string;
  readonly type: DRELineType;
  readonly value: Money;
  /** Periods column-wise — same length as the statement's periods array. */
  readonly perPeriod: ReadonlyArray<Money>;
  readonly depth: number;
  readonly isSubtotal: boolean;
  readonly children?: ReadonlyArray<DRELine>;
}

export interface DREStatement {
  readonly organizationId: OrganizationId;
  readonly companyId: string;
  /** Periods covered, ordered oldest → newest; the rightmost is "current". */
  readonly periods: ReadonlyArray<string>;       // "YYYY-MM"
  readonly currency: 'BRL' | 'USD' | 'EUR';
  readonly lines: ReadonlyArray<DRELine>;
  readonly generatedAt: Date;
}
