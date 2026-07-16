import { describe, expect, it } from 'vitest';

import {
  assertGraphPhysicsAbi,
  instantiateGraphPhysics,
  MAXIMUM_GRAPH_GRAPH_PHYSICS_PAGES,
  GRAPH_GRAPH_PHYSICS_ABI_VERSION,
  GRAPH_GRAPH_PHYSICS_MEMORY_BASE,
  type GraphPhysicsExports,
} from '@graph-renderer/physics/wasm/abi/contracts';

function exportsFor(
  memory: WebAssembly.Memory,
  abiVersion = GRAPH_GRAPH_PHYSICS_ABI_VERSION,
  graphMemoryBase = GRAPH_GRAPH_PHYSICS_MEMORY_BASE,
): GraphPhysicsExports {
  return {
    memory,
    abiVersion: () => abiVersion,
    graphMemoryBase: () => graphMemoryBase,
  } as GraphPhysicsExports;
}

describe('graph WASM physics ABI', () => {
  it('instantiates the prepared module with its imported memory', () => {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: MAXIMUM_GRAPH_GRAPH_PHYSICS_PAGES,
    });

    const exports = instantiateGraphPhysics(memory);

    expect(exports.memory).toBe(memory);
    expect(exports.abiVersion()).toBe(4);
    expect(exports.graphMemoryBase()).toBe(65_536);
  });

  it('rejects an incompatible ABI version', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });

    expect(() => assertGraphPhysicsAbi(exportsFor(memory, 1), memory))
      .toThrow('Graph WASM physics ABI version mismatch');
  });

  it('rejects an incompatible graph memory base', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });

    expect(() => assertGraphPhysicsAbi(exportsFor(
      memory,
      GRAPH_GRAPH_PHYSICS_ABI_VERSION,
      0,
    ), memory))
      .toThrow('Graph WASM physics memory layout mismatch');
  });

  it('rejects a module that does not re-export its imported memory', () => {
    const importedMemory = new WebAssembly.Memory({ initial: 1 });
    const differentMemory = new WebAssembly.Memory({ initial: 1 });

    expect(() => assertGraphPhysicsAbi(
      exportsFor(differentMemory),
      importedMemory,
    )).toThrow('Graph WASM physics did not export its imported memory');
  });
});
