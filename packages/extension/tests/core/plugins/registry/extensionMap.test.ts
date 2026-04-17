import { describe, it, expect } from 'vitest';
import { addPluginToExtensionMap, removePluginFromExtensionMap } from '@/core/plugins/registry/runtime/maps/extensionMap';
import type { IPlugin } from '@/core/plugins/types/contracts';

function createPlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    analyzeFile: async filePath => ({ filePath, relations: [] }),
    ...overrides,
  } as IPlugin;
}

describe('addPluginToExtensionMap', () => {
  it('adds plugin ID to the extension map for each supported extension', () => {
    const extensionMap = new Map<string, string[]>();
    const plugin = createPlugin({ supportedExtensions: ['.ts', '.tsx'] });

    addPluginToExtensionMap(plugin, extensionMap);

    expect(extensionMap.get('.ts')).toEqual(['test-plugin']);
    expect(extensionMap.get('.tsx')).toEqual(['test-plugin']);
  });

  it('normalizes extensions without a leading dot', () => {
    const extensionMap = new Map<string, string[]>();
    const plugin = createPlugin({ supportedExtensions: ['ts', 'tsx'] });

    addPluginToExtensionMap(plugin, extensionMap);

    expect(extensionMap.get('.ts')).toEqual(['test-plugin']);
    expect(extensionMap.get('.tsx')).toEqual(['test-plugin']);
  });

  it('appends to existing entries for shared extensions', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['existing-plugin']);
    const plugin = createPlugin({ id: 'new-plugin', supportedExtensions: ['.ts'] });

    addPluginToExtensionMap(plugin, extensionMap);

    expect(extensionMap.get('.ts')).toEqual(['existing-plugin', 'new-plugin']);
  });

  it('creates a new array when extension is not yet in the map', () => {
    const extensionMap = new Map<string, string[]>();
    const plugin = createPlugin({ supportedExtensions: ['.py'] });

    addPluginToExtensionMap(plugin, extensionMap);

    expect(extensionMap.get('.py')).toEqual(['test-plugin']);
  });

  it('handles a plugin with no supported extensions', () => {
    const extensionMap = new Map<string, string[]>();
    const plugin = createPlugin({ supportedExtensions: [] });

    addPluginToExtensionMap(plugin, extensionMap);

    expect(extensionMap.size).toBe(0);
  });

  it('stores wildcard plugins under the wildcard extension key', () => {
    const extensionMap = new Map<string, string[]>();
    const plugin = createPlugin({ supportedExtensions: ['*'] });

    addPluginToExtensionMap(plugin, extensionMap);

    expect(extensionMap.get('*')).toEqual(['test-plugin']);
  });
});

describe('removePluginFromExtensionMap', () => {
  it('removes the plugin ID from extension entries', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['test-plugin', 'other-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['.ts'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.get('.ts')).toEqual(['other-plugin']);
  });

  it('deletes the extension key when the last plugin is removed', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['test-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['.ts'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.has('.ts')).toBe(false);
  });

  it('does nothing when extension is not in the map', () => {
    const extensionMap = new Map<string, string[]>();
    const plugin = createPlugin({ supportedExtensions: ['.ts'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.size).toBe(0);
  });

  it('does nothing when plugin ID is not in the extension array', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['other-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['.ts'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.get('.ts')).toEqual(['other-plugin']);
  });

  it('normalizes extensions without a leading dot', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['test-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['ts'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.has('.ts')).toBe(false);
  });

  it('handles removing from multiple extensions', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['test-plugin']);
    extensionMap.set('.tsx', ['test-plugin', 'other-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['.ts', '.tsx'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.has('.ts')).toBe(false);
    expect(extensionMap.get('.tsx')).toEqual(['other-plugin']);
  });

  it('handles a plugin with no supported extensions', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('.ts', ['test-plugin']);
    const plugin = createPlugin({ supportedExtensions: [] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    // .ts entry should be unchanged
    expect(extensionMap.get('.ts')).toEqual(['test-plugin']);
  });

  it('removes wildcard plugins and clears the wildcard key when empty', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('*', ['test-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['*'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.has('*')).toBe(false);
  });

  it('keeps wildcard entries unchanged when the plugin id is absent', () => {
    const extensionMap = new Map<string, string[]>();
    extensionMap.set('*', ['other-plugin']);
    const plugin = createPlugin({ supportedExtensions: ['*'] });

    removePluginFromExtensionMap('test-plugin', plugin, extensionMap);

    expect(extensionMap.get('*')).toEqual(['other-plugin']);
  });
});
