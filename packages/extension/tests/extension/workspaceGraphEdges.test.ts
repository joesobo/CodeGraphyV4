import { describe, expect, it, vi } from 'vitest';
import type { IConnection, IPlugin } from '../../src/core/plugins';
import { buildWorkspaceGraphEdges } from '../../src/extension/workspaceGraphEdges';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn(async () => []),
  };
}

function createOptions(
  overrides: Partial<Parameters<typeof buildWorkspaceGraphEdges>[0]> = {},
): Parameters<typeof buildWorkspaceGraphEdges>[0] {
  return {
    disabledPlugins: new Set<string>(),
    disabledRules: new Set<string>(),
    fileConnections: new Map<string, IConnection[]>([
      ['src/index.ts', []],
      ['src/utils.ts', []],
    ]),
    getPluginForFile: () => createPlugin('plugin.typescript'),
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('workspaceGraphEdges', () => {
  it('deduplicates repeated edges and accumulates distinct qualified rule ids', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'reexport' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'reexport' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect([...result.nodeIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect([...result.connectedIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(result.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        ruleIds: [
          'plugin.typescript:import',
          'plugin.typescript:reexport',
        ],
      },
    ]);
  });

  it('skips edges from disabled plugins', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      disabledPlugins: new Set<string>(['plugin.typescript']),
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'import' },
        ]],
        ['src/utils.ts', []],
      ]),
    }));

    expect(result.edges).toEqual([]);
    expect([...result.nodeIds]).toEqual(['src/index.ts', 'src/utils.ts']);
    expect([...result.connectedIds]).toEqual([]);
  });

  it('skips edges from disabled qualified rules', () => {
    const result = buildWorkspaceGraphEdges(createOptions({
      disabledRules: new Set<string>(['plugin.typescript:import']),
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'import' },
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
          { specifier: './utils', resolvedPath: null, type: 'static' },
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
          { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', type: 'static' },
        ]],
      ]),
    }));

    expect(result.edges).toEqual([]);
  });
});
