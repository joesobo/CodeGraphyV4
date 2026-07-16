import type { GraphLayoutConfig } from '../contracts';

const MAX_COLLISION_ITERATIONS = 64;
export const MAX_GRAPH_CENTRAL_GRAVITY = 1;
export const MAX_GRAPH_COLLISION_PADDING = 100_000;
export const MAX_GRAPH_INITIALIZATION_SPACING = 100_000;
export const MAX_GRAPH_LINK_DISTANCE = 100_000;
export const MAX_GRAPH_LINK_STRENGTH = 10;
export const MAX_GRAPH_SETTLE_SPEED = 100_000;
export const MAX_GRAPH_SETTLE_STEPS = 86_400;

function assertUnitInterval(value: number, label: string): void {
  if (value < 0 || value > 1) {
    throw new Error(`Graph layout ${label} must be between zero and one`);
  }
}

function assertRange(value: number, minimum: number, maximum: number, label: string): void {
  if (value < minimum || value > maximum) {
    throw new Error(`Graph layout ${label} must be between ${minimum} and ${maximum}`);
  }
}

function assertCollisionIterations(iterations: number): void {
  if (!Number.isInteger(iterations)
    || iterations < 0
    || iterations > MAX_COLLISION_ITERATIONS) {
    throw new Error(`Graph layout collision iterations must be an integer between zero and ${MAX_COLLISION_ITERATIONS}`);
  }
}

function assertPositiveMaximum(value: number, maximum: number, label: string): void {
  if (value <= 0 || value > maximum) {
    throw new Error(`Graph layout ${label} must be greater than zero and at most ${maximum}`);
  }
}

function assertSettleSteps(steps: number): void {
  if (!Number.isSafeInteger(steps) || steps <= 0 || steps > MAX_GRAPH_SETTLE_STEPS) {
    throw new Error(`Graph layout settle steps must be an integer between one and ${MAX_GRAPH_SETTLE_STEPS}`);
  }
}

function assertCollisionConfig(config: GraphLayoutConfig): void {
  assertCollisionIterations(config.collisionIterations);
  assertRange(config.collisionPadding, 0, MAX_GRAPH_COLLISION_PADDING, 'collision padding');
  assertUnitInterval(config.collisionStrength, 'collision strength');
}

function assertLinkConfig(config: GraphLayoutConfig): void {
  assertPositiveMaximum(config.linkDistance, MAX_GRAPH_LINK_DISTANCE, 'link distance');
  assertRange(config.linkStrength, 0, MAX_GRAPH_LINK_STRENGTH, 'link strength');
}

export function assertGraphIntegrationConfig(config: GraphLayoutConfig): void {
  assertUnitInterval(config.alphaDecay, 'alpha decay');
  assertUnitInterval(config.alphaMinimum, 'alpha minimum');
  assertRange(config.centralGravity, 0, MAX_GRAPH_CENTRAL_GRAVITY, 'central gravity');
  assertCollisionConfig(config);
  assertPositiveMaximum(
    config.initializationSpacing,
    MAX_GRAPH_INITIALIZATION_SPACING,
    'initialization spacing',
  );
  assertLinkConfig(config);
  assertRange(config.settleSpeed, 0, MAX_GRAPH_SETTLE_SPEED, 'settle speed');
  assertSettleSteps(config.settleSteps);
  assertUnitInterval(config.velocityDecay, 'velocity decay');
}
