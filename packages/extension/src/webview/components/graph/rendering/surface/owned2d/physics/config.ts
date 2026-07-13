import type { GraphLayoutConfig } from './contracts';

export const BASE_FRAME_MS = 1000 / 60;

export const DEFAULT_GRAPH_LAYOUT_CONFIG: Readonly<GraphLayoutConfig> = {
  alphaDecay: 1 - Math.pow(0.001, 1 / 150),
  alphaMinimum: 0.001,
  centralGravity: 0.1,
  chargeStrength: -250,
  collisionIterations: 4,
  collisionPadding: 0,
  collisionStrength: 1,
  constraintForce: 0.12,
  fixedTimeStepMs: BASE_FRAME_MS,
  initializationSpacing: 12,
  linkDistance: 80,
  linkStrength: 0.15,
  maximumCollisionNeighbors: 128,
  maximumElapsedMs: 250,
  maximumSubSteps: 2,
  settleSpeed: 1.5,
  settleSteps: 8,
  velocityDecay: 0.4,
};

export function mergeGraphLayoutConfig(
  current: GraphLayoutConfig,
  update: Partial<GraphLayoutConfig>,
): GraphLayoutConfig {
  const next = { ...current, ...update };
  for (const [key, value] of Object.entries(next)) {
    if (!Number.isFinite(value)) throw new Error(`Graph layout config ${key} must be finite`);
  }
  if (next.fixedTimeStepMs <= 0 || next.linkDistance <= 0) {
    throw new Error('Graph layout time step and link distance must be positive');
  }
  if (next.chargeStrength > 0) {
    throw new Error('Graph layout charge strength must be zero or negative');
  }
  if (next.velocityDecay < 0 || next.velocityDecay > 1) {
    throw new Error('Graph layout velocity decay must be between zero and one');
  }
  return next;
}
