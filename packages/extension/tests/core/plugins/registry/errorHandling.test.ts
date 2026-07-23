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

    it('accepts whitespace-padded compatible core api ranges', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('trimmed-core-range', {
        apiVersion: ' ^4.0.0 ',
      });

      expect(() => registry.register(plugin)).not.toThrow();
    });



    it('reports malformed core apiVersion strings with exact guidance', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('bad-range-plugin', {
        apiVersion: 'latest',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'bad-range-plugin' declares invalid apiVersion 'latest'. Use '^4.0.0' or an exact semver string."
      );
    });



    it('reports future core api ranges with the host version in the message', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('future-plugin', {
        apiVersion: '^5.0.0',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'future-plugin' requires future CodeGraphy Plugin API '^5.0.0', but host provides '4.0.0'."
      );
    });



    it('classifies whitespace-padded future core api ranges as future requirements', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('trimmed-future-plugin', {
        apiVersion: ' ^5.0.0 ',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'trimmed-future-plugin' requires future CodeGraphy Plugin API ' ^5.0.0 ', but host provides '4.0.0'."
      );
    });



    it('reports unsupported older core api ranges with the host version in the message', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('legacy-plugin', {
        apiVersion: '^2.0.0',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'legacy-plugin' targets unsupported CodeGraphy Plugin API '^2.0.0'. Host provides '4.0.0'."
      );
    });



    it('treats same-major newer minor ranges as unsupported instead of future-only', () => {
      const registry = createConfiguredRegistry();
      const plugin = createPlugin('minor-ahead-plugin', {
        apiVersion: '^4.1.0',
      });

      expect(() => registry.register(plugin)).toThrow(
        "Plugin 'minor-ahead-plugin' targets unsupported CodeGraphy Plugin API '^4.1.0'. Host provides '4.0.0'."
      );
    });
});
