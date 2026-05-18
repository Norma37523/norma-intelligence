import 'server-only';

import { createSupabaseServerClient } from '@/shared/supabase/server';
import type { TablesInsert } from '@/shared/types/database.types';
import type { Insight } from '../domain';
import type { DetectedInsight } from '../application/pipeline';

interface InsightRow {
  id: string;
  company_id: string;
  kind: Insight['kind'];
  severity: Insight['severity'];
  origin: Insight['origin'];
  title: string;
  body: string;
  evidence: Record<string, unknown>;
  related_period_start: string | null;
  related_period_end: string | null;
  score: number | null;
  generator_model: string | null;
  generator_version: string | null;
  dismissed_at: string | null;
  dismissed_by_user_id: string | null;
  dismiss_reason: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Persist a batch of insights, idempotently per fingerprint.
 *
 * Idempotency strategy: we store the fingerprint in evidence.fingerprint and
 * check existence before inserting. (A unique index on the fingerprint could
 * be added later as an optimization.)
 */
export async function upsertInsights(args: {
  companyId: string;
  generatorModel: string | null;
  items: ReadonlyArray<DetectedInsight>;
}): Promise<{ inserted: number; skipped: number }> {
  if (args.items.length === 0) return { inserted: 0, skipped: 0 };

  const supabase = await createSupabaseServerClient();

  // Pre-fetch existing fingerprints to dedupe.
  const fingerprints = args.items.map((i) => i.detection.fingerprint);
  const { data: existing } = await supabase
    .from('insights')
    .select('evidence')
    .eq('company_id', args.companyId)
    .in('evidence->>fingerprint', fingerprints)
    .returns<{ evidence: { fingerprint?: string } }[]>();

  const existingSet = new Set(
    (existing ?? [])
      .map((r) => r.evidence?.fingerprint)
      .filter((f): f is string => typeof f === 'string'),
  );

  const payload: TablesInsert<'insights'>[] = [];
  let skipped = 0;

  for (const item of args.items) {
    if (existingSet.has(item.detection.fingerprint)) {
      skipped++;
      continue;
    }
    payload.push({
      company_id: args.companyId,
      kind: item.detection.kind,
      severity: item.detection.severity,
      origin: item.origin,
      title: item.detection.title,
      body: item.body,
      evidence: { ...item.detection.evidence, fingerprint: item.detection.fingerprint },
      related_period_start: item.detection.periodStart,
      related_period_end: item.detection.periodEnd,
      score: item.detection.score,
      generator_model: item.origin === 'hybrid' ? args.generatorModel : null,
    });
  }

  if (payload.length > 0) {
    const { error } = await supabase.from('insights').insert(payload);
    if (error) throw new Error(`upsertInsights: ${error.message}`);
  }

  return { inserted: payload.length, skipped };
}

export async function listOpenInsights(companyId: string, limit = 50): Promise<Insight[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('insights')
    .select(
      'id, company_id, kind, severity, origin, title, body, evidence, related_period_start, related_period_end, score, generator_model, generator_version, dismissed_at, dismissed_by_user_id, dismiss_reason, created_at, updated_at',
    )
    .eq('company_id', companyId)
    .is('dismissed_at', null)
    .order('severity', { ascending: false })
    .order('score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<InsightRow[]>();

  if (error) throw new Error(`listOpenInsights: ${error.message}`);

  return (data ?? []).map(rowToInsight);
}

export async function dismissInsight(args: {
  id: string;
  userId: string;
  reason: string | null;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('insights')
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_by_user_id: args.userId,
      dismiss_reason: args.reason,
    })
    .eq('id', args.id);
  if (error) throw new Error(`dismissInsight: ${error.message}`);
}

export async function restoreInsight(id: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('insights')
    .update({ dismissed_at: null, dismissed_by_user_id: null, dismiss_reason: null })
    .eq('id', id);
  if (error) throw new Error(`restoreInsight: ${error.message}`);
}

function rowToInsight(row: InsightRow): Insight {
  return {
    id: row.id,
    organizationId: '',                    // not stored on row; derived via company
    companyId: row.company_id,
    kind: row.kind,
    severity: row.severity,
    origin: row.origin,
    title: row.title,
    body: row.body,
    evidence: row.evidence,
    relatedPeriodStart: row.related_period_start,
    relatedPeriodEnd: row.related_period_end,
    score: row.score,
    createdAt: new Date(row.created_at),
    dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : null,
  };
}
