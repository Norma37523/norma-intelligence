import type { Detection } from '../domain';
import { makeFingerprint } from '../domain';
import type { Detector } from './types';

/**
 * Margin-band detector.
 *
 * Flags gross / EBITDA / net margins that drift outside their historical
 * inter-quartile range by more than 1.5 IQR (classic outlier rule).
 * Also flags any margin that turned negative this period.
 */
export const detectRatioAnomaly: Detector = (ctx) => {
  const out: Detection[] = [];
  const { statement } = ctx;
  const lastIdx = statement.periods.length - 1;
  if (lastIdx < 2) return out;

  const lastPeriod = statement.periods[lastIdx]!;
  const revenueNet = pickLine(statement, 'revenue_net');
  if (!revenueNet) return out;

  const targets: Array<{ key: string; numeratorType: 'gross_profit' | 'ebitda' | 'net_profit'; label: string }> = [
    { key: 'gross', numeratorType: 'gross_profit', label: 'Margem bruta' },
    { key: 'ebitda', numeratorType: 'ebitda', label: 'Margem EBITDA' },
    { key: 'net', numeratorType: 'net_profit', label: 'Margem líquida' },
  ];

  for (const t of targets) {
    const num = pickLine(statement, t.numeratorType);
    if (!num) continue;

    const margins = num.perPeriod.map((m, i) => {
      const rn = revenueNet.perPeriod[i]?.toNumber() ?? 0;
      return rn === 0 ? 0 : m.toNumber() / rn;
    });

    const history = margins.slice(0, lastIdx);
    const current = margins[lastIdx]!;
    if (history.length < 3) continue;

    const { q1, q3, iqr } = quartiles(history);
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;

    const negative = current < 0;
    const outside = current < low || current > high;
    if (!negative && !outside) continue;

    const severity = negative ? 'critical' : 'warning';

    out.push({
      kind: 'ratio_anomaly',
      severity,
      origin: 'statistic',
      title: `${t.label} ${negative ? 'negativa' : 'fora do padrão'} em ${lastPeriod}`,
      bodySeed:
        `${t.label} ficou em ${(current * 100).toFixed(1)}% em ${lastPeriod}, ` +
        `${negative
          ? 'região negativa — sinal de prejuízo operacional.'
          : `fora da faixa histórica (${(low * 100).toFixed(1)}% a ${(high * 100).toFixed(1)}%).`}`,
      evidence: {
        margin_key: t.key,
        current,
        history,
        q1,
        q3,
        low_threshold: low,
        high_threshold: high,
      },
      score: negative ? 1 : Math.min(Math.abs(current - (current < low ? low : high)) / Math.max(Math.abs(iqr), 0.01), 1),
      periodStart: `${lastPeriod}-01`,
      periodEnd: `${lastPeriod}-28`,
      fingerprint: makeFingerprint(['ratio_anomaly', t.key, lastPeriod]),
    });
  }

  return out;
};

function pickLine(
  s: import('@/features/dre').DREStatement,
  type: import('@/features/dre').DRELineType,
) {
  const subtotal = s.lines.find((l) => l.type === type && l.isSubtotal);
  return subtotal ?? s.lines.find((l) => l.type === type) ?? null;
}

function quartiles(arr: number[]): { q1: number; q3: number; iqr: number } {
  const sorted = [...arr].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)]!;
  const q3 = sorted[Math.floor(sorted.length * 0.75)]!;
  return { q1, q3, iqr: q3 - q1 };
}
