import { describe, expect, it, vi } from 'vitest';
import type { IExtensionPlugin } from '@codegraphy-dev/extension-plugin-api';
import { ExtensionPluginRegistry } from '../../../src/extension/plugins/registry';

function createPlugin(overrides: Partial<IExtensionPlugin> = {}): IExtensionPlugin {
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

  it('stores host metadata and returns it by plugin id', () => {
    const registry = new ExtensionPluginRegistry();
    const plugin = createPlugin();

    registry.register(plugin, {
      builtIn: true,
      sourcePackage: '@acme/particles',
      sourcePackageRoot: '/plugins/particles',
    });

    expect(registry.get(plugin.id)).toEqual({
      plugin,
      builtIn: true,
      sourcePackage: '@acme/particles',
      sourcePackageRoot: '/plugins/particles',
    });
    expect(registry.get('missing.plugin')).toBeUndefined();
    expect(registry.list()).toEqual([registry.get(plugin.id)]);
  });

  it('omits optional source metadata and defaults built-in state to false', () => {
    const registry = new ExtensionPluginRegistry();
    const plugin = createPlugin();

    registry.register(plugin);

    expect(registry.get(plugin.id)).toEqual({ plugin, builtIn: false });
  });

  it('rejects duplicate plugin ids', () => {
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin());

    expect(() => registry.register(createPlugin())).toThrow(
      "Extension plugin 'acme.particles' is already registered.",
    );
  });

  it('initializes each plugin once and supports plugins without lifecycle hooks', async () => {
    const initialize = vi.fn(async () => undefined);
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin({ initialize }));
    registry.register(createPlugin({ id: 'acme.static', name: 'Static' }));

    await registry.initializeAll('/first-workspace');
    await registry.initializeAll('/second-workspace');

    expect(initialize).toHaveBeenCalledOnce();
    expect(initialize).toHaveBeenCalledWith('/first-workspace');
    expect(() => registry.notifyWebviewReady()).not.toThrow();
  });

  it('returns false for unknown plugins and unloads registered plugins', async () => {
    const initialize = vi.fn(async () => undefined);
    const onUnload = vi.fn();
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin({ initialize, onUnload }));
    await registry.initializeAll('/workspace');

    expect(registry.unregister('missing.plugin')).toBe(false);
    expect(registry.unregister('acme.particles')).toBe(true);
    expect(onUnload).toHaveBeenCalledOnce();
    expect(registry.list()).toEqual([]);

    registry.register(createPlugin({ initialize }));
    await registry.initializeAll('/new-workspace');
    expect(initialize).toHaveBeenCalledTimes(2);
  });

  it('unregisters plugins that do not have an unload hook', () => {
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin());

    expect(registry.unregister('acme.particles')).toBe(true);
  });

  it('rejects a plugin for an incompatible Extension Plugin API', () => {
    const registry = new ExtensionPluginRegistry();

    expect(() => registry.register(createPlugin({ apiVersion: '^2.0.0' }))).toThrow(
      "Extension plugin 'acme.particles' requires API '^2.0.0', but the VS Code extension provides '1.0.0'.",
    );
  });
});
