import type { DREStatement } from '@/features/dre';

export interface DetectorContext {
  readonly companyId: string;
  readonly statement: DREStatement;
  /** Currency for formatting in insight body. */
  readonly currency: 'BRL' | 'USD' | 'EUR';
}

import type { Detection } from '../domain';

export type Detector = (ctx: DetectorContext) => ReadonlyArray<Detection>;

/** Compose multiple detectors into one. */
export function combineDetectors(...detectors: Detector[]): Detector {
  return (ctx) => detectors.flatMap((d) => d(ctx));
}
