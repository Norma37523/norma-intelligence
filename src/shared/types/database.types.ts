/**
 * Supabase Database types — canonical shape (Row / Insert / Update with `?`).
 * Mirrors supabase/migrations/* . Regenerate with `pnpm db:types` when Supabase CLI is wired up.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/* ----------------------------- Enums ----------------------------- */
export type MemberRole = 'owner' | 'admin' | 'analyst' | 'viewer';
export type TaxRegime = 'mei' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real';
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountNature = 'debit' | 'credit';
export type CostCenterKind = 'cost' | 'profit' | 'revenue' | 'administrative';
export type DRELineType =
  | 'revenue_gross' | 'deduction' | 'revenue_net' | 'cost' | 'gross_profit'
  | 'operating_expense' | 'ebitda' | 'depreciation' | 'financial_result'
  | 'taxes' | 'net_profit';
export type PeriodKind = 'monthly' | 'quarterly' | 'yearly';
export type PeriodStatus = 'open' | 'closed' | 'locked';
export type UploadKind =
  | 'bank_statement_ofx' | 'bank_statement_csv' | 'bank_statement_pdf'
  | 'chart_of_accounts' | 'journal_entries' | 'invoices_in' | 'invoices_out' | 'other';
export type UploadStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
export type EntryDirection = 'debit' | 'credit';
export type EntrySource =
  | 'manual' | 'ofx' | 'csv' | 'pdf' | 'api' | 'erp_dominio' | 'reconciliation' | 'other';
export type ReconciliationStatus = 'unreconciled' | 'partial' | 'reconciled' | 'disputed';
export type DRESnapshotStatus = 'draft' | 'published' | 'superseded';
export type ForecastMetric = 'revenue' | 'cost' | 'ebitda' | 'net_profit' | 'cash';
export type ForecastScenario = 'baseline' | 'optimistic' | 'pessimistic' | 'custom';
export type ForecastMethod = 'linear' | 'seasonal' | 'manual' | 'driver_based' | 'ml_model';
export type ForecastStatus = 'draft' | 'published' | 'archived';
export type InsightKind =
  | 'variance_spike' | 'trend_break' | 'ratio_anomaly' | 'forecast_deviation'
  | 'narrative_summary' | 'reconciliation_alert' | 'cash_flow_warning';
export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightOrigin = 'rule' | 'statistic' | 'llm' | 'hybrid';

