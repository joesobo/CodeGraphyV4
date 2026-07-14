import type { GraphLayoutConfig } from './contracts';

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
  radialStrength: 1,
  linkDistance: 80,
  linkStrength: 1,
  maximumCollisionNeighbors: 128,
  settleSpeed: 1.5,
  settleSteps: 8,
  velocityDecay: 0.4,
};

function assertFiniteConfig(config: GraphLayoutConfig): void {
  for (const [key, value] of Object.entries(config)) {
    const infiniteChargeDistance = key === 'chargeDistanceMax'
      && value === Number.POSITIVE_INFINITY;
    if (!Number.isFinite(value) && !infiniteChargeDistance) {
      throw new Error(`Graph layout config ${key} must be finite`);
    }
  }
}

function assertChargeConfig(config: GraphLayoutConfig): void {
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

function assertIntegrationConfig(config: GraphLayoutConfig): void {
  if (config.linkDistance <= 0) {
    throw new Error('Graph layout link distance must be positive');
  }
  if (config.velocityDecay < 0 || config.velocityDecay > 1) {
    throw new Error('Graph layout velocity decay must be between zero and one');
  }
  if (config.radialStrength < 0) {
    throw new Error('Graph layout radial strength must be non-negative');
  }
}

export function mergeGraphLayoutConfig(
  current: GraphLayoutConfig,
  update: Partial<GraphLayoutConfig>,
): GraphLayoutConfig {
  const next = { ...current, ...update };
  assertFiniteConfig(next);
  assertChargeConfig(next);
  assertIntegrationConfig(next);
  return next;
}
