import type { GraphLayoutConfig } from './contracts';
import { assertGraphChargeConfig } from './configCharge';
import { assertFiniteGraphLayoutConfig } from './configFinite';
import { assertGraphIntegrationConfig } from './configIntegration';

export const DEFAULT_GRAPH_LAYOUT_CONFIG: Readonly<GraphLayoutConfig> = {
  alphaDecay: 1 - Math.pow(0.001, 1 / 300),
  alphaMinimum: 0.001,
  centralGravity: 0.1,
  chargeDistanceMax: Number.POSITIVE_INFINITY,
  chargeDistanceMin: 1,
  chargeStrength: -250,
  chargeTheta: 0.9,
  collisionIterations: 4,
  collisionPadding: 0,
  collisionStrength: 1,
  initializationSpacing: 10,
  linkDistance: 80,
  linkStrength: 1,
  settleSpeed: 1.5,
  settleSteps: 8,
  velocityDecay: 0.4,
};

export function mergeGraphLayoutConfig(
  current: Readonly<GraphLayoutConfig>,
  update: Partial<GraphLayoutConfig>,
): GraphLayoutConfig {
  const next = { ...current, ...update };
  assertFiniteGraphLayoutConfig(next);
  assertGraphChargeConfig(next);
  assertGraphIntegrationConfig(next);
  return next;
}
