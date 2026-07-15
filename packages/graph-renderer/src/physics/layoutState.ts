import type { GraphLayoutInput, GraphLayoutState } from './contracts';

export function createEmptyGraphLayoutState(
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
