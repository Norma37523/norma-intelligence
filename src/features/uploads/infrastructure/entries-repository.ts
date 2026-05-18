import 'server-only';

import { createSupabaseServerClient } from '@/shared/supabase/server';
import type { CategorizedRow } from '../domain';
import type { TablesInsert } from '@/shared/types/database.types';

/**
 * Insert a batch of financial entries derived from a categorized upload.
 *
 * Each row maps to one financial_entries row. We pass a positive `amount_minor`
 * (the SQL CHECK requires > 0) and the `direction` flag tells which side moved.
 */
export async function insertEntriesFromUpload(args: {
  companyId: string;
  uploadId: string;
  createdByUserId: string;
  rows: ReadonlyArray<CategorizedRow>;
}): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const supabase = await createSupabaseServerClient();
  const errors: string[] = [];
  const payload: TablesInsert<'financial_entries'>[] = [];

  for (const row of args.rows) {
    if (row.issues.some((i) => i.level === 'error')) continue;
    if (!row.entryDate) continue;
    const absMinor = row.amountMinor < 0n ? -row.amountMinor : row.amountMinor;
    if (absMinor === 0n) continue;

    payload.push({
      company_id: args.companyId,
      entry_date: row.entryDate,
      description: row.description || '(sem descrição)',
      amount_minor: Number(absMinor),       // PostgREST accepts string|number for bigint
      direction: row.direction,
      currency: 'BRL',
      debit_account_id: row.debitAccountId,
      credit_account_id: row.creditAccountId,
      cost_center_id: row.costCenterId,
      counterparty_name: row.counterpartyName,
      counterparty_tax_id: row.counterpartyTaxId,
      document_number: row.documentNumber,
      source: 'csv',
      source_reference: `${args.uploadId}:${row.sourceLineNumber}`,
      upload_id: args.uploadId,
      reconciliation_status: 'unreconciled',
      tags: row.categorization.needsReview ? ['revisar'] : [],
      created_by_user_id: args.createdByUserId,
      metadata: {
        categorization: {
          source: row.categorization.source,
          score: row.categorization.score,
          needs_review: row.categorization.needsReview,
        },
      },
    });
  }

  if (payload.length === 0) {
    return { inserted: 0, skipped: args.rows.length, errors };
  }

  // Insert in chunks to stay well under Postgres' single-query limits.
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from('financial_entries')
      .insert(slice, { count: 'exact' });
    if (error) {
      errors.push(`chunk ${i / CHUNK}: ${error.message}`);
    } else {
      inserted += count ?? slice.length;
    }
  }

  return { inserted, skipped: args.rows.length - inserted, errors };
}
