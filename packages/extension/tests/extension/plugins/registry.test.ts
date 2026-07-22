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

  it('continues initialization after one plugin fails and allows that plugin to retry', async () => {
    const failure = new Error('initialize failed');
    const failingInitialize = vi.fn(async () => {
      throw failure;
    });
    const laterInitialize = vi.fn(async () => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin({ id: 'acme.failing', initialize: failingInitialize }));
    registry.register(createPlugin({ id: 'acme.later', initialize: laterInitialize }));

    await expect(registry.initializeAll('/workspace')).resolves.toBeUndefined();
    await registry.initializeAll('/workspace');

    expect(failingInitialize).toHaveBeenCalledTimes(2);
    expect(laterInitialize).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error initializing Extension plugin acme.failing:',
      failure,
    );
  });

  it('continues notifying webview readiness after one plugin fails', () => {
    const failure = new Error('webview ready failed');
    const failingReady = vi.fn(() => {
      throw failure;
    });
    const laterReady = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin({ id: 'acme.failing', onWebviewReady: failingReady }));
    registry.register(createPlugin({ id: 'acme.later', onWebviewReady: laterReady }));

    expect(() => registry.notifyWebviewReady()).not.toThrow();

    expect(failingReady).toHaveBeenCalledOnce();
    expect(laterReady).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error notifying Extension plugin acme.failing that the webview is ready:',
      failure,
    );
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

  it('continues disposal after one plugin unload fails', () => {
    const failure = new Error('unload failed');
    const failingUnload = vi.fn(() => {
      throw failure;
    });
    const laterUnload = vi.fn();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const registry = new ExtensionPluginRegistry();
    registry.register(createPlugin({ id: 'acme.failing', onUnload: failingUnload }));
    registry.register(createPlugin({ id: 'acme.later', onUnload: laterUnload }));

    expect(() => registry.disposeAll()).not.toThrow();

    expect(failingUnload).toHaveBeenCalledOnce();
    expect(laterUnload).toHaveBeenCalledOnce();
    expect(registry.list()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error unloading Extension plugin acme.failing:',
      failure,
    );
  });

  it('rejects a plugin for an incompatible Extension Plugin API', () => {
    const registry = new ExtensionPluginRegistry();

    expect(() => registry.register(createPlugin({ apiVersion: '^2.0.0' }))).toThrow(
      "Extension plugin 'acme.particles' requires API '^2.0.0', but the VS Code extension provides '1.0.0'.",
    );
  });
});
