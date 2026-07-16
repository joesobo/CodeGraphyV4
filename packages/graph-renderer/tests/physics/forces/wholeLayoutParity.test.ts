import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '@graph-renderer/physics';

describe('whole graph layout trajectory', () => {
  it('matches committed linked-layout reference vectors after five ticks', () => {
    const nodeCount = 100;
    const edgeSources: number[] = [];
    const edgeTargets: number[] = [];
    for (let index = 0; index < nodeCount; index += 1) {
      if (index + 1 < nodeCount) {
        edgeSources.push(index);
        edgeTargets.push(index + 1);
      }
      if (index + 7 < nodeCount) {
        edgeSources.push(index);
        edgeTargets.push(index + 7);
      }
    }
    const engine = createGraphLayoutEngine({
      nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
      initialX: Float32Array.from(
        { length: nodeCount },
        (_, index) => Math.sin(index * 1.31 + 0.17) * 300 + index * 0.019,
      ),
      initialY: Float32Array.from(
        { length: nodeCount },
        (_, index) => Math.cos(index * 1.73 + 0.41) * 240 - index * 0.023,
      ),
      radii: new Float32Array(nodeCount).fill(1),
      edgeSources: Uint32Array.from(edgeSources),
      edgeTargets: Uint32Array.from(edgeTargets),
    }, {
      alphaDecay: 0,
      centralGravity: 0.1,
      chargeStrength: -30,
      collisionIterations: 0,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
    });

    for (let tick = 0; tick < 5; tick += 1) engine.tick();

    for (const [index, x, y] of [
      [0, 108.960283474, 49.179245819],
      [1, 75.676746281, -18.649977987],
      [2, -22.846626438, -33.75646162],
      [7, 22.954667907, 94.782232334],
      [13, -53.575426302, -22.242979872],
      [42, -51.293189222, -48.647932046],
      [99, 68.793242144, 9.048536686],
    ] as const) {
      expect(engine.x[index]).toBeCloseTo(x, 1);
      expect(engine.y[index]).toBeCloseTo(y, 1);
    }
  });
});
