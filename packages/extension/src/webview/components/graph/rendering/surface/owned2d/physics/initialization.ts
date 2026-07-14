import type { GraphLayoutConfig, GraphLayoutInput, GraphLayoutState } from './contracts';
import { updateVisibleLinkDegrees } from './linkDegrees';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function assertBufferLength(
  buffer: { length: number } | undefined,
  expected: number,
  label: string,
): void {
  if (buffer && buffer.length !== expected) {
    throw new Error(`${label} length must match node count`);
  }
}

export function deterministicDirection(first: number, second: number): { x: number; y: number } {
  const hash = Math.imul(first + 1, 73_856_093) ^ Math.imul(second + 1, 19_349_663);
  const angle = ((hash >>> 0) / 4_294_967_296) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function createGraphLayoutState(
  input: GraphLayoutInput,
  config: GraphLayoutConfig,
): GraphLayoutState {
  const nodeCount = input.nodeIds.length;
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

  const state: GraphLayoutState = {
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

  for (let index = 0; index < nodeCount; index += 1) {
    const suppliedX = input.initialX?.[index];
    const suppliedY = input.initialY?.[index];
    if (Number.isFinite(suppliedX) && Number.isFinite(suppliedY)) {
      state.x[index] = suppliedX as number;
      state.y[index] = suppliedY as number;
    } else {
      setInitialPosition(state, index, config.initializationSpacing);
    }
    const suppliedVx = input.initialVx?.[index];
    const suppliedVy = input.initialVy?.[index];
    state.vx[index] = Number.isFinite(suppliedVx) ? suppliedVx as number : 0;
    state.vy[index] = Number.isFinite(suppliedVy) ? suppliedVy as number : 0;
    const suppliedMultiplier = state.chargeStrengthMultipliers[index];
    state.chargeStrengthMultipliers[index] = Number.isFinite(suppliedMultiplier)
      ? Math.max(0, suppliedMultiplier)
      : 1;
    const suppliedRadius = input.radii[index];
    state.radii[index] = Number.isFinite(suppliedRadius) && suppliedRadius > 0
      ? suppliedRadius
      : 1;
  }

  for (let edge = 0; edge < state.edgeSources.length; edge += 1) {
    if (state.edgeSources[edge] >= nodeCount || state.edgeTargets[edge] >= nodeCount) {
      throw new Error(`Edge ${edge} references a missing node`);
    }
  }
  updateVisibleLinkDegrees(state);
  return state;
}

export function recoverFinitePosition(
  state: GraphLayoutState,
  index: number,
  initializationSpacing: number,
): void {
  if (
    Number.isFinite(state.x[index])
    && Number.isFinite(state.y[index])
    && Number.isFinite(state.vx[index])
    && Number.isFinite(state.vy[index])
  ) return;
  setInitialPosition(state, index, initializationSpacing);
  state.vx[index] = 0;
  state.vy[index] = 0;
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
