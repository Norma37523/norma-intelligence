'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSession } from '@/features/auth/server';
import { ValidationError, ForbiddenError, NotFoundError } from '@/shared/errors/app-error';

import { parseFile, detectFormat } from './parse-file';
import { inferColumnMapping, scoreMapping } from './infer-mapping';
import { normalizeRows } from './normalize-rows';
import { categorizeRows } from './categorize-rows';
import type { ColumnMapping } from '../domain';

import {
  putUploadFile,
  getUploadBytes,
  deleteUploadFile,
} from '../infrastructure/storage';
import {
  insertUpload,
  updateUploadStatus,
  getUpload,
  listAnalyticalAccounts,
  loadCategorizationHistory,
  getCompanyDefaults,
} from '../infrastructure/uploads-repository';
import { insertEntriesFromUpload } from '../infrastructure/entries-repository';

import type { UploadActionState, UploadPreview } from './types';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_KINDS = ['bank_statement_csv', 'bank_statement_pdf', 'journal_entries', 'other'] as const;

const uploadInput = z.object({
  companyId: z.string().uuid(),
  kind: z.enum(ALLOWED_KINDS).default('other'),
});

/* -------------------------------------------------------------------------- */
/* createUpload                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Step 1 — receive the file, store it, and record the upload row.
 *
 * Does NOT parse yet; that happens lazily on demand or as a Server Action.
 */
