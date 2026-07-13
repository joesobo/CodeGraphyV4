import type { GraphLayoutInput } from '../physics/contracts';
import type { GraphLayoutTransferBuffers } from './protocol';
import { transferBufferList } from './protocol';

function cloneFloat32(value: Float32Array | undefined): Float32Array | undefined {
  return value ? new Float32Array(value) : undefined;
}

export function transferableGraphLayoutInput(input: GraphLayoutInput): GraphLayoutInput {
  return {
    nodeIds: [...input.nodeIds],
    initialX: cloneFloat32(input.initialX),
    initialY: cloneFloat32(input.initialY),
    initialVx: cloneFloat32(input.initialVx),
    initialVy: cloneFloat32(input.initialVy),
    chargeStrengthMultipliers: cloneFloat32(input.chargeStrengthMultipliers),
    radii: new Float32Array(input.radii),
    edgeSources: new Uint32Array(input.edgeSources),
    edgeTargets: new Uint32Array(input.edgeTargets),
    flags: input.flags ? new Uint8Array(input.flags) : undefined,
    targetX: cloneFloat32(input.targetX),
    targetY: cloneFloat32(input.targetY),
  };
}

export function graphLayoutInputTransfers(input: GraphLayoutInput): Transferable[] {
  return [
    input.initialX?.buffer,
    input.initialY?.buffer,
    input.initialVx?.buffer,
    input.initialVy?.buffer,
    input.chargeStrengthMultipliers?.buffer,
    input.radii.buffer,
    input.edgeSources.buffer,
    input.edgeTargets.buffer,
    input.flags?.buffer,
    input.targetX?.buffer,
    input.targetY?.buffer,
  ].filter((buffer): buffer is ArrayBuffer => buffer instanceof ArrayBuffer);
}

function createTransferBuffers(nodeCount: number): GraphLayoutTransferBuffers {
  const bytes = nodeCount * Float32Array.BYTES_PER_ELEMENT;
  return {
    x: new ArrayBuffer(bytes),
    y: new ArrayBuffer(bytes),
    vx: new ArrayBuffer(bytes),
    vy: new ArrayBuffer(bytes),
  };
}

export function createGraphLayoutTransferBufferPair(
  nodeCount: number,
): [GraphLayoutTransferBuffers, GraphLayoutTransferBuffers] {
  return [createTransferBuffers(nodeCount), createTransferBuffers(nodeCount)];
}

export function graphLayoutOutputTransfers(
  outputBuffers: readonly GraphLayoutTransferBuffers[],
): Transferable[] {
  return outputBuffers.flatMap(transferBufferList);
}
