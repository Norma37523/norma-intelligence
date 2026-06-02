/** Public API — client-safe surface. */
export type {
  Insight,
  InsightKind,
  InsightSeverity,
  InsightOrigin,
  Detection,
} from './domain';

// ⚠️  Server actions NÃO re-exportadas aqui para evitar "Server Action not found".
// Importe de '@/features/insights/application/actions' diretamente.
export type { GenerateInsightsResult } from './application/actions';

export { InsightCard } from './presentation/insight-card';
export { InsightsList } from './presentation/insights-list';
export { GenerateButton } from './presentation/generate-button';
export { DismissAction } from './presentation/dismiss-action';
