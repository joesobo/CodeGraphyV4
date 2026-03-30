import { describe, expect, it } from 'vitest';
import { appendGitHistoryConnectionEdges } from '../../../src/extension/gitHistory/graphConnections';

describe('gitHistory/graphConnections', () => {
  it('skips connections without resolved paths and suppresses duplicate edges', () => {
    const edges = [{ id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' }];
    const edgeSet = new Set(['src/a.ts->src/b.ts']);

    appendGitHistoryConnectionEdges({
      connections: [
        { specifier: './missing', type: 'static', resolvedPath: null },
        { specifier: './b', type: 'static', resolvedPath: '/workspace/src/b.ts' },
      ],
      edgeSet,
      edges,
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([{ id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' }]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/b.ts']));
  });

  it('adds plain edges without rule metadata when no plugin rule is present', () => {
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string; ruleIds?: string[] }> = [];
    const edgeSet = new Set<string>();

    appendGitHistoryConnectionEdges({
      connections: [{ specifier: './b', type: 'static', resolvedPath: '/workspace/src/b.ts' }],
      edgeSet,
      edges,
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([{ id: 'src/a.ts->src/b.ts', from: 'src/a.ts', to: 'src/b.ts' }]);
  });

  it('adds rule metadata and plugin-qualified rule ids when available', () => {
    const edges: Array<{ id: string; from: string; to: string; ruleId?: string; ruleIds?: string[] }> = [];
    const edgeSet = new Set<string>();

    appendGitHistoryConnectionEdges({
      connections: [{
        ruleId: 'import',
        specifier: './b',
        type: 'static',
        resolvedPath: '/workspace/src/b.ts',
      }],
      edgeSet,
      edges,
      plugin: { id: 'ts' },
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts',
        from: 'src/a.ts',
        to: 'src/b.ts',
        ruleId: 'import',
        ruleIds: ['ts:import'],
      },
    ]);
  });
});
