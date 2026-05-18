import type { InsightKind, InsightSeverity, InsightOrigin } from './insight';

/**
 * Pre-insight produced by a detector. The pipeline turns Detections into
 * Insight rows after deduplication, narrative enrichment and persistence.
 */
export interface Detection {
  readonly kind: InsightKind;
  readonly severity: InsightSeverity;
  readonly origin: InsightOrigin;
  readonly title: string;
  /** Short, factual body — the LLM will expand this into a narrative. */
  readonly bodySeed: string;
  readonly evidence: Readonly<Record<string, unknown>>;
  readonly score: number;
  readonly periodStart: string | null;     // "YYYY-MM-DD"
  readonly periodEnd: string | null;
  /** Stable hash used to dedupe insights across runs. */
  readonly fingerprint: string;
}

export function makeFingerprint(parts: Array<string | number | null>): string {
  // Stable, order-sensitive: caller controls field order.
  return parts.map((p) => (p === null ? '∅' : String(p))).join('|');
}