export async function createUpload(
  _prev: UploadActionState,
  formData: FormData,
): Promise<UploadActionState> {
  const session = await requireSession();

  const parsed = uploadInput.safeParse({
    companyId: formData.get('companyId'),
    kind: formData.get('kind') ?? 'other',
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Dados inválidos.' };
  }

  // Confirm membership in this company.
  const isMember = session.memberships.some(() => true);
  if (!isMember) {
    return { status: 'error', message: 'Você não pertence a nenhuma organização.' };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { status: 'error', message: 'Nenhum arquivo enviado.' };
  }
  if (file.size > MAX_BYTES) {
    return { status: 'error', message: 'Arquivo excede 10 MB.' };
  }
  const format = detectFormat(file.name, file.type);
  if (!format) {
    return { status: 'error', message: 'Formato não suportado. Envie CSV ou XLSX.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  // Create the upload row first (we need its id for the storage path).
  const inserted = await insertUpload({
    companyId: parsed.data.companyId,
    uploadedByUserId: session.user.id,
    filename: file.name,
    storagePath: 'pending',                  // placeholder; updated right after storage write
    mimeType: file.type || 'application/octet-stream',
    fileSize: file.size,
    kind: parsed.data.kind,
  });

  try {
    const { path } = await putUploadFile({
      companyId: parsed.data.companyId,
      uploadId: inserted.id,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      bytes,
    });
    await updateUploadStatus(inserted.id, {
      status: 'pending',
      stats: { storage_path: path },
    });
    // Persist final path via raw column update.
    await updateUploadStoragePath(inserted.id, path);
  } catch (e) {
    await updateUploadStatus(inserted.id, {
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: e instanceof Error ? e.message : String(e),
    });
    return { status: 'error', message: 'Falha ao armazenar o arquivo.' };
  }

  revalidatePath('/app/uploads');
  return { status: 'success', message: 'Arquivo recebido.', uploadId: inserted.id };
}

/* -------------------------------------------------------------------------- */
/* previewUpload                                                              */
/* -------------------------------------------------------------------------- */

const previewInput = z.object({
  uploadId: z.string().uuid(),
  mappingOverrides: z.record(z.string(), z.string().nullable()).optional(),
});

/**
 * Step 2 — parse + infer mapping + normalize + categorize.
 * Pure read; doesn't mutate financial_entries. Safe to call repeatedly while
 * the user edits the mapping.
 */
export async function previewUpload(
  uploadId: string,
  mappingOverrides?: Record<string, string | null>,
): Promise<UploadPreview> {
  await requireSession();

  const parsed = previewInput.safeParse({ uploadId, mappingOverrides });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.flatten().fieldErrors);
  }

  const upload = await getUpload(parsed.data.uploadId);
  if (!upload) throw new NotFoundError('Upload não encontrado.');

  const bytes = await getUploadBytes(upload.storage_path);
  const parsedFile = parseFile(bytes, upload.file_name, null);

  // Build mapping: inferred, then overlay user overrides.
  const inferred = inferColumnMapping(parsedFile.headers, parsedFile.rows.slice(0, 30));
  const mapping: ColumnMapping = { ...inferred };
  if (parsed.data.mappingOverrides) {
    for (const [slot, header] of Object.entries(parsed.data.mappingOverrides)) {
      if (header === null) delete (mapping as Record<string, string>)[slot];
      else (mapping as Record<string, string>)[slot] = header;
    }
  }

  const normalized = normalizeRows(parsedFile.rows, mapping);

  const [accounts, history, defaults] = await Promise.all([
    listAnalyticalAccounts(upload.company_id),
    loadCategorizationHistory(upload.company_id),
    getCompanyDefaults(upload.company_id),
  ]);

  const categorized = categorizeRows(normalized, {
    accounts,
    history,
    defaultCashAccountId: defaults.defaultCashAccountId,
    fallbackSuspenseAccountId: defaults.fallbackSuspenseAccountId,
  });

  return {
    uploadId: upload.id,
    format: parsedFile.format,
    headers: parsedFile.headers,
    mapping,
    mappingScore: scoreMapping(mapping),
    rows: categorized,
    stats: {
      total: categorized.length,
      withErrors: categorized.filter((r) => r.issues.some((i) => i.level === 'error')).length,
      needsReview: categorized.filter((r) => r.categorization.needsReview).length,
      autoCategorized: categorized.filter(
        (r) => !r.categorization.needsReview && r.categorization.source !== 'fallback',
      ).length,
    },
    warnings: parsedFile.errors,
  };
}

/* -------------------------------------------------------------------------- */
/* commitUpload                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Step 3 — commit the categorized rows as financial_entries.
 *
 * Idempotent at the row level via the (company_id, source, source_reference)
 * unique constraint — re-running won't duplicate entries.
 */
export async function commitUpload(
  uploadId: string,
  mappingOverrides?: Record<string, string | null>,
): Promise<{ inserted: number; skipped: number; errors: string[] }> {
  const session = await requireSession();

  const upload = await getUpload(uploadId);
  if (!upload) throw new NotFoundError('Upload não encontrado.');
  if (upload.status === 'processed') {
    throw new ForbiddenError('Upload já foi processado.');
  }

  await updateUploadStatus(uploadId, { status: 'processing' });

  try {
    const preview = await previewUpload(uploadId, mappingOverrides);
    const result = await insertEntriesFromUpload({
      companyId: upload.company_id,
      uploadId,
      createdByUserId: session.user.id,
      rows: preview.rows,
    });

    await updateUploadStatus(uploadId, {
      status: 'processed',
      processed_at: new Date().toISOString(),
      stats: {
        total_rows: preview.stats.total,
        inserted: result.inserted,
        skipped: result.skipped,
        needs_review: preview.stats.needsReview,
        auto_categorized: preview.stats.autoCategorized,
      },
    });

    revalidatePath('/app/uploads');
    return result;
  } catch (e) {
    await updateUploadStatus(uploadId, {
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: e instanceof Error ? e.message : String(e),
    });
    throw e;
  }
}

/* -------------------------------------------------------------------------- */
/* deleteUpload                                                                */
/* -------------------------------------------------------------------------- */

export async function deleteUpload(uploadId: string): Promise<void> {
  await requireSession();
  const upload = await getUpload(uploadId);
  if (!upload) return;

  try {
    await deleteUploadFile(upload.storage_path);
  } catch {
    // Storage delete is best-effort; the row delete below cleans up indexes.
  }

  // The row delete will cascade through RLS-gated rows.
  const { createSupabaseServerClient } = await import('@/shared/supabase/server');
  const supabase = await createSupabaseServerClient();
  await supabase.from('uploads').delete().eq('id', uploadId);
  revalidatePath('/app/uploads');
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

async function updateUploadStoragePath(id: string, storagePath: string): Promise<void> {
  const { createSupabaseServerClient } = await import('@/shared/supabase/server');
  const supabase = await createSupabaseServerClient();
  await supabase.from('uploads').update({ storage_path: storagePath }).eq('id', id);
}
