import type { Detection } from '../domain';
import { makeFingerprint } from '../domain';
import type { Detector } from './types';

/**
 * Linear-regression based trend-break detector.
 *
 * For each line with at least 6 periods of history (or all available if fewer),
 * we fit a least-squares line on periods [0..n-2] and check whether the actual
 * period n-1 sits more than 2 standard residuals away from the prediction.
 */
export const detectTrendBreak: Detector = (ctx) => {
  const out: Detection[] = [];
  const { statement } = ctx;
  if (statement.periods.length < 4) return out;

  const lastIdx = statement.periods.length - 1;
  const lastPeriod = statement.periods[lastIdx]!;

  for (const line of statement.lines) {
    if (!line.isSubtotal && line.type !== 'revenue_gross') continue; // focus on aggregates

    const series = line.perPeriod.slice(0, lastIdx).map((m) => m.toNumber());
    if (series.length < 3) continue;

    const { slope, intercept, residualStd } = linearRegression(series);
    if (residualStd === 0) continue;

    const predicted = slope * lastIdx + intercept;
    const actual = line.perPeriod[lastIdx]!.toNumber();
    const diff = actual - predicted;
    const zScore = diff / residualStd;

    if (Math.abs(zScore) < 2) continue;            // not significant

    const severity = Math.abs(zScore) >= 3 ? 'critical' : 'warning';
    const direction = diff >= 0 ? 'acima' : 'abaixo';

    out.push({
      kind: 'trend_break',
      severity,
      origin: 'statistic',
      title: `${line.label}: quebra de tendência em ${lastPeriod}`,
      bodySeed:
        `${line.label} ficou ${direction} da tendência projetada em ${zScore.toFixed(1)} σ. ` +
        `Esperado: ${fmt(predicted)}; observado: ${fmt(actual)}.`,
      evidence: {
        line_id: line.id,
        line_label: line.label,
        series,
        predicted,
        actual,
        z_score: zScore,
        slope,
      },
      score: Math.min(Math.abs(zScore) / 4, 1),
      periodStart: `${lastPeriod}-01`,
      periodEnd: `${lastPeriod}-28`,                // approximate; UI doesn't rely on day
      fingerprint: makeFingerprint(['trend_break', line.id, lastPeriod]),
    });
  }

  return out;
};

function linearRegression(y: number[]): {
  slope: number;
  intercept: number;
  residualStd: number;
} {
  const n = y.length;
  const xs = y.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (y[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const r = y[i]! - (slope * xs[i]! + intercept);
    ssr += r * r;
  }
  const residualStd = Math.sqrt(ssr / Math.max(n - 2, 1));
  return { slope, intercept, residualStd };
}

function fmt(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
