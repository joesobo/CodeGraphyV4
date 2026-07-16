import { CodeGraphyAPIImpl } from '@/core/plugins/api/instance';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { EventBus } from '@/core/plugins/events/bus';
import { PluginRegistry } from '@/core/plugins/registry/manager';
import { IPlugin } from '@/core/plugins/types/contracts';
import { ViewRegistry } from '@/core/views/registry';
import { describe, expect, it, vi } from 'vitest';

function createPlugin(id: string, overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.test'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
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

describe('PluginRegistry error handling', () => {


    it('warns with the full compatibility message for incompatible webview contributions', () => {
      const registry = createConfiguredRegistry();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const plugin = createPlugin('webview-mismatch', {
        webviewApiVersion: '^2.0.0',
        webviewContributions: { scripts: ['dist/webview.js'] },
      });

      registry.register(plugin);

      expect(warnSpy).toHaveBeenCalledWith(
        "[CodeGraphy] Plugin 'webview-mismatch' declares incompatible webviewApiVersion '^2.0.0' (host: '1.0.0'). Webview contributions may not behave as expected."
      );
      warnSpy.mockRestore();
    });



    it('skips the warning for compatible webview contributions', () => {
      const registry = createConfiguredRegistry();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const plugin = createPlugin('webview-compatible', {
        webviewApiVersion: ' 1.0.0 ',
        webviewContributions: { scripts: ['dist/webview.js'] },
      });

      registry.register(plugin);

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });



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



    it('routes default API logs to the matching console method', () => {
      const registry = createConfiguredRegistry();
      const infoSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const plugin = createPlugin('logger-plugin');

      registry.register(plugin);
      const api = registry.getPluginAPI(plugin.id) as CodeGraphyAPIImpl;

      api.log('info', 'hello');
      api.log('warn', 'careful');
      api.log('error', 'boom');

      expect(infoSpy).toHaveBeenCalledWith('[logger-plugin]', 'hello');
      expect(warnSpy).toHaveBeenCalledWith('[logger-plugin]', 'careful');
      expect(errorSpy).toHaveBeenCalledWith('[logger-plugin]', 'boom');
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });



    it('logs initialize failures and retries after clearing failed initialization state', async () => {
      const registry = createConfiguredRegistry();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const failure = new Error('Init failed');
      const initialize = vi.fn().mockRejectedValue(failure);
      const plugin = createPlugin('retry-init', { initialize });

      registry.register(plugin);
      await registry.initializeAll('/workspace');
      await registry.initializeAll('/workspace');

      expect(initialize).toHaveBeenCalledTimes(2);
      expect(errorSpy).toHaveBeenCalledWith('[CodeGraphy] Error initializing plugin retry-init:', failure);
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
