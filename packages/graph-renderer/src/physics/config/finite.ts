import type { GraphLayoutConfig } from '../contracts';

export function assertFiniteGraphLayoutConfig(config: GraphLayoutConfig): void {
  for (const [key, value] of Object.entries(config)) {
    const infiniteChargeDistance = key === 'chargeDistanceMax'
      && value === Number.POSITIVE_INFINITY;
    if (!Number.isFinite(value) && !infiniteChargeDistance) {
      throw new Error(`Graph layout config ${key} must be finite`);
    }
  }
}
