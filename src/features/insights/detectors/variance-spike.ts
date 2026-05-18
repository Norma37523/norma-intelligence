import { Money } from '@/shared/money/money';

import type { Detection } from '../domain';
import { makeFingerprint } from '../domain';
import type { Detector } from './types';

/**
 * Detect month-over-month variance spikes per DRE line.
 *
 * Severity ladder (absolute % change vs prior month, when prior > R$ 1k):
 *  - critical: >= 50%
 *  - warning:  >= 25%
 *  - info:     >= 15%
 */
export const detectVarianceSpike: Detector = (ctx) => {
  const out: Detection[] = [];
  const { statement } = ctx;
  if (statement.periods.length < 2) return out;

  const lastIdx = statement.periods.length - 1;
  const priorIdx = lastIdx - 1;
  const lastPeriod = statement.periods[lastIdx]!;
  const priorPeriod = statement.periods[priorIdx]!;

  for (const line of statement.lines) {
    const cur = line.perPeriod[lastIdx];
    const prev = line.perPeriod[priorIdx];
    if (!cur || !prev) continue;

    const prevAbs = Math.abs(prev.toNumber());
    if (prevAbs < 1000) continue;                  // ignore micro-variations

    const delta = cur.toNumber() - prev.toNumber();
    const pct = delta / prevAbs;
    const absPct = Math.abs(pct);

    if (absPct < 0.15) continue;

    const severity = absPct >= 0.5 ? 'critical' : absPct >= 0.25 ? 'warning' : 'info';
    const direction = delta >= 0 ? 'alta' : 'queda';
    const formatted = Money.fromMinor(BigInt(Math.round(Math.abs(delta) * 100)), 'BRL').format('pt-BR');

    out.push({
      kind: 'variance_spike',
      severity,
      origin: 'statistic',
      title: `${line.label}: ${direction} de ${(pct * 100).toFixed(1)}%`,
      bodySeed:
        `${line.label} variou ${(pct * 100).toFixed(1)}% (${direction} de ${formatted}) ` +
        `entre ${priorPeriod} e ${lastPeriod}. Valor atual: ${cur.format('pt-BR')}.`,
      evidence: {
        line_id: line.id,
        line_label: line.label,
        line_type: line.type,
        prior_period: priorPeriod,
        prior_value_minor: Math.round(prev.toNumber() * 100),
        current_period: lastPeriod,
        current_value_minor: Math.round(cur.toNumber() * 100),
        delta_pct: pct,
      },
      score: Math.min(absPct, 1),
      periodStart: monthStart(lastPeriod),
      periodEnd: monthEnd(lastPeriod),
      fingerprint: makeFingerprint(['variance_spike', line.id, lastPeriod]),
    });
  }

  return out;
};

function monthStart(p: string): string {
  return `${p}-01`;
}
function monthEnd(p: string): string {
  const [y, m] = p.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${p}-${String(last).padStart(2, '0')}`;
}
