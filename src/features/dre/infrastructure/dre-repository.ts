import 'server-only';

import { createSupabaseServerClient } from '@/shared/supabase/server';
import type {
  AccountInput,
  AccountMappingInput,
  DREGroupInput,
  EntryInput,
} from '../application/build-statement';
import type { Period } from '../domain/period';

interface GroupRow {
  id: string;
  parent_id: string | null;
  label: string;
  line_type: DREGroupInput['lineType'];
  sign: number;
  sort_order: number;
  is_subtotal: boolean;
}

interface MappingRow {
  account_id: string;
  dre_group_id: string;
  weight: number;
}

interface AccountRow {
  id: string;
  account_type: AccountInput['accountType'];
}

interface EntryRow {
  entry_date: string;
  debit_account_id: string | null;
  credit_account_id: string | null;
  amount_minor: number;
  direction: EntryInput['direction'];
}

export async function loadDREGroups(companyId: string): Promise<DREGroupInput[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dre_groups')
    .select('id, parent_id, label, line_type, sign, sort_order, is_subtotal')
    .eq('company_id', companyId)
    .returns<GroupRow[]>();
  if (error) throw new Error(`loadDREGroups: ${error.message}`);
  return (data ?? []).map((g) => ({
    id: g.id,
    parentId: g.parent_id,
    label: g.label,
    lineType: g.line_type,
    sign: g.sign === -1 ? -1 : 1,
    sortOrder: g.sort_order,
    isSubtotal: g.is_subtotal,
  }));
}

export async function loadDREMappings(companyId: string): Promise<AccountMappingInput[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('dre_account_mappings')
    .select('account_id, dre_group_id, weight')
    .eq('company_id', companyId)
    .returns<MappingRow[]>();
  if (error) throw new Error(`loadDREMappings: ${error.message}`);
  return (data ?? []).map((m) => ({
    accountId: m.account_id,
    dreGroupId: m.dre_group_id,
    weight: m.weight,
  }));
}

export async function loadAccountsForDRE(companyId: string): Promise<AccountInput[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, account_type')
    .eq('company_id', companyId)
    .returns<AccountRow[]>();
  if (error) throw new Error(`loadAccountsForDRE: ${error.message}`);
  return (data ?? []).map((a) => ({ id: a.id, accountType: a.account_type }));
}

export async function loadEntriesForPeriods(
  companyId: string,
  periods: ReadonlyArray<Period>,
): Promise<EntryInput[]> {
  if (periods.length === 0) return [];
  const start = periods[0]!.startDate();
  const end   = periods[periods.length - 1]!.endDate();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('financial_entries')
    .select('entry_date, debit_account_id, credit_account_id, amount_minor, direction')
    .eq('company_id', companyId)
    .gte('entry_date', start)
    .lte('entry_date', end)
    .returns<EntryRow[]>();
  if (error) throw new Error(`loadEntriesForPeriods: ${error.message}`);

  return (data ?? []).map((e) => ({
    period: e.entry_date.slice(0, 7),                // "YYYY-MM"
    debitAccountId: e.debit_account_id,
    creditAccountId: e.credit_account_id,
    amountMinor: BigInt(Math.round(e.amount_minor)),
    direction: e.direction,
  }));
}
