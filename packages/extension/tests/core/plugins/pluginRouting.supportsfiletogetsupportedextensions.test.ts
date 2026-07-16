import { describe, expect, it, vi } from 'vitest';
import {
  getSupportedExtensions,
  supportsFile
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
});
