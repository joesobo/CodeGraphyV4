import type { GraphLayoutConfig } from '../contracts';

export function assertGraphChargeConfig(config: GraphLayoutConfig): void {
  if (config.chargeStrength > 0) {
    throw new Error('Graph layout charge strength must be zero or negative');
  }
  if (
    config.chargeDistanceMin < 0
    || config.chargeDistanceMax < config.chargeDistanceMin
  ) {
    throw new Error('Graph layout charge distance range is invalid');
  }
  if (config.chargeTheta < 0) {
    throw new Error('Graph layout charge theta must be non-negative');
  }
}
