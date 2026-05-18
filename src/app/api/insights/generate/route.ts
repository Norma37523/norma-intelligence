import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireSession } from '@/features/auth/server';
import { loadStatement } from '@/features/dre/server';
import { Period } from '@/features/dre/domain/period';
import { runInsightsPipeline, tryCreateLLMProvider } from '@/features/insights/server';
import { upsertInsights } from '@/features/insights/infrastructure/insights-repository';
import { createSupabaseServerClient } from '@/shared/supabase/server';
import { serverEnv } from '@/shared/config/env';

const bodySchema = z.object({
  companyId: z.string().uuid(),
  months: z.number().int().min(1).max(24).default(12),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();

    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { companyId, months } = parsed.data;

    // Verify company belongs to user's org.
    const supabase = await createSupabaseServerClient();
    const { data: company } = await supabase
      .from('companies')
      .select('id, organization_id')
      .eq('id', companyId)
      .single();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const isMember = session.memberships.some(
      (m) => m.organizationId === company.organization_id,
    );
    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load DRE statement.
    const dreData = await loadStatement(companyId, Period.current(), months);
    if (!dreData.hasData) {
      return NextResponse.json(
        { error: 'No financial data found for this company.' },
        { status: 422 },
      );
    }

    // Build LLM provider (null = no API key = statistical only).
    const llm = tryCreateLLMProvider();

    // Run detection + narrative pipeline.
    const detectedInsights = await runInsightsPipeline({
      statement: dreData.statement,
      llm,
      maxLLMCalls: 8,
    });

    const modelName = serverEnv.ANTHROPIC_API_KEY ? 'claude-sonnet-4-6' : null;

    const result = await upsertInsights({
      companyId,
      generatorModel: modelName,
      items: detectedInsights,
    });

    return NextResponse.json({
      inserted: result.inserted,
      skipped: result.skipped,
      total: detectedInsights.length,
      llmEnabled: !!serverEnv.ANTHROPIC_API_KEY,
    });
  } catch (err) {
    console.error('[POST /api/insights/generate]', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
