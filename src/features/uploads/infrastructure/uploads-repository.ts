import 'server-only';

import { createSupabaseServerClient } from '@/shared/supabase/server';
import type {
  AccountCandidate,
  HistoricalMatch,
} from '../application/categorize-rows';
import { makeHistoryKey } from '../application/categorize-rows';
import type { TablesInsert, Tables, UploadKind, UploadStatus } from '@/shared/types/database.types';

export interface UploadRow {
  id: string;
  company_id: string;
  file_name: string;
  storage_path: string;
  kind: UploadKind;
  status: UploadStatus;
  stats: Tables<'uploads'>['stats'];
  created_at: string;
  processed_at: string | null;
}

export async function insertUpload(args: {
  companyId: string;
  uploadedByUserId: string | null;
  filename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  kind: UploadKind;
}): Promise<{ id: string }> {
  const supabase = await createSupabaseServerClient();
  const payload: TablesInsert<'uploads'> = {
    company_id: args.companyId,
    uploaded_by_user_id: args.uploadedByUserId,
    file_name: args.filename,
    storage_path: args.storagePath,
    mime_type: args.mimeType,
    file_size_bytes: args.fileSize,
    kind: args.kind,
    status: 'pending',
  };
  const { data, error } = await supabase
    .from('uploads')
    .insert(payload)
    .select('id')
    .single()
    .returns<{ id: string }>();
  if (error || !data) throw new Error(`insertUpload failed: ${error?.message ?? 'no data'}`);
  return { id: data.id };
}

export async function updateUploadStatus(
  id: string,
  patch: Partial<Pick<Tables<'uploads'>,
    'status' | 'processed_at' | 'failed_at' | 'error_message' | 'stats'
  >>,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('uploads').update(patch).eq('id', id);
  if (error) throw new Error(`updateUploadStatus failed: ${error.message}`);
}

export async function listUploads(companyId: string, limit = 25): Promise<UploadRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('uploads')
    .select('id, company_id, file_name, storage_path, kind, status, stats, created_at, processed_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<UploadRow[]>();
  if (error) throw new Error(`listUploads failed: ${error.message}`);
  return data ?? [];
}

export async function getUpload(id: string): Promise<UploadRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('uploads')
    .select('id, company_id, file_name, storage_path, kind, status, stats, created_at, processed_at')
    .eq('id', id)
    .maybeSingle()
    .returns<UploadRow | null>();
  if (error) throw new Error(`getUpload failed: ${error.message}`);
  return data;
}

/**
 * Load analytical accounts for the company, used by the categorizer.
 */
export async function listAnalyticalAccounts(companyId: string): Promise<AccountCandidate[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name, account_type, is_analytical')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .returns<AccountCandidate[]>();
  if (error) throw new Error(`listAccounts failed: ${error.message}`);
  return data ?? [];
}

/**
 * Build a counterparty → account history index from prior entries.
 *
 * Uses the most recent 2000 categorized entries; aggregates by normalized
 * counterparty / description.
 */
export async function loadCategorizationHistory(companyId: string): Promise<HistoricalMatch[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('financial_entries')
    .select('description, counterparty_name, debit_account_id, credit_account_id, direction')
    .eq('company_id', companyId)
    .not('debit_account_id', 'is', null)
    .not('credit_account_id', 'is', null)
    .order('entry_date', { ascending: false })
    .limit(2000)
    .returns<
      {
        description: string;
        counterparty_name: string | null;
        debit_account_id: string | null;
        credit_account_id: string | null;
        direction: 'debit' | 'credit';
      }[]
    >();
  if (error) throw new Error(`loadCategorizationHistory failed: ${error.message}`);

  const tally = new Map<string, Map<string, number>>(); // key → accountId → count

  for (const row of data ?? []) {
    const key = makeHistoryKey(row.counterparty_name ?? row.description);
    if (!key) continue;
    // The "primary" account is the one opposite to cash.
    const accountId =
      row.direction === 'debit' ? row.debit_account_id : row.credit_account_id;
    if (!accountId) continue;
    if (!tally.has(key)) tally.set(key, new Map());
    const accs = tally.get(key)!;
    accs.set(accountId, (accs.get(accountId) ?? 0) + 1);
  }

  const matches: HistoricalMatch[] = [];
  for (const [key, accs] of tally) {
    let best: { id: string; hits: number } | null = null;
    for (const [accountId, hits] of accs) {
      if (!best || hits > best.hits) best = { id: accountId, hits };
    }
    if (best) matches.push({ counterpartyKey: key, accountId: best.id, hits: best.hits });
  }
  return matches;
}

/**
 * Get the company's default cash account + suspense fallback account.
 * Both come from metadata fields the onboarding flow should set.
 */
export async function getCompanyDefaults(
  companyId: string,
): Promise<{ defaultCashAccountId: string | null; fallbackSuspenseAccountId: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .maybeSingle();
  if (!data) return { defaultCashAccountId: null, fallbackSuspenseAccountId: null };

  // Convention: lookup analytical accounts named "Caixa" and "Conta transitória".
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_analytical', true)
    .returns<{ id: string; name: string }[]>();

  const lower = (accounts ?? []).map((a) => ({ ...a, lower: a.name.toLowerCase() }));
  const cash = lower.find((a) => /(caixa|banco|conta corrente)/.test(a.lower)) ?? null;
  const susp = lower.find((a) => /(transit|suspens|a classificar|revisar)/.test(a.lower)) ?? null;

  return {
    defaultCashAccountId: cash?.id ?? null,
    fallbackSuspenseAccountId: susp?.id ?? null,
  };
}
