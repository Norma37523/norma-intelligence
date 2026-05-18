import type { Detection } from '../domain';
import { makeFingerprint } from '../domain';
import type { Detector } from './types';

/**
 * Cash-flow proxy: consecutive months of negative net profit.
 *
 * A real cash-flow detector would walk the cash account history. For now
 * we use net_profit < 0 as a proxy until the Cash Flow Statement module lands.
 */
export const detectCashFlowWarning: Detector = (ctx) => {
  const out: Detection[] = [];
  const { statement } = ctx;
  const lastIdx = statement.periods.length - 1;
  if (lastIdx < 1) return out;

  const netProfit = statement.lines.find((l) => l.type === 'net_profit' && l.isSubtotal)
    ?? statement.lines.find((l) => l.type === 'net_profit');
  if (!netProfit) return out;

  // Count consecutive negative months ending at lastIdx.
  let streak = 0;
  for (let i = lastIdx; i >= 0; i--) {
    if (netProfit.perPeriod[i]!.isNegative()) streak++;
    else break;
  }
  if (streak < 2) return out;

  const severity = streak >= 4 ? 'critical' : streak >= 3 ? 'warning' : 'info';

  out.push({
    kind: 'cash_flow_warning',
    severity,
    origin: 'statistic',
    title: `Resultado líquido negativo há ${streak} meses consecutivos`,
    bodySeed:
      `A empresa registrou resultado líquido negativo em ${streak} meses consecutivos, ` +
      `culminando em ${statement.periods[lastIdx]}. Avalie ações estruturais sobre custo e receita.`,
    evidence: {
      streak,
      last_period: statement.periods[lastIdx],
      values: netProfit.perPeriod.slice(lastIdx - streak + 1, lastIdx + 1).map((m) => m.toNumber()),
    },
    score: Math.min(streak / 6, 1),
    periodStart: `${statement.periods[lastIdx - streak + 1]}-01`,
    periodEnd: `${statement.periods[lastIdx]}-28`,
    fingerprint: makeFingerprint(['cash_flow_warning', statement.companyId, statement.periods[lastIdx]!]),
  });

  return out;
};
