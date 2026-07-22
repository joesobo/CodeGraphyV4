import { describe, expect, it, vi } from 'vitest';
import { ExtensionPluginRegistry } from '../../../src/extension/plugins/registry';

function createPlugin(overrides: Record<string, unknown> = {}) {
  return {
    id: 'acme.particles',
    name: 'Particles',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    ...overrides,
  };
}

describe('ExtensionPluginRegistry', () => {
  it('owns Extension plugin lifecycle without adding the plugin to Core analysis', async () => {
    const initialize = vi.fn(async () => undefined);
    const onWebviewReady = vi.fn();
    const onUnload = vi.fn();
    const registry = new ExtensionPluginRegistry();

    registry.register(createPlugin({ initialize, onWebviewReady, onUnload }), {
      sourcePackage: '@acme/particles',
      sourcePackageRoot: '/plugins/particles',
    });
    await registry.initializeAll('/workspace');
    registry.notifyWebviewReady();
    registry.disposeAll();

    expect(initialize).toHaveBeenCalledWith('/workspace');
    expect(onWebviewReady).toHaveBeenCalledOnce();
    expect(onUnload).toHaveBeenCalledOnce();
    expect(registry.list()).toEqual([]);
  });

  it('rejects a plugin for an incompatible Extension Plugin API', () => {
    const registry = new ExtensionPluginRegistry();

    expect(() => registry.register(createPlugin({ apiVersion: '^2.0.0' }))).toThrow(
      "Extension plugin 'acme.particles' requires API '^2.0.0', but the VS Code extension provides '1.0.0'.",
    );
  });
});
