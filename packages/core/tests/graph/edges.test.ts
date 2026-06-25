import { describe, expect, it, vi } from 'vitest';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { IProjectedConnection } from '../../src/analysis/projectedConnection';
import {
  createGraphEdgeId,
  getGraphEdgeIdSuffix,
  replaceGraphEdgeIdEndpoints,
} from '../../src/graph/edgeIdentity';
import { buildWorkspaceGraphEdges } from '../../src/graph/edges';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    sources: [
      { id: 'import', name: 'Import', description: 'Import relation' },
      { id: 'dynamic-import', name: 'Dynamic Import', description: 'Dynamic import relation' },
    ],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

function createOptions(
  overrides: Partial<Parameters<typeof buildWorkspaceGraphEdges>[0]> = {},
): Parameters<typeof buildWorkspaceGraphEdges>[0] {
  return {
    disabledPlugins: new Set<string>(),
    fileConnections: new Map<string, IProjectedConnection[]>([
      ['src/index.ts', []],
      ['src/utils.ts', []],
    ]),
    getPluginForFile: () => createPlugin('plugin.typescript'),
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('core/graph/edges', () => {
  it('merges same-direction edges by kind and accumulates contributing sources', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
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
          {
            id: 'plugin.typescript:dynamic-import',
            pluginId: 'plugin.typescript',
            sourceId: 'dynamic-import',
            label: 'Dynamic Import',
          },
        ],
      },
    ]);
  });

  it('skips edges from disabled plugins', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      disabledPlugins: new Set<string>(['plugin.typescript']),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([]);
    expect([...result.nodeIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect([...result.connectedIds]).toEqual([]);
  });

  it('keeps edges even when source ids would previously have been disabled', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [],
      },
    ]);
  });

  it('reuses resolved target ids for repeated resolved paths', () => {
    const resolveTarget = vi.fn(() => 'src/utils.ts');
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reference', sourceId: 'reference' },
        ]],
        ['src/utils.ts', []],
      ]),
      getConnectionTargetId: resolveTarget,
    }));

    expect(resolveTarget).toHaveBeenCalledOnce();
    expect(result.edges.map(edge => edge.to)).toEqual(['src/utils.ts', 'src/utils.ts']);
  });

  it('filters only the disabled plugin provenance when multiple plugins contribute to one file', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      disabledPlugins: new Set<string>(['plugin.markdown']),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          {
            specifier: './utils',
            resolvedPath: '/workspace/src/utils.ts',
            kind: 'import',
            pluginId: 'plugin.typescript',
            sourceId: 'import',
          },
          {
            specifier: './docs',
            resolvedPath: '/workspace/src/docs.ts',
            kind: 'reference',
            pluginId: 'plugin.markdown',
            sourceId: 'wikilink',
          },
        ]],
        ['src/utils.ts', []],
        ['src/docs.ts', []],
      ]),
    }));

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
    ]);
  });

  it('skips edges without resolved targets', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
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
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', sourceId: 'import' },
        ]],
      ]),
    }));

    expect(result.edges).toEqual([]);
  });

  it('creates edges without sources when the connection plugin is unavailable', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
      getPluginForFile: () => undefined,
    }));

    expect(result.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [],
      },
    ]);
  });

  it('appends distinct sources for the same edge kind but ignores duplicate source ids', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

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
          {
            id: 'plugin.typescript:dynamic-import',
            pluginId: 'plugin.typescript',
            sourceId: 'dynamic-import',
            label: 'Dynamic Import',
          },
        ],
      },
    ]);
  });

  it('keeps same-kind edges separate when their relation types differ', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', type: 'static', pluginId: 'plugin.typescript', sourceId: 'import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', type: 'dynamic', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts#import:static',
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
        id: 'src/index.ts->src/utils.ts#import:dynamic',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.typescript:dynamic-import',
            pluginId: 'plugin.typescript',
            sourceId: 'dynamic-import',
            label: 'Dynamic Import',
          },
        ],
      },
    ]);
  });

  it('creates edge ids with optional type and variant suffixes', () => {
    expect(createGraphEdgeId({ from: 'a.ts', to: 'b.ts', kind: 'import' })).toBe('a.ts->b.ts#import');
    expect(createGraphEdgeId({
      from: 'a.ts',
      to: 'b.ts',
      kind: 'reference',
      type: 'value',
      variant: 'dynamic',
    })).toBe('a.ts->b.ts#reference:value~dynamic');
  });

  it('reads and preserves edge id suffixes when endpoints change', () => {
    expect(getGraphEdgeIdSuffix('a.ts->b.ts#import:value~dynamic', 'import')).toBe('#import:value~dynamic');
    expect(getGraphEdgeIdSuffix('legacy-edge-id', 'reference')).toBe('#reference');
    expect(replaceGraphEdgeIdEndpoints(
      { id: 'a.ts->b.ts#import:value~dynamic', kind: 'import' },
      'src/new-a.ts',
      'src/new-b.ts',
    )).toBe('src/new-a.ts->src/new-b.ts#import:value~dynamic');
  });
});
