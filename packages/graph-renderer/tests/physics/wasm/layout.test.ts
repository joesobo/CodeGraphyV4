import { describe, expect, it } from 'vitest';

import { createGraphPhysicsMemoryLayout } from '@graph-renderer/physics/wasm/abi/layout';

describe('graph WASM physics memory layout', () => {
  it('uses the reserved first page and aligned typed-array regions', () => {
    const layout = createGraphPhysicsMemoryLayout(8, 21, 256);

    expect(layout).toMatchObject({
      cellCapacity: 256,
      hashCapacity: 16,
      totalBytes: 131_072,
      x: { offset: 65_536, bytes: 32 },
      y: { offset: 65_568, bytes: 32 },
      flags: { offset: 65_728, bytes: 8 },
      edgeSources: { offset: 65_736, bytes: 84 },
      edgeTargets: { offset: 65_820, bytes: 84 },
      result: { offset: 65_936, bytes: 4 },
      barnesHutChildren: { offset: 65_940, bytes: 4_096 },
      barnesHutStrengths: { offset: 71_352, bytes: 64 },
      barnesHutTraversalSize: { offset: 84_728, bytes: 2_048 },
      collisionNext: { offset: 86_776, bytes: 32 },
      collisionHashKeys: { offset: 86_872, bytes: 64 },
      collisionHashUsed: { offset: 87_000, bytes: 16 },
    });
  });

  it('grows collision hash storage at the next power-of-two boundary', () => {
    expect(createGraphPhysicsMemoryLayout(8, 0, 256).hashCapacity).toBe(16);
    expect(createGraphPhysicsMemoryLayout(9, 0, 256).hashCapacity).toBe(32);
    expect(createGraphPhysicsMemoryLayout(17, 0, 256).hashCapacity).toBe(64);
  });

  it('allocates the measured 2.5k graph storage without overlap', () => {
    const layout = createGraphPhysicsMemoryLayout(2_500, 7_729, 20_064);

    expect(layout).toMatchObject({
      cellCapacity: 20_064,
      hashCapacity: 8_192,
      totalBytes: 1_966_080,
      x: { offset: 65_536, bytes: 10_000 },
      edgeSources: { offset: 128_036, bytes: 30_916 },
      result: { offset: 199_868, bytes: 4 },
      barnesHutChildren: { offset: 199_872, bytes: 321_024 },
      barnesHutStrengths: { offset: 631_216, bytes: 20_000 },
      barnesHutCharges: { offset: 651_216, bytes: 160_512 },
      barnesHutTraversalSize: { offset: 1_694_544, bytes: 160_512 },
      collisionHashKeys: { offset: 1_885_056, bytes: 32_768 },
      collisionHashUsed: { offset: 1_950_592, bytes: 8_192 },
    });
  });
});
