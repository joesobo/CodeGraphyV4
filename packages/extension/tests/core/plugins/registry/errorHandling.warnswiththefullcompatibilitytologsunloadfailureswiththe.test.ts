import { PluginRegistry } from '@/core/plugins/registry/manager';
import { IPlugin } from '@/core/plugins/types/contracts';
import { describe, expect, it, vi } from 'vitest';

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.test'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    ...overrides,
  } as IPlugin;
}

function createConfiguredRegistry() {
  return new PluginRegistry();
}

describe('PluginRegistry error handling', () => {


    it('logs analysis failures with the file path and plugin id', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new Error('Parse error');
      const plugin = createPlugin('analysis-plugin', {
        supportedExtensions: ['.ts'],
        analyzeFile: vi.fn().mockRejectedValue(failure),
      });

      registry.register(plugin);
      await expect(registry.analyzeFile('/workspace/app.ts', 'content', '/workspace')).resolves.toEqual([]);

      expect(errorSpy).toHaveBeenCalledWith(
        '[CodeGraphy] Error analyzing /workspace/app.ts with analysis-plugin:',
        failure
      );
      errorSpy.mockRestore();
    });



    it('unloads failed plugins and keeps later healthy plugins routable', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new Error('Init failed');
      const initialize = vi.fn().mockRejectedValue(failure);
      const onUnload = vi.fn();
      const failedPlugin = createPlugin('failed-init', { initialize, onUnload });
      const healthyPlugin = createPlugin('healthy-init', { initialize: vi.fn() });

      registry.register(failedPlugin);
      registry.register(healthyPlugin);
      await registry.initializeAll('/workspace');

      expect(initialize).toHaveBeenCalledOnce();
      expect(onUnload).toHaveBeenCalledOnce();
      expect(registry.get('failed-init')).toBeUndefined();
      expect(registry.getPluginForFile('/workspace/file.test')).toBe(healthyPlugin);
      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error initializing plugin failed-init:', failure);
      errorSpy.mockRestore();
    });

    it('unloads a plugin when individual initialization fails', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onUnload = vi.fn();
      const plugin = createPlugin('failed-individual-init', {
        initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
        onUnload,
      });

      registry.register(plugin);
      await registry.initializePlugin(plugin.id, '/workspace');

      expect(onUnload).toHaveBeenCalledOnce();
      expect(registry.get(plugin.id)).toBeUndefined();
      errorSpy.mockRestore();
    });



    it('skips plugins without initialize hooks', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const plugin = createPlugin('no-initialize');

      registry.register(plugin);
      await expect(registry.initializeAll('/workspace')).resolves.toBeUndefined();

      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });



    it('logs unload failures with the plugin id', () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new Error('onUnload failed');
      const plugin = createPlugin('unload-error', {
        onUnload: vi.fn(() => {
          throw failure;
        }),
      });

      registry.register(plugin);
      expect(() => registry.unregister(plugin.id)).not.toThrow();

      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error in onUnload for plugin unload-error:', failure);
      errorSpy.mockRestore();
    });
});
