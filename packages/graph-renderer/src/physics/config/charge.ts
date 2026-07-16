import type { GraphLayoutConfig } from '../contracts';

export const MAX_GRAPH_CHARGE_DISTANCE = 1_000_000;
export const MAX_GRAPH_CHARGE_STRENGTH = 10_000;
export const MAX_GRAPH_CHARGE_THETA = 2;

function assertChargeStrength(strength: number): void {
  if (strength > 0 || strength < -MAX_GRAPH_CHARGE_STRENGTH) {
    throw new Error(`Graph layout charge strength must be between -${MAX_GRAPH_CHARGE_STRENGTH} and zero`);
  }
}

function assertChargeDistance(minimum: number, maximum: number): void {
  const finiteMaximumTooLarge = Number.isFinite(maximum)
    && maximum > MAX_GRAPH_CHARGE_DISTANCE;
  if (minimum < 0
    || minimum > MAX_GRAPH_CHARGE_DISTANCE
    || finiteMaximumTooLarge
    || maximum < minimum) {
    throw new Error(`Graph layout charge distance range must stay between zero and ${MAX_GRAPH_CHARGE_DISTANCE}, or use Infinity as the maximum`);
  }
}

function assertChargeTheta(theta: number): void {
  if (theta < 0 || theta > MAX_GRAPH_CHARGE_THETA) {
    throw new Error(`Graph layout charge theta must be between zero and ${MAX_GRAPH_CHARGE_THETA}`);
  }
}

export function assertGraphChargeConfig(config: GraphLayoutConfig): void {
  assertChargeStrength(config.chargeStrength);
  assertChargeDistance(config.chargeDistanceMin, config.chargeDistanceMax);
  assertChargeTheta(config.chargeTheta);
}
