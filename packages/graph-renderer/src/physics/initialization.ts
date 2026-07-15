import type { GraphLayoutConfig, GraphLayoutInput, GraphLayoutState } from './contracts';
import { updateVisibleLinkDegrees } from './linkDegrees';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function assertBufferLength(
  buffer: { length: number } | undefined,
  expected: number,
  label: string,
): void {
  if (buffer && buffer.length !== expected) {
    throw new Error(`${label} length must match node count`);
  }
}

function validateGraphLayoutInput(input: GraphLayoutInput, nodeCount: number): void {
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

function createEmptyGraphLayoutState(
  input: GraphLayoutInput,
  nodeCount: number,
): GraphLayoutState {
  return {
    x: new Float32Array(nodeCount),
    y: new Float32Array(nodeCount),
    vx: new Float32Array(nodeCount),
    vy: new Float32Array(nodeCount),
    chargeStrengthMultipliers: input.chargeStrengthMultipliers
      ? new Float32Array(input.chargeStrengthMultipliers)
      : new Float32Array(nodeCount).fill(1),
    radii: new Float32Array(nodeCount),
    flags: input.flags ? new Uint8Array(input.flags) : new Uint8Array(nodeCount),
    edgeSources: new Uint32Array(input.edgeSources),
    edgeTargets: new Uint32Array(input.edgeTargets),
    linkDegrees: new Uint32Array(nodeCount),
  };
}

function finiteOrFallback(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function initializeGraphLayoutNode(
  state: GraphLayoutState,
  input: GraphLayoutInput,
  index: number,
  initializationSpacing: number,
): void {
  const suppliedX = input.initialX?.[index];
  const suppliedY = input.initialY?.[index];
  if (Number.isFinite(suppliedX) && Number.isFinite(suppliedY)) {
    state.x[index] = suppliedX as number;
    state.y[index] = suppliedY as number;
  } else {
    setInitialPosition(state, index, initializationSpacing);
  }
  state.vx[index] = finiteOrFallback(input.initialVx?.[index], 0);
  state.vy[index] = finiteOrFallback(input.initialVy?.[index], 0);
  state.chargeStrengthMultipliers[index] = Math.max(
    0,
    finiteOrFallback(state.chargeStrengthMultipliers[index], 1),
  );
  const suppliedRadius = input.radii[index];
  state.radii[index] = Number.isFinite(suppliedRadius) && suppliedRadius > 0
    ? suppliedRadius
    : 1;
}

function validateGraphLayoutEdges(state: GraphLayoutState, nodeCount: number): void {
  for (let edge = 0; edge < state.edgeSources.length; edge += 1) {
    if (state.edgeSources[edge] >= nodeCount || state.edgeTargets[edge] >= nodeCount) {
      throw new Error(`Edge ${edge} references a missing node`);
    }
  }
}

export function createGraphLayoutState(
  input: GraphLayoutInput,
  config: GraphLayoutConfig,
): GraphLayoutState {
  const nodeCount = input.nodeIds.length;
  validateGraphLayoutInput(input, nodeCount);
  const state = createEmptyGraphLayoutState(input, nodeCount);
  for (let index = 0; index < nodeCount; index += 1) {
    initializeGraphLayoutNode(state, input, index, config.initializationSpacing);
  }
  validateGraphLayoutEdges(state, nodeCount);
  updateVisibleLinkDegrees(state);
  return state;
}

function setInitialPosition(
  state: Pick<GraphLayoutState, 'x' | 'y'>,
  index: number,
  spacing: number,
): void {
  const radius = spacing * Math.sqrt(0.5 + index);
  const angle = index * GOLDEN_ANGLE;
  state.x[index] = Math.cos(angle) * radius;
  state.y[index] = Math.sin(angle) * radius;
}
