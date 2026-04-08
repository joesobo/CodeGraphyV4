import { describe, it, expect, vi } from 'vitest';
import {
  getPluginForFile,
  getPluginsForExtension,
  supportsFile,
  getSupportedExtensions,
  analyzeFile,
  analyzeFileResult,
} from '../../../src/core/plugins/routing/router';
import type { IPlugin } from '../../../src/core/plugins/types/contracts';

function makePlugin(id: string, extensions: string[]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: extensions,
    detectConnections: vi.fn().mockResolvedValue([]),
  };
}

function buildMaps(
  plugins: IPlugin[],
): {
  pluginsMap: Map<string, { plugin: IPlugin }>;
  extensionMap: Map<string, string[]>;
} {
  const pluginsMap = new Map<string, { plugin: IPlugin }>();
  const extensionMap = new Map<string, string[]>();

  for (const plugin of plugins) {
    pluginsMap.set(plugin.id, { plugin });
    for (const ext of plugin.supportedExtensions) {
      const normalized = ext.startsWith('.') ? ext : `.${ext}`;
      const ids = extensionMap.get(normalized) ?? [];
      ids.push(plugin.id);
      extensionMap.set(normalized, ids);
    }
  }

  return { pluginsMap, extensionMap };
}

describe('plugin routing', () => {
  describe('getPluginForFile', () => {
    it('returns the plugin whose extension matches the file', () => {
      const ts = makePlugin('ts-plugin', ['.ts']);
      const { pluginsMap, extensionMap } = buildMaps([ts]);

      const result = getPluginForFile('src/app.ts', pluginsMap, extensionMap);

      expect(result).toBe(ts);
    });

    it('returns undefined when no plugin supports the extension', () => {
      const { pluginsMap, extensionMap } = buildMaps([]);

      const result = getPluginForFile('src/app.ts', pluginsMap, extensionMap);

      expect(result).toBeUndefined();
    });

    it('returns the first registered plugin when multiple support the same extension', () => {
      const first = makePlugin('first', ['.ts']);
      const second = makePlugin('second', ['.ts']);
      const { pluginsMap, extensionMap } = buildMaps([first, second]);

      const result = getPluginForFile('src/app.ts', pluginsMap, extensionMap);

      expect(result).toBe(first);
    });
  });

  describe('getPluginsForExtension', () => {
    it('returns all plugins for a given extension', () => {
      const ts = makePlugin('ts-plugin', ['.ts']);
      const { pluginsMap, extensionMap } = buildMaps([ts]);

      const result = getPluginsForExtension('.ts', pluginsMap, extensionMap);

      expect(result).toEqual([ts]);
    });

    it('returns empty array when no plugins support the extension', () => {
      const { pluginsMap, extensionMap } = buildMaps([]);

      const result = getPluginsForExtension('.ts', pluginsMap, extensionMap);

      expect(result).toEqual([]);
    });

    it('normalizes extension without leading dot', () => {
      const ts = makePlugin('ts-plugin', ['.ts']);
      const { pluginsMap, extensionMap } = buildMaps([ts]);

      const result = getPluginsForExtension('ts', pluginsMap, extensionMap);

      expect(result).toEqual([ts]);
    });
  });

  describe('supportsFile', () => {
    it('returns true when the extension is registered', () => {
      const ts = makePlugin('ts-plugin', ['.ts']);
      const { extensionMap } = buildMaps([ts]);

      expect(supportsFile('src/app.ts', extensionMap)).toBe(true);
    });

    it('returns false when no plugin supports the extension', () => {
      const { extensionMap } = buildMaps([]);

      expect(supportsFile('src/app.ts', extensionMap)).toBe(false);
    });
  });

  describe('getSupportedExtensions', () => {
    it('returns all registered extensions', () => {
      const ts = makePlugin('ts-plugin', ['.ts', '.tsx']);
      const { extensionMap } = buildMaps([ts]);

      const result = getSupportedExtensions(extensionMap);

      expect(result).toContain('.ts');
      expect(result).toContain('.tsx');
    });

    it('returns empty array when no plugins are registered', () => {
      const { extensionMap } = buildMaps([]);

      expect(getSupportedExtensions(extensionMap)).toEqual([]);
    });
  });

  describe('analyzeFile', () => {
    it('delegates to the matching plugin and returns connections', async () => {
      const connections = [{
        kind: 'import',
        sourceId: 'ts:import',
        specifier: './b',
        resolvedPath: '/ws/src/b.ts',
      }];
      const ts = makePlugin('ts-plugin', ['.ts']);
      (ts.detectConnections as ReturnType<typeof vi.fn>).mockResolvedValue(connections);
      const { pluginsMap, extensionMap } = buildMaps([ts]);

      const result = await analyzeFile('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

      expect(result).toEqual([
        {
          kind: 'import',
          sourceId: 'ts:import',
          specifier: './b',
          resolvedPath: '/ws/src/b.ts',
          type: undefined,
          variant: undefined,
          metadata: undefined,
        },
      ]);
    });

    it('returns empty array when no plugin supports the file', async () => {
      const { pluginsMap, extensionMap } = buildMaps([]);

      const result = await analyzeFile('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

      expect(result).toEqual([]);
    });

    it('returns empty array and logs when the plugin throws', async () => {
      const ts = makePlugin('ts-plugin', ['.ts']);
      (ts.detectConnections as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
      const { pluginsMap, extensionMap } = buildMaps([ts]);

      const result = await analyzeFile('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

      expect(result).toEqual([]);
    });

    it('merges matching plugins bottom-to-top so earlier plugins in the list win conflicts', async () => {
      const highPriority = makePlugin('high-priority', ['.ts']);
      highPriority.analyzeFile = vi.fn().mockResolvedValue({
        filePath: 'src/app.ts',
        relations: [{
          kind: 'import',
          sourceId: 'shared:import',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/high.ts',
          specifier: './high',
        }],
      });

      const lowPriority = makePlugin('low-priority', ['.ts']);
      lowPriority.analyzeFile = vi.fn().mockResolvedValue({
        filePath: 'src/app.ts',
        relations: [{
          kind: 'import',
          sourceId: 'shared:import',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/low.ts',
          specifier: './high',
        }],
      });

      const { pluginsMap, extensionMap } = buildMaps([highPriority, lowPriority]);

      const result = await analyzeFileResult('src/app.ts', 'content', '/ws', pluginsMap, extensionMap);

      expect(
        (lowPriority.analyzeFile as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
      ).toBeLessThan(
        (highPriority.analyzeFile as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
      );
      expect(result?.relations).toEqual([{
        kind: 'import',
        sourceId: 'shared:import',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/high.ts',
        specifier: './high',
      }]);
    });
  });
});
