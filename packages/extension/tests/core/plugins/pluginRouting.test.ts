import { describe, expect, it, vi } from 'vitest';
import {
  getPluginForFile,
  getPluginsForExtension
} from '../../../src/core/plugins/routing/router/lookups';
import type { IPlugin } from '../../../src/core/plugins/types/contracts';

function makePlugin(id: string, extensions: string[]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: extensions,
    analyzeFile: vi.fn(async (filePath: string) => ({
      filePath,
      relations: [],
    })),
  } as IPlugin;
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
});
