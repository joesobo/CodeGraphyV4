import { describe, expect, it, vi } from 'vitest';
import { PluginRegistry } from '@/core/plugins/registry/manager';
import { EventBus } from '@/core/plugins/events/bus';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { ViewRegistry } from '@/core/views/registry';
import { IPlugin } from '@/core/plugins/types/contracts';

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.test'],
    detectConnections: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as IPlugin;
}

function createConfiguredRegistry() {
  const registry = new PluginRegistry();
  registry.configureV2({
    eventBus: new EventBus(),
    decorationManager: new DecorationManager(),
    viewRegistry: new ViewRegistry(),
    graphProvider: () => ({ nodes: [], edges: [] }),
    commandRegistrar: () => ({ dispose: () => {} }),
    webviewSender: () => {},
    workspaceRoot: '/workspace',
  });
  return registry;
}

describe('PluginRegistry lookup resilience', () => {
  it('keeps the remaining plugin available when unregistering one plugin from a shared extension bucket', () => {
    const registry = createConfiguredRegistry();
    const first = createPlugin('first', { supportedExtensions: ['.ts'] });
    const second = createPlugin('second', { supportedExtensions: ['.ts'] });

    registry.register(first);
    registry.register(second);
    registry.unregister(first.id);

    expect(registry.getPluginForFile('app.ts')).toBe(second);
    expect(registry.getPluginsForExtension('.ts')).toEqual([second]);
    expect(registry.supportsFile('app.ts')).toBe(true);
  });

  it('removes the final extension bucket when the last plugin is unregistered', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('ts-plugin', { supportedExtensions: ['ts'] });

    registry.register(plugin);
    registry.unregister(plugin.id);

    expect(registry.getSupportedExtensions()).not.toContain('.ts');
    expect(registry.supportsFile('app.ts')).toBe(false);
  });

  it('returns false for files ending with a dot', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('ts-plugin', { supportedExtensions: ['.ts'] });

    registry.register(plugin);

    expect(registry.supportsFile('app.')).toBe(false);
  });

  it('ignores stale plugin ids when resolving a plugin for a file', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('ts-plugin', { supportedExtensions: ['.ts'] });

    registry.register(plugin);
    (
      registry as unknown as { _extensionMap: Map<string, string[]> }
    )._extensionMap.set('.ts', ['missing-plugin']);

    expect(registry.getPluginForFile('app.ts')).toBeUndefined();
  });

  it('falls through stale plugin ids until it finds a live plugin for a file', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('ts-plugin', { supportedExtensions: ['.ts'] });

    registry.register(plugin);
    (
      registry as unknown as { _extensionMap: Map<string, string[]> }
    )._extensionMap.set('.ts', ['missing-plugin', plugin.id]);

    expect(registry.getPluginForFile('app.ts')).toBe(plugin);
  });

  it('ignores stale plugin ids when listing plugins for an extension', () => {
    const registry = createConfiguredRegistry();
    const plugin = createPlugin('ts-plugin', { supportedExtensions: ['.ts'] });

    registry.register(plugin);
    (
      registry as unknown as { _extensionMap: Map<string, string[]> }
    )._extensionMap.set('.ts', ['missing-plugin', plugin.id]);

    expect(registry.getPluginsForExtension('.ts')).toEqual([plugin]);
  });

  it('unregisters plugins without configured v2 services', () => {
    const registry = new PluginRegistry();
    const onUnload = vi.fn();
    const plugin = createPlugin('no-config', { onUnload });

    registry.register(plugin);

    expect(registry.unregister(plugin.id)).toBe(true);
    expect(onUnload).toHaveBeenCalledOnce();
    expect(registry.size).toBe(0);
  });

  it('skips missing unload hooks during unregister', () => {
    const registry = createConfiguredRegistry();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugin = createPlugin('no-unload-hook');

    registry.register(plugin);
    expect(() => registry.unregister(plugin.id)).not.toThrow();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
