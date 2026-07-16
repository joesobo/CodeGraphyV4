import { createHash } from 'node:crypto';

import type { GraphLayoutInput } from '@graph-renderer/physics';

export function lineGraph(nodeCount: number): GraphLayoutInput {
  return {
    nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
    radii: new Float32Array(nodeCount).fill(4),
    edgeSources: Uint32Array.from(
      Array.from({ length: nodeCount - 1 }, (_, index) => index),
    ),
    edgeTargets: Uint32Array.from(
      Array.from({ length: nodeCount - 1 }, (_, index) => index + 1),
    ),
  };
}

export function positionHash(x: Float32Array, y: Float32Array): string {
  const hash = createHash('sha256');
  hash.update(new Uint8Array(x.buffer, x.byteOffset, x.byteLength));
  hash.update(new Uint8Array(y.buffer, y.byteOffset, y.byteLength));
  return hash.digest('hex');
}

export function kinematicsHash(engine: {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
}): string {
  const hash = createHash('sha256');
  for (const values of [engine.x, engine.y, engine.vx, engine.vy]) {
    hash.update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
  }
  return hash.digest('hex');
}
