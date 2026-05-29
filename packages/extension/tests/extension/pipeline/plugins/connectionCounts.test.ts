import { describe, expect, it } from 'vitest';
import type { IProjectedConnection } from '../../../../src/core/plugins/types/contracts';
import { countPluginConnections } from '../../../../src/extension/pipeline/plugins/connectionCounts';
import { createPluginInfo } from './testFactories';

describe('pipeline/plugins/connectionCounts', () => {
  it('counts only resolved connections owned by the plugin on supported file extensions', () => {
    const pluginInfo = createPluginInfo({
      id: 'plugin.typescript',
      supportedExtensions: ['.ts'],
    });
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [
        {
          specifier: './utils',
          resolvedPath: '/workspace/src/utils.ts',
          type: 'static',
          sourceId: 'import',
          kind: 'import',
          pluginId: 'plugin.typescript',
        },
        {
          specifier: './external',
          resolvedPath: null,
          type: 'static',
          sourceId: 'import',
          kind: 'import',
          pluginId: 'plugin.typescript',
        },
      ]],
      ['src/index.tsx', [
        {
          specifier: './component',
          resolvedPath: '/workspace/src/component.tsx',
          type: 'static',
          sourceId: 'import',
          kind: 'import',
          pluginId: 'plugin.typescript',
        },
      ]],
      ['README.md', [
        {
          specifier: './guide',
          resolvedPath: '/workspace/docs/guide.md',
          type: 'static',
          sourceId: 'markdown-link',
          kind: 'import',
          pluginId: 'plugin.typescript',
        },
      ]],
      ['src/owned.ts', [
        {
          specifier: './other-plugin',
          resolvedPath: '/workspace/src/other.ts',
          type: 'static',
          sourceId: 'import',
          kind: 'import',
          pluginId: 'plugin.other',
        },
      ]],
    ]);

    expect(countPluginConnections(pluginInfo, fileConnections)).toBe(1);
  });
});
