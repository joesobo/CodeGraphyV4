import { describe, expect, it } from 'vitest';
import type { IPlugin } from '../../../../src/core/plugins/types/contracts';
import {
  getPluginForFile,
  getPluginsForExtension,
  getSupportedExtensions,
  supportsFile,
} from '../../../../src/core/plugins/routing/router/lookups';

function makePlugin(id: string, extensions: string[]): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: extensions,
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
      const normalized = ext === '*' || ext.startsWith('.') ? ext : `.${ext}`;
      const ids = extensionMap.get(normalized) ?? [];
      ids.push(plugin.id);
      extensionMap.set(normalized, ids);
    }
  }

  return { pluginsMap, extensionMap };
}

describe('routing/lookups', () => {
  it('falls back to wildcard plugins for file routing and extension lookups', () => {
    const wildcard = makePlugin('wildcard', ['*']);
    const typed = makePlugin('typed', ['.ts']);
    const { pluginsMap, extensionMap } = buildMaps([typed, wildcard]);

    expect(getPluginForFile('README.md', pluginsMap, extensionMap)).toBe(wildcard);
    expect(getPluginsForExtension('.md', pluginsMap, extensionMap)).toEqual([wildcard]);
  });

  it('reports wildcard support and keeps wildcard in supported extensions', () => {
    const wildcard = makePlugin('wildcard', ['*']);
    const { extensionMap } = buildMaps([wildcard]);

    expect(supportsFile('notes/todo.txt', extensionMap)).toBe(true);
    expect(getSupportedExtensions(extensionMap)).toEqual(['*']);
  });
});
