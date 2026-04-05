import { describe, expect, it, vi } from 'vitest';
import type { IConnection, IPlugin } from '../../../../src/core/plugins/types/contracts';
import { buildWorkspaceGraphEdges } from '../../../../src/extension/workspaceAnalyzer/graph/edges';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    sources: [
      { id: 'import', name: 'Import', description: 'Import relation' },
      { id: 'reexport', name: 'Re-export', description: 'Re-export relation' },
    ],
    detectConnections: vi.fn(async () => []),
  };
}

function createOptions(
  overrides: Partial<Parameters<typeof buildWorkspaceGraphEdges>[0]> = {},
): Parameters<typeof buildWorkspaceGraphEdges>[0] {
  return {
    disabledPlugins: new Set<string>(),
    disabledSources: new Set<string>(),
    fileConnections: new Map<string, IConnection[]>([
      ['src/index.ts', []],
      ['src/utils.ts', []],
    ]),
    getPluginForFile: () => createPlugin('plugin.typescript'),
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('workspaceAnalyzer/graph/edges', () => {
  it('merges same-direction edges by kind and accumulates contributing sources', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reexport', sourceId: 'reexport' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reexport', sourceId: 'reexport' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect([...result.nodeIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect([...result.connectedIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(result.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:import',
            pluginId: 'plugin.typescript',
            sourceId: 'import',
            label: 'Import',
          },
        ],
      },
      {
        id: 'src/index.ts->src/utils.ts#reexport',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'reexport',
        sources: [
          {
            id: 'plugin.typescript:reexport',
            pluginId: 'plugin.typescript',
            sourceId: 'reexport',
            label: 'Re-export',
          },
        ],
      },
    ]);
  });

  it('skips edges from disabled plugins', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      disabledPlugins: new Set<string>(['plugin.typescript']),
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([]);
    expect([...result.nodeIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect([...result.connectedIds]).toEqual([]);
  });

  it('skips edges from disabled qualified sources', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      disabledSources: new Set<string>(['plugin.typescript:import']),
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([]);
  });

  it('skips edges without resolved targets', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: null, kind: 'import', sourceId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([]);
  });

  it('skips edges whose resolved target is not a discovered file', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', sourceId: 'import' },
        ]],
      ]),
    }));

    expect(result.edges).toEqual([]);
  });
});