/* ----------------------------- Database ----------------------------- */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          default_organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          default_organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          default_organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          tax_id: string | null;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          tax_id?: string | null;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>;
        Relationships: [];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['organization_members']['Insert']>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          organization_id: string;
          legal_name: string;
          trade_name: string | null;
          tax_id: string | null;
          tax_regime: TaxRegime | null;
          fiscal_year_start_month: number;
          base_currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          legal_name: string;
          trade_name?: string | null;
          tax_id?: string | null;
          tax_regime?: TaxRegime | null;
          fiscal_year_start_month?: number;
          base_currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
        Relationships: [];
      };
      fiscal_periods: {
        Row: {
          id: string;
          company_id: string;
          kind: PeriodKind;
          period_start: string;
          period_end: string;
          status: PeriodStatus;
          closed_at: string | null;
          closed_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          kind: PeriodKind;
          period_start: string;
          period_end: string;
          status?: PeriodStatus;
          closed_at?: string | null;
          closed_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['fiscal_periods']['Insert']>;
        Relationships: [];
      };
      cost_centers: {
        Row: {
          id: string;
          company_id: string;
          parent_id: string | null;
          code: string;
          name: string;
          kind: CostCenterKind;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          parent_id?: string | null;
          code: string;
          name: string;
          kind?: CostCenterKind;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cost_centers']['Insert']>;
        Relationships: [];
      };
      chart_of_accounts: {
        Row: {
          id: string;
          company_id: string;
          parent_id: string | null;
          code: string;
          name: string;
          account_type: AccountType;
          nature: AccountNature;
          is_analytical: boolean;
          is_active: boolean;
          sort_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          parent_id?: string | null;
          code: string;
          name: string;
          account_type: AccountType;
          nature: AccountNature;
          is_analytical?: boolean;
          is_active?: boolean;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['chart_of_accounts']['Insert']>;
        Relationships: [];
      };
      dre_groups: {
        Row: {
          id: string;
          company_id: string;
          parent_id: string | null;
          code: string;
          label: string;
          line_type: DRELineType;
          sign: number;
          sort_order: number;
          is_subtotal: boolean;
          formula: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          parent_id?: string | null;
          code: string;
          label: string;
          line_type: DRELineType;
          sign?: number;
          sort_order?: number;
          is_subtotal?: boolean;
          formula?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dre_groups']['Insert']>;
        Relationships: [];
      };
      dre_account_mappings: {
        Row: {
          id: string;
          company_id: string;
          account_id: string;
          dre_group_id: string;
          weight: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          account_id: string;
          dre_group_id: string;
          weight?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dre_account_mappings']['Insert']>;
        Relationships: [];
      };
      uploads: {
        Row: {
          id: string;
          company_id: string;
          uploaded_by_user_id: string | null;
          kind: UploadKind;
          status: UploadStatus;
          file_name: string;
          storage_bucket: string;
          storage_path: string;
          file_size_bytes: number | null;
          mime_type: string | null;
          checksum_sha256: string | null;
          source_period_start: string | null;
          source_period_end: string | null;
          processed_at: string | null;
          failed_at: string | null;
          error_message: string | null;
          stats: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          uploaded_by_user_id?: string | null;
          kind: UploadKind;
          status?: UploadStatus;
          file_name: string;
          storage_bucket?: string;
          storage_path: string;
          file_size_bytes?: number | null;
          mime_type?: string | null;
          checksum_sha256?: string | null;
          source_period_start?: string | null;
          source_period_end?: string | null;
          processed_at?: string | null;
          failed_at?: string | null;
          error_message?: string | null;
          stats?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['uploads']['Insert']>;
        Relationships: [];
      };
      financial_entries: {
        Row: {
          id: string;
          company_id: string;
          fiscal_period_id: string | null;
          entry_date: string;
          due_date: string | null;
          cash_date: string | null;
          description: string;
          document_number: string | null;
          document_type: string | null;
          amount_minor: number;
          currency: string;
          direction: EntryDirection;
          debit_account_id: string | null;
          credit_account_id: string | null;
          cost_center_id: string | null;
          counterparty_name: string | null;
          counterparty_tax_id: string | null;
          source: EntrySource;
          source_reference: string | null;
          upload_id: string | null;
          reconciliation_status: ReconciliationStatus;
          reconciled_at: string | null;
          reconciled_by_user_id: string | null;
          matched_entry_id: string | null;
          tags: string[];
          notes: string | null;
          metadata: Json;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          fiscal_period_id?: string | null;
          entry_date: string;
          due_date?: string | null;
          cash_date?: string | null;
          description: string;
          document_number?: string | null;
          document_type?: string | null;
          amount_minor: number;
          currency?: string;
          direction: EntryDirection;
          debit_account_id?: string | null;
          credit_account_id?: string | null;
          cost_center_id?: string | null;
          counterparty_name?: string | null;
          counterparty_tax_id?: string | null;
          source?: EntrySource;
          source_reference?: string | null;
          upload_id?: string | null;
          reconciliation_status?: ReconciliationStatus;
          reconciled_at?: string | null;
          reconciled_by_user_id?: string | null;
          matched_entry_id?: string | null;
          tags?: string[];
          notes?: string | null;
          metadata?: Json;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['financial_entries']['Insert']>;
        Relationships: [];
      };
      dre_snapshots: {
        Row: {
          id: string;
          company_id: string;
          fiscal_period_id: string;
          status: DRESnapshotStatus;
          version: number;
          generated_at: string;
          generated_by_user_id: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          fiscal_period_id: string;
          status?: DRESnapshotStatus;
          version?: number;
          generated_at?: string;
          generated_by_user_id?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dre_snapshots']['Insert']>;
        Relationships: [];
      };
      dre_lines: {
        Row: {
          id: string;
          snapshot_id: string;
          dre_group_id: string | null;
          parent_line_id: string | null;
          label: string;
          line_type: DRELineType;
          amount_minor: number;
          prior_amount_minor: number | null;
          delta_minor: number;
          currency: string;
          sort_order: number;
          depth: number;
          is_subtotal: boolean;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_id: string;
          dre_group_id?: string | null;
          parent_line_id?: string | null;
          label: string;
          line_type: DRELineType;
          amount_minor?: number;
          prior_amount_minor?: number | null;
          currency?: string;
          sort_order?: number;
          depth?: number;
          is_subtotal?: boolean;
          details?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['dre_lines']['Insert']>;
        Relationships: [];
      };
      forecasts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          metric: ForecastMetric;
          scenario: ForecastScenario;
          method: ForecastMethod;
          status: ForecastStatus;
          horizon_months: number;
          base_period_start: string;
          base_period_end: string;
          parameters: Json;
          currency: string;
          generated_at: string;
          generated_by_user_id: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          metric: ForecastMetric;
          scenario: ForecastScenario;
          method: ForecastMethod;
          status?: ForecastStatus;
          horizon_months: number;
          base_period_start: string;
          base_period_end: string;
          parameters?: Json;
          currency?: string;
          generated_at?: string;
          generated_by_user_id?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['forecasts']['Insert']>;
        Relationships: [];
      };
      forecast_points: {
        Row: {
          id: string;
          forecast_id: string;
          period_start: string;
          value_minor: number;
          confidence_low_minor: number | null;
          confidence_high_minor: number | null;
          is_override: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          forecast_id: string;
          period_start: string;
          value_minor: number;
          confidence_low_minor?: number | null;
          confidence_high_minor?: number | null;
          is_override?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['forecast_points']['Insert']>;
        Relationships: [];
      };
      insights: {
        Row: {
          id: string;
          company_id: string;
          kind: InsightKind;
          severity: InsightSeverity;
          origin: InsightOrigin;
          title: string;
          body: string;
          evidence: Json;
          related_period_start: string | null;
          related_period_end: string | null;
          related_account_id: string | null;
          related_cost_center_id: string | null;
          related_forecast_id: string | null;
          generator_model: string | null;
          generator_version: string | null;
          score: number | null;
          dismissed_at: string | null;
          dismissed_by_user_id: string | null;
          dismiss_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          kind: InsightKind;
          severity?: InsightSeverity;
          origin?: InsightOrigin;
          title: string;
          body: string;
          evidence?: Json;
          related_period_start?: string | null;
          related_period_end?: string | null;
          related_account_id?: string | null;
          related_cost_center_id?: string | null;
          related_forecast_id?: string | null;
          generator_model?: string | null;
          generator_version?: string | null;
          score?: number | null;
          dismissed_at?: string | null;
          dismissed_by_user_id?: string | null;
          dismiss_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['insights']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_member_of: { Args: { target_org: string }; Returns: boolean };
      has_role_in: { Args: { target_org: string; required_roles: MemberRole[] }; Returns: boolean };
      is_member_of_company: { Args: { target_company: string }; Returns: boolean };
      has_company_role: { Args: { target_company: string; required_roles: MemberRole[] }; Returns: boolean };
    };
    Enums: {
      member_role: MemberRole; tax_regime: TaxRegime;
      account_type: AccountType; account_nature: AccountNature;
      cost_center_kind: CostCenterKind; dre_line_type: DRELineType;
      period_kind: PeriodKind; period_status: PeriodStatus;
      upload_kind: UploadKind; upload_status: UploadStatus;
      entry_direction: EntryDirection; entry_source: EntrySource;
      reconciliation_status: ReconciliationStatus;
      dre_snapshot_status: DRESnapshotStatus;
      forecast_metric: ForecastMetric; forecast_scenario: ForecastScenario;
      forecast_method: ForecastMethod; forecast_status: ForecastStatus;
      insight_kind: InsightKind; insight_severity: InsightSeverity;
      insight_origin: InsightOrigin;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

/* ----------------------------- Convenience aliases ----------------------------- */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
