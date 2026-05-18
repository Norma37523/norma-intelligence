'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSession } from '@/features/auth/server';
import { Period } from '@/features/dre';
import { loadStatement } from '@/features/dre/server';
import { ValidationError } from '@/shared/errors/app-error';

import { runInsightsPipeline } from './pipeline';
import { tryCreateLLMProvider } from '../infrastructure/anthropic-provider';
import {
  upsertInsights,
  dismissInsight as dismissInsightRepo,
  restoreInsight as restoreInsightRepo,
} from '../infrastructure/insights-repository';

export interface GenerateInsightsResult {
  inserted: number;
  skipped: number;
  llmUsed: boolean;
}

const generateInput = z.object({
  companyId: z.string().uuid(),
  endPeriod: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  months: z.number().int().min(3).max(24).optional(),
});

/**
 * Generate insights for a company. Builds the DRE statement, runs detectors,
 * optionally narrates via Claude, persists deduplicated.
 *
 * Called from the "Gerar insights" button and also (in the future) right
 * after a fiscal_period is marked as closed.
 */
export async function generateInsights(args: {
  companyId: string;
  endPeriod?: string;
  months?: number;
}): Promise<GenerateInsightsResult> {
  await requireSession();

  const parsed = generateInput.safeParse(args);
  if (!parsed.success) throw new ValidationError(parsed.error.flatten().fieldErrors);

  const period = parsed.data.endPeriod
    ? Period.fromString(parsed.data.endPeriod)
    : Period.current();
  const months = parsed.data.months ?? 12;

  const loaded = await loadStatement(parsed.data.companyId, period, months);
  if (!loaded.hasData) {
    return { inserted: 0, skipped: 0, llmUsed: false };
  }

  const llm = tryCreateLLMProvider();
  const items = await runInsightsPipeline({ statement: loaded.statement, llm });

  const result = await upsertInsights({
    companyId: parsed.data.companyId,
    generatorModel: llm?.modelId ?? null,
    items,
  });

  revalidatePath('/app/insights');
  return { ...result, llmUsed: llm !== null };
}

export async function dismissInsight(id: string, reason: string | null = null): Promise<void> {
  const session = await requireSession();
  await dismissInsightRepo({ id, userId: session.user.id, reason });
  revalidatePath('/app/insights');
}

export async function restoreInsight(id: string): Promise<void> {
  await requireSession();
  await restoreInsightRepo(id);
  revalidatePath('/app/insights');
}
