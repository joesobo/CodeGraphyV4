import type { GraphLayoutConfig } from './contracts';

export const BASE_FRAME_MS = 1000 / 60;

export const DEFAULT_GRAPH_LAYOUT_CONFIG: Readonly<GraphLayoutConfig> = {
  alphaDecay: 0.05,
  alphaMinimum: 0.001,
  centerForce: 0.12,
  collisionIterations: 1,
  collisionPadding: 2,
  collisionStrength: 0.7,
  constraintForce: 0.12,
  damping: 0.84,
  fixedTimeStepMs: BASE_FRAME_MS,
  initializationSpacing: 12,
  linkDistance: 80,
  linkForce: 0.08,
  maximumCollisionNeighbors: 64,
  maximumElapsedMs: 250,
  maximumNeighbors: 24,
  maximumSpeed: 80,
  maximumSubSteps: 2,
  repelForce: 1_200,
  settleSpeed: 1.5,
  settleSteps: 8,
};

export function mergeGraphLayoutConfig(
  current: GraphLayoutConfig,
  update: Partial<GraphLayoutConfig>,
): GraphLayoutConfig {
  const next = { ...current, ...update };
  for (const [key, value] of Object.entries(next)) {
    if (!Number.isFinite(value)) throw new Error(`Graph layout config ${key} must be finite`);
  }
  if (next.fixedTimeStepMs <= 0 || next.linkDistance <= 0 || next.maximumSpeed <= 0) {
    throw new Error('Graph layout time step, link distance, and maximum speed must be positive');
  }
  if (next.damping < 0 || next.damping > 1) {
    throw new Error('Graph layout damping must be between zero and one');
  }
  return next;
}
