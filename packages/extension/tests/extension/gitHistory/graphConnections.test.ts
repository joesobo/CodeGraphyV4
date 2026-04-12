import { describe, expect, it } from 'vitest';
import type { IGraphEdge } from '../../../src/shared/graph/types';
import { appendGitHistoryAnalysisEdges } from '../../../src/extension/gitHistory/graphConnections';

describe('gitHistory/graphConnections', () => {
  it('skips unresolved relations and suppresses duplicate edges', () => {
    const edges: IGraphEdge[] = [{ id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }];
    const edgeSet = new Set(['src/a.ts->src/b.ts#import']);

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [
          { specifier: './missing', type: 'static', resolvedPath: null, kind: 'import', sourceId: 'import', fromFilePath: '/workspace/src/a.ts' },
          { specifier: './b', type: 'static', resolvedPath: '/workspace/src/b.ts', kind: 'import', sourceId: 'import', fromFilePath: '/workspace/src/a.ts' },
        ],
      },
      edgeSet,
      edges,
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([{ id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/b.ts#import']));
  });

  it('adds plain edges without source metadata when no plugin source is present', () => {
    const edges: IGraphEdge[] = [];
    const edgeSet = new Set<string>();

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [{ specifier: './b', type: 'static', resolvedPath: '/workspace/src/b.ts', kind: 'import', sourceId: 'import', fromFilePath: '/workspace/src/a.ts' }],
      },
      edgeSet,
      edges,
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([{ id: 'src/a.ts->src/b.ts#import', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }]);
  });

  it('adds source provenance when plugin metadata is available', () => {
    const edges: IGraphEdge[] = [];
    const edgeSet = new Set<string>();

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [{
          sourceId: 'import',
          specifier: './b',
          type: 'static',
          resolvedPath: '/workspace/src/b.ts',
          kind: 'import',
          fromFilePath: '/workspace/src/a.ts',
        }],
      },
      edgeSet,
      edges,
      plugin: { id: 'ts' },
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [
          {
            id: 'ts:import',
            pluginId: 'ts',
            sourceId: 'import',
            label: 'import',
          },
        ],
      },
    ]);
  });

  it('prefers connection provenance over the fallback plugin when both exist', () => {
    const edges: IGraphEdge[] = [];
    const edgeSet = new Set<string>();

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [{
          sourceId: 'import',
          specifier: './b',
          type: 'static',
          resolvedPath: '/workspace/src/b.ts',
          kind: 'import',
          pluginId: 'plugin.enricher',
          fromFilePath: '/workspace/src/a.ts',
        }],
      },
      edgeSet,
      edges,
      plugin: { id: 'plugin.base' },
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.enricher:import',
            pluginId: 'plugin.enricher',
            sourceId: 'import',
            label: 'import',
          },
        ],
      },
    ]);
  });
});
