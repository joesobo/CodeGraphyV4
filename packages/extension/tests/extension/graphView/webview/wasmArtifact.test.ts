import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('owned graph WASM physics artifact', () => {
  it('is a valid standalone physics module with a raw memory ABI', () => {
    const bytes = readFileSync(resolve(
      __dirname,
      '../../../../src/webview/wasm/generated/owned2d-physics.wasm',
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
        'step',
      ]),
    );

    const memory = new WebAssembly.Memory({ initial: 1, maximum: 32_768 });
    const instance = new WebAssembly.Instance(module, { env: { memory } });
    expect((instance.exports.abiVersion as () => number)()).toBe(3);
    expect((instance.exports.graphMemoryBase as () => number)()).toBe(65_536);
    expect(instance.exports.memory).toBe(memory);
  });
});
