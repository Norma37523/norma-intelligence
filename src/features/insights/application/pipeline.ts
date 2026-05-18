import 'server-only';

import type { DREStatement } from '@/features/dre';
import type { Detection } from '../domain';
import { defaultDetector } from '../detectors';
import type { LLMProvider } from '../infrastructure/llm-provider';
import { LLMNotConfiguredError } from '../infrastructure/llm-provider';
import { NARRATIVE_SYSTEM_PROMPT, buildNarrativeUserMessage } from './prompts';

export interface DetectedInsight {
  readonly detection: Detection;
  readonly body: string;
  readonly origin: 'statistic' | 'hybrid';
}

interface RunPipelineArgs {
  readonly statement: DREStatement;
  readonly llm: LLMProvider | null;
  readonly maxLLMCalls?: number;            // budget guard
}

/**
 * Run the full detection + narrative pipeline over a DRE statement.
 *
 * Algorithm:
 *   1. Run all detectors → raw Detection[].
 *   2. Sort by severity (critical → warning → info) and score (descending).
 *   3. For the top `maxLLMCalls` detections, ask the LLM for a richer narrative.
 *      Everything else keeps the `bodySeed` as body and origin='statistic'.
 *   4. Return the merged list; the caller persists.
 */
export async function runInsightsPipeline(args: RunPipelineArgs): Promise<DetectedInsight[]> {
  const { statement, llm, maxLLMCalls = 8 } = args;

  const raw = defaultDetector({
    companyId: statement.companyId,
    statement,
    currency: statement.currency,
  });

  const sorted = [...raw].sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    return b.score - a.score;
  });

  const enriched: DetectedInsight[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const detection = sorted[i]!;
    const shouldUseLLM = llm !== null && i < maxLLMCalls;

    if (shouldUseLLM) {
      try {
        const body = await llm.generateNarrative({
          system: NARRATIVE_SYSTEM_PROMPT,
          user: buildNarrativeUserMessage({ detection, statement }),
          maxTokens: 600,
          temperature: 0.3,
        });
        enriched.push({
          detection,
          body: body || detection.bodySeed,
          origin: 'hybrid',
        });
        continue;
      } catch (e) {
        if (!(e instanceof LLMNotConfiguredError)) {
          // Don't fail the whole pipeline — degrade gracefully.
          // eslint-disable-next-line no-console
          console.warn(`LLM narrative failed for ${detection.fingerprint}:`, e);
        }
      }
    }

    enriched.push({
      detection,
      body: detection.bodySeed,
      origin: 'statistic',
    });
  }

  return enriched;
}

function severityRank(s: Detection['severity']): number {
  return s === 'critical' ? 3 : s === 'warning' ? 2 : 1;
}
