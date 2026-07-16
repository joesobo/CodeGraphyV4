import type { GraphLayoutInput } from '../contracts';

export const MAX_GRAPH_CHARGE_MULTIPLIER = 100;
export const MAX_GRAPH_COORDINATE = 100_000_000;
export const MAX_GRAPH_RADIUS = 100_000;
export const MAX_GRAPH_VELOCITY = 100_000_000;

function assertBufferLength(
  buffer: { length: number } | undefined,
  expected: number,
  label: string,
): void {
  if (buffer && buffer.length !== expected) {
    throw new Error(`${label} length must match node count`);
  }
}

function assertFiniteDomain(
  buffer: Float32Array | undefined,
  maximumMagnitude: number,
  label: string,
): void {
  if (!buffer) return;
  for (const value of buffer) {
    if (Number.isFinite(value) && Math.abs(value) > maximumMagnitude) {
      throw new Error(`${label} values must have magnitude at most ${maximumMagnitude}`);
    }
  }
}

function assertMaximum(
  buffer: Float32Array | undefined,
  maximum: number,
  label: string,
): void {
  if (!buffer) return;
  for (const value of buffer) {
    if (Number.isFinite(value) && value > maximum) {
      throw new Error(`${label} values must be at most ${maximum}`);
    }
  }
}

export function validateGraphLayoutInput(input: GraphLayoutInput, nodeCount: number): void {
  assertBufferLength(input.initialX, nodeCount, 'initialX');
  assertBufferLength(input.initialY, nodeCount, 'initialY');
  assertBufferLength(input.initialVx, nodeCount, 'initialVx');
  assertBufferLength(input.initialVy, nodeCount, 'initialVy');
  assertBufferLength(input.chargeStrengthMultipliers, nodeCount, 'chargeStrengthMultipliers');
  assertBufferLength(input.radii, nodeCount, 'radii');
  assertBufferLength(input.flags, nodeCount, 'flags');
  assertFiniteDomain(input.initialX, MAX_GRAPH_COORDINATE, 'initialX');
  assertFiniteDomain(input.initialY, MAX_GRAPH_COORDINATE, 'initialY');
  assertFiniteDomain(input.initialVx, MAX_GRAPH_VELOCITY, 'initialVx');
  assertFiniteDomain(input.initialVy, MAX_GRAPH_VELOCITY, 'initialVy');
  assertMaximum(
    input.chargeStrengthMultipliers,
    MAX_GRAPH_CHARGE_MULTIPLIER,
    'chargeStrengthMultipliers',
  );
  assertMaximum(input.radii, MAX_GRAPH_RADIUS, 'radii');
  if (input.edgeSources.length !== input.edgeTargets.length) {
    throw new Error('edge source and target buffers must have equal lengths');
  }
}
