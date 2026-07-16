import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildGraphPhysics } from '../../scripts/buildPhysics';

describe('graph WASM physics artifact', () => {
  it('is a valid standalone physics module with a raw memory ABI', () => {
    const bytes = readFileSync(resolve(
      import.meta.dirname,
      '../../src/physics/wasm/generated/physics.wasm',
    ));

    expect([...bytes.subarray(0, 8)]).toEqual([0, 97, 115, 109, 1, 0, 0, 0]);
    expect(WebAssembly.validate(bytes)).toBe(true);

    const module = new WebAssembly.Module(bytes);
    expect(WebAssembly.Module.imports(module)).toEqual([
      { module: 'env', name: 'memory', kind: 'memory' },
    ]);
    expect(WebAssembly.Module.exports(module).map(entry => entry.name)).toEqual(
      expect.arrayContaining([
        'abiVersion',
        'graphMemoryBase',
        'initializeResult',
        'initializeGraph',
        'initializeRepulsion',
        'initializeCollision',
        'configure',
        'applyForces',
        'integrate',
      ]),
    );

    const memory = new WebAssembly.Memory({ initial: 1, maximum: 32_768 });
    const instance = new WebAssembly.Instance(module, { env: { memory } });
    expect((instance.exports.abiVersion as () => number)()).toBe(4);
    expect((instance.exports.graphMemoryBase as () => number)()).toBe(65_536);
    expect(instance.exports.memory).toBe(memory);
  });

  it('matches the current AssemblyScript physics source', async () => {
    const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'codegraphy-graph-physics-'));
    const outputFile = resolve(temporaryDirectory, 'physics.wasm');

    try {
      await buildGraphPhysics(outputFile);
      const committed = readFileSync(resolve(
        import.meta.dirname,
        '../../src/physics/wasm/generated/physics.wasm',
      ));
      expect(readFileSync(outputFile).equals(committed)).toBe(true);
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true });
    }
  }, 10_000);
});
