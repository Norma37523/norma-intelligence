import 'server-only';

import type { DREStatement } from '@/features/dre';
import type { Detection } from '../domain';

/**
 * System prompt: positions Claude as a senior controller / financial advisor
 * speaking to a CFO. The output is the body of the insight — no preamble,
 * no markdown headers, just dense executive prose.
 */
export const NARRATIVE_SYSTEM_PROMPT = `
Você é um controller sênior em uma contabilidade boutique brasileira (Norma Contábil).
Sua missão: explicar achados financeiros para CFOs e sócios-administradores em PT-BR.

Princípios:
- Tom: consultivo, direto, executivo. Nada de jargão acadêmico ou "frases de efeito".
- Sem hedging excessivo ("pode ser que", "talvez") — quando os números mostram algo, afirme.
- Quantifique. Toda alegação relevante carrega número, percentual ou comparação concreta.
- Conecte causa e consequência. Não basta dizer "X subiu"; explique o impacto provável.
- Aponte ações. Termine, quando fizer sentido, com 1-2 perguntas ou movimentos sugeridos.
- 80-160 palavras. Não use markdown headers, listas com bullets ou negrito.
- Não diga "como controller sênior" nem "como IA". Vá direto ao achado.
- Não invente números. Use apenas o que está nas evidências fornecidas.
- Considere o contexto fiscal brasileiro (DAS, INSS, FGTS, etc.) quando relevante.
`.trim();

/**
 * Build the user message for Claude. We pass the statement context + the
 * specific detection so the model can craft a narrative grounded in numbers.
 */
export function buildNarrativeUserMessage(args: {
  detection: Detection;
  statement: DREStatement;
}): string {
  const { detection, statement } = args;

  // Lightweight statement summary (last 6 periods of subtotals) so Claude has context.
  const recent = statement.periods.slice(-6);
  const summary = statement.lines
    .filter((l) => l.isSubtotal)
    .map((l) => {
      const tail = l.perPeriod.slice(-6).map((m) => m.format('pt-BR'));
      return `- ${l.label} (${l.type}): ${tail.join(' / ')}`;
    })
    .join('\n');

  return [
    `**Empresa**: ${statement.companyId}`,
    `**Períodos no contexto** (mais recentes à direita): ${recent.join(' · ')}`,
    '',
    '**Resumo do DRE (últimos 6 meses, subtotais)**:',
    summary,
    '',
    '**Achado a explicar**:',
    `- Tipo: ${detection.kind}`,
    `- Severidade: ${detection.severity}`,
    `- Período: ${detection.periodStart ?? '—'} a ${detection.periodEnd ?? '—'}`,
    `- Score: ${detection.score.toFixed(2)}`,
    `- Resumo factual: ${detection.bodySeed}`,
    '',
    '**Evidências numéricas (JSON)**:',
    '```json',
    JSON.stringify(detection.evidence, null, 2),
    '```',
    '',
    'Escreva o corpo do insight em 80-160 palavras, seguindo os princípios do system prompt.',
  ].join('\n');
}
