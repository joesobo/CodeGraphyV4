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
    apiVersion: '^2.0.0',
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

    it('uses a custom log function when configureV2 provides one', () => {
      const logFn = vi.fn();
      const registry = new PluginRegistry();
      registry.configureV2({
        eventBus: new EventBus(),
        decorationManager: new DecorationManager(),
        viewRegistry: new ViewRegistry(),
        graphProvider: () => ({ nodes: [], edges: [] }),
        commandRegistrar: () => ({ dispose: () => {} }),
        webviewSender: () => {},
        workspaceRoot: '/workspace',
        logFn,
      });
      const plugin = createPlugin('custom-logger');

      registry.register(plugin);
      registry.getPluginAPI(plugin.id)?.log('warn', 'through-custom-log');

      expect(logFn).toHaveBeenCalledWith('warn', '[custom-logger]', 'through-custom-log');
    });



    it('accepts whitespace-padded compatible core api ranges', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('trimmed-core-range', {
        apiVersion: ' ^2.0.0 ',
      });

      expect(() => registry.register(plugin)).not.toThrow();
    });



    it('reports malformed core apiVersion strings with exact guidance', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('bad-range-plugin', {
        apiVersion: 'latest',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'bad-range-plugin' declares invalid apiVersion 'latest'. Use '^2.2.0' or an exact semver string."
      );
    });



    it('reports future core api ranges with the host version in the message', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('future-plugin', {
        apiVersion: '^3.0.0',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'future-plugin' requires future CodeGraphy Plugin API '^3.0.0', but host provides '2.2.0'."
      );
    });



    it('classifies whitespace-padded future core api ranges as future requirements', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('trimmed-future-plugin', {
        apiVersion: ' ^3.0.0 ',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'trimmed-future-plugin' requires future CodeGraphy Plugin API ' ^3.0.0 ', but host provides '2.2.0'."
      );
    });



    it('reports unsupported older core api ranges with the host version in the message', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('legacy-plugin', {
        apiVersion: '^1.0.0',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'legacy-plugin' targets unsupported CodeGraphy Plugin API '^1.0.0'. Host provides '2.2.0'."
      );
    });



    it('accepts the current additive minor API range', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('minor-ahead-plugin', {
        apiVersion: '^2.2.0',
      });

      expect(() => registry.register(plugin)).not.toThrow();
    });
});
