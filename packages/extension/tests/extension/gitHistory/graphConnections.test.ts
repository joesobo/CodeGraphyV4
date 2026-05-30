import { describe, expect, it } from 'vitest';
import type { IAnalysisRelationshipEvidence } from '../../../src/core/plugins/types/contracts';
import type { IGraphEdge } from '../../../src/shared/graph/contracts';
import { appendGitHistoryAnalysisEdges } from '../../../src/extension/gitHistory/graphConnections';

function importRelation(
  path: string | null,
  pluginId?: string,
): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'import',
    pluginId,
    sourceId: 'import',
    specifier: path ? './b' : './missing',
    timing: 'static',
    from: { kind: 'file', filePath: '/workspace/src/a.ts' },
    target: path
      ? { kind: 'file', path, pathKind: 'absolute', specifier: './b' }
      : { kind: 'unresolved', specifier: './missing' },
  };
}

describe('gitHistory/graphConnections', () => {
  it('skips unresolved relations and suppresses duplicate edges', () => {
    const edges: IGraphEdge[] = [{ id: 'src/a.ts->src/b.ts#import:static', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }];
    const edgeSet = new Set(['src/a.ts->src/b.ts#import:static']);

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [
          importRelation(null),
          importRelation('/workspace/src/b.ts'),
        ],
      },
      edgeSet,
      edges,
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([{ id: 'src/a.ts->src/b.ts#import:static', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }]);
    expect(edgeSet).toEqual(new Set(['src/a.ts->src/b.ts#import:static']));
  });

  it('adds plain edges without source metadata when no plugin source is present', () => {
    const edges: IGraphEdge[] = [];
    const edgeSet = new Set<string>();

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [importRelation('/workspace/src/b.ts')],
      },
      edgeSet,
      edges,
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([{ id: 'src/a.ts->src/b.ts#import:static', from: 'src/a.ts', to: 'src/b.ts' , kind: 'import', sources: [] }]);
  });

  it('adds source provenance when plugin metadata is available', () => {
    const edges: IGraphEdge[] = [];
    const edgeSet = new Set<string>();

    appendGitHistoryAnalysisEdges({
      analysis: {
        relations: [importRelation('/workspace/src/b.ts')],
      },
      edgeSet,
      edges,
      plugin: { id: 'ts' },
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import:static',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [
          {
            id: 'ts:import',
            pluginId: 'ts',
            sourceId: 'import',
            label: 'import',
            metadata: undefined,
            variant: undefined,
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
        relations: [importRelation('/workspace/src/b.ts', 'plugin.enricher')],
      },
      edgeSet,
      edges,
      plugin: { id: 'plugin.base' },
      sourcePath: 'src/a.ts',
      workspaceRoot: '/workspace',
    });

    expect(edges).toEqual([
      {
        id: 'src/a.ts->src/b.ts#import:static',
        from: 'src/a.ts',
        to: 'src/b.ts',
        kind: 'import',
        sources: [
          {
            id: 'plugin.enricher:import',
            pluginId: 'plugin.enricher',
            sourceId: 'import',
            label: 'import',
            metadata: undefined,
            variant: undefined,
          },
        ],
      },
    ]);
  });
});
