import { beforeEach, describe, expect, it, vi } from 'vitest';

const moduleBytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0);

describe('owned graph WASM physics module registry', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('rejects synchronous engine creation before preparation', async () => {
    const registry = await import('../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/wasm/module');

    expect(registry.ownedGraphPhysicsModuleReady()).toBe(false);
    expect(() => registry.requireOwnedGraphPhysicsModule())
      .toThrow('Owned graph WASM physics module has not been prepared');
  });

  it('returns the installed shared compiled module', async () => {
    const registry = await import('../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/wasm/module');
    const module = new WebAssembly.Module(moduleBytes);

    registry.installOwnedGraphPhysicsModule(module);

    expect(registry.ownedGraphPhysicsModuleReady()).toBe(true);
    expect(registry.requireOwnedGraphPhysicsModule()).toBe(module);
  });
});
