import { describe, it, expect, vi } from 'vitest';
import {
  getExtension,
  getPluginForFile,
  getPluginsForExtension,
  supportsFile,
  getSupportedExtensions,
  analyzeFile,
  IPluginInfoWithApi,
} from '@/core/plugins/pluginRouting';
import { IPlugin } from '@/core/plugins/types';

function createMockPlugin(overrides: Partial<IPlugin> = {}): IPlugin {
  return {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function buildMaps(plugins: IPlugin[]): {
  pluginsMap: Map<string, IPluginInfoWithApi>;
  extensionMap: Map<string, string[]>;
} {
  const pluginsMap = new Map<string, IPluginInfoWithApi>();
  const extensionMap = new Map<string, string[]>();

  for (const plugin of plugins) {
    pluginsMap.set(plugin.id, { plugin, builtIn: false });
    for (const ext of plugin.supportedExtensions) {
      const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
      const ids = extensionMap.get(normalizedExt) ?? [];
      ids.push(plugin.id);
      extensionMap.set(normalizedExt, ids);
    }
  }

  return { pluginsMap, extensionMap };
}

describe('getExtension', () => {
  it('returns the lowercase extension with leading dot', () => {
    expect(getExtension('src/app.ts')).toBe('.ts');
  });

  it('returns lowercase for mixed-case extension', () => {
    expect(getExtension('app.TS')).toBe('.ts');
  });

  it('returns empty string when there is no extension', () => {
    expect(getExtension('Makefile')).toBe('');
  });

  it('returns empty string when the path ends with a dot', () => {
    expect(getExtension('file.')).toBe('');
  });

  it('uses the last dot for multi-dot filenames', () => {
    expect(getExtension('app.test.ts')).toBe('.ts');
  });
});

describe('getPluginForFile', () => {
  it('returns the first registered plugin for a supported extension', () => {
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
    const { pluginsMap, extensionMap } = buildMaps([plugin]);

    const result = getPluginForFile('src/app.ts', pluginsMap, extensionMap);

    expect(result).toBe(plugin);
  });

  it('returns undefined for an unsupported extension', () => {
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
    const { pluginsMap, extensionMap } = buildMaps([plugin]);

    const result = getPluginForFile('styles.css', pluginsMap, extensionMap);

    expect(result).toBeUndefined();
  });

  it('returns undefined when the extension map is empty', () => {
    const { pluginsMap, extensionMap } = buildMaps([]);

    const result = getPluginForFile('src/app.ts', pluginsMap, extensionMap);

    expect(result).toBeUndefined();
  });

  it('returns the first registered plugin when multiple support the same extension', () => {
    const first = createMockPlugin({ id: 'first', supportedExtensions: ['.ts'] });
    const second = createMockPlugin({ id: 'second', supportedExtensions: ['.ts'] });
    const { pluginsMap, extensionMap } = buildMaps([first, second]);

    const result = getPluginForFile('app.ts', pluginsMap, extensionMap);

    expect(result).toBe(first);
  });
});

describe('getPluginsForExtension', () => {
  it('returns all plugins that support the extension', () => {
    const plugin1 = createMockPlugin({ id: 'one', supportedExtensions: ['.ts'] });
    const plugin2 = createMockPlugin({ id: 'two', supportedExtensions: ['.ts'] });
    const { pluginsMap, extensionMap } = buildMaps([plugin1, plugin2]);

    const result = getPluginsForExtension('.ts', pluginsMap, extensionMap);

    expect(result).toHaveLength(2);
    expect(result).toContain(plugin1);
    expect(result).toContain(plugin2);
  });

  it('returns an empty array for an unsupported extension', () => {
    const { pluginsMap, extensionMap } = buildMaps([]);

    const result = getPluginsForExtension('.xyz', pluginsMap, extensionMap);

    expect(result).toEqual([]);
  });

  it('normalizes extension without a leading dot', () => {
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
    const { pluginsMap, extensionMap } = buildMaps([plugin]);

    const result = getPluginsForExtension('ts', pluginsMap, extensionMap);

    expect(result).toContain(plugin);
  });
});

describe('supportsFile', () => {
  it('returns true when a plugin supports the file extension', () => {
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
    const { extensionMap } = buildMaps([plugin]);

    expect(supportsFile('app.ts', extensionMap)).toBe(true);
  });

  it('returns false when no plugin supports the file extension', () => {
    const { extensionMap } = buildMaps([]);

    expect(supportsFile('app.ts', extensionMap)).toBe(false);
  });

  it('returns false for a file without extension', () => {
    const plugin = createMockPlugin({ supportedExtensions: ['.ts'] });
    const { extensionMap } = buildMaps([plugin]);

    expect(supportsFile('Makefile', extensionMap)).toBe(false);
  });
});

describe('getSupportedExtensions', () => {
  it('returns all registered extensions', () => {
    const plugin = createMockPlugin({ id: 'ts', supportedExtensions: ['.ts', '.tsx'] });
    const { extensionMap } = buildMaps([plugin]);

    const result = getSupportedExtensions(extensionMap);

    expect(result).toContain('.ts');
    expect(result).toContain('.tsx');
  });

  it('returns an empty array when no plugins are registered', () => {
    const { extensionMap } = buildMaps([]);

    expect(getSupportedExtensions(extensionMap)).toEqual([]);
  });
});

describe('analyzeFile', () => {
  it('delegates to the matching plugin detectConnections', async () => {
    const connections = [{ specifier: './utils', resolvedPath: '/src/utils.ts', type: 'static' as const }];
    const plugin = createMockPlugin({
      supportedExtensions: ['.ts'],
      detectConnections: vi.fn().mockResolvedValue(connections),
    });
    const { pluginsMap, extensionMap } = buildMaps([plugin]);

    const result = await analyzeFile('/src/app.ts', 'content', '/workspace', pluginsMap, extensionMap);

    expect(plugin.detectConnections).toHaveBeenCalledWith('/src/app.ts', 'content', '/workspace');
    expect(result).toEqual(connections);
  });

  it('returns an empty array when no plugin supports the file', async () => {
    const { pluginsMap, extensionMap } = buildMaps([]);

    const result = await analyzeFile('/src/styles.css', 'content', '/workspace', pluginsMap, extensionMap);

    expect(result).toEqual([]);
  });

  it('returns an empty array when the plugin throws an error', async () => {
    const plugin = createMockPlugin({
      supportedExtensions: ['.ts'],
      detectConnections: vi.fn().mockRejectedValue(new Error('Parse error')),
    });
    const { pluginsMap, extensionMap } = buildMaps([plugin]);

    const result = await analyzeFile('/src/app.ts', 'content', '/workspace', pluginsMap, extensionMap);

    expect(result).toEqual([]);
  });
});
