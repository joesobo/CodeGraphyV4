import { beforeEach, describe, expect, it, vi } from 'vitest';

const moduleBytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0);

describe('graph WASM physics module registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects synchronous engine creation before preparation', async () => {
    const registry = await import('@graph-renderer/physics/wasm/runtime/module');

    expect(registry.graphPhysicsModuleReady()).toBe(false);
    expect(() => registry.requireGraphPhysicsModule())
      .toThrow('Graph WASM physics module has not been prepared');
  });

  it('returns the installed shared compiled module', async () => {
    const registry = await import('@graph-renderer/physics/wasm/runtime/module');
    const module = new WebAssembly.Module(moduleBytes);

    registry.installGraphPhysicsModule(module);

    expect(registry.graphPhysicsModuleReady()).toBe(true);
    expect(registry.requireGraphPhysicsModule()).toBe(module);
  });
});
