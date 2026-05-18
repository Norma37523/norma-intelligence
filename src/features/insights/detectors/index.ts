export { combineDetectors } from './types';
export type { Detector, DetectorContext } from './types';
export { detectVarianceSpike } from './variance-spike';
export { detectTrendBreak } from './trend-break';
export { detectRatioAnomaly } from './ratio-anomaly';
export { detectCashFlowWarning } from './cash-flow';

import { combineDetectors } from './types';
import { detectVarianceSpike } from './variance-spike';
import { detectTrendBreak } from './trend-break';
import { detectRatioAnomaly } from './ratio-anomaly';
import { detectCashFlowWarning } from './cash-flow';

/** Default detector bundle used by the insights pipeline. */
export const defaultDetector = combineDetectors(
  detectVarianceSpike,
  detectTrendBreak,
  detectRatioAnomaly,
  detectCashFlowWarning,
);
