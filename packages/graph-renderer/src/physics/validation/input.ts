import type { GraphLayoutInput } from '../contracts';

function assertBufferLength(
  buffer: { length: number } | undefined,
  expected: number,
  label: string,
): void {
  if (buffer && buffer.length !== expected) {
    throw new Error(`${label} length must match node count`);
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
  if (input.edgeSources.length !== input.edgeTargets.length) {
    throw new Error('edge source and target buffers must have equal lengths');
  }
}
