import { describe, expect, it } from 'vitest';

import {
  assertOwnedGraphPhysicsAbi,
  instantiateOwnedGraphPhysics,
  MAXIMUM_OWNED_GRAPH_PHYSICS_PAGES,
  OWNED_GRAPH_PHYSICS_ABI_VERSION,
  OWNED_GRAPH_PHYSICS_MEMORY_BASE,
  type OwnedGraphPhysicsExports,
} from '@graph-renderer/physics/wasm/abi';

function exportsFor(
  memory: WebAssembly.Memory,
  abiVersion = OWNED_GRAPH_PHYSICS_ABI_VERSION,
  graphMemoryBase = OWNED_GRAPH_PHYSICS_MEMORY_BASE,
): OwnedGraphPhysicsExports {
  return {
    memory,
    abiVersion: () => abiVersion,
    graphMemoryBase: () => graphMemoryBase,
  } as OwnedGraphPhysicsExports;
}

describe('owned graph WASM physics ABI', () => {
  it('instantiates the prepared module with its imported memory', () => {
    const memory = new WebAssembly.Memory({
      initial: 1,
      maximum: MAXIMUM_OWNED_GRAPH_PHYSICS_PAGES,
    });

    const exports = instantiateOwnedGraphPhysics(memory);

    expect(exports.memory).toBe(memory);
    expect(exports.abiVersion()).toBe(3);
    expect(exports.graphMemoryBase()).toBe(65_536);
  });

  it('rejects an incompatible ABI version', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });

    expect(() => assertOwnedGraphPhysicsAbi(exportsFor(memory, 1), memory))
      .toThrow('Owned graph WASM physics ABI version mismatch');
  });

  it('rejects an incompatible graph memory base', () => {
    const memory = new WebAssembly.Memory({ initial: 1 });

    expect(() => assertOwnedGraphPhysicsAbi(exportsFor(
      memory,
      OWNED_GRAPH_PHYSICS_ABI_VERSION,
      0,
    ), memory))
      .toThrow('Owned graph WASM physics memory layout mismatch');
  });

  it('rejects a module that does not re-export its imported memory', () => {
    const importedMemory = new WebAssembly.Memory({ initial: 1 });
    const differentMemory = new WebAssembly.Memory({ initial: 1 });

    expect(() => assertOwnedGraphPhysicsAbi(
      exportsFor(differentMemory),
      importedMemory,
    )).toThrow('Owned graph WASM physics did not export its imported memory');
  });
});
