import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge } from '../../../../../src/shared/graph/contracts';
import {
  REVISION_DIFF_EDGE_KIND,
  withRevisionDiffEdges,
} from '../../../../../src/extension/graphView/timeline/provider/revisionEdges';

function node(id: string) {
  return { id, label: id, color: '#ffffff' };
}

function edge(
  id: string,
  from: string,
  to: string,
  kind: IGraphEdge['kind'] = 'import',
): IGraphEdge {
  return { id, from, to, kind, sources: [] };
}

describe('timeline revision diff edges', () => {
  it('adds one locally toggleable evidence edge for each added and removed relation', () => {
    const previous = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('stable', 'a', 'b'), edge('removed', 'b', 'c')],
    } satisfies IGraphData;
    const next = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('stable', 'a', 'b'), edge('added', 'a', 'c', 'call')],
    } satisfies IGraphData;

    const result = withRevisionDiffEdges(previous, next);

    expect(result.edges).toEqual([
      ...next.edges,
      expect.objectContaining({
        id: 'revision-diff:added:added',
        from: 'a',
        to: 'c',
        kind: REVISION_DIFF_EDGE_KIND,
        metadata: { revisionChange: 'added', originalKind: 'call' },
      }),
      expect.objectContaining({
        id: 'revision-diff:removed:removed',
        from: 'b',
        to: 'c',
        kind: REVISION_DIFF_EDGE_KIND,
        metadata: { revisionChange: 'removed', originalKind: 'import' },
      }),
    ]);
    expect(next.edges).toHaveLength(2);
  });

  it('replaces prior revision evidence and omits removed relations with missing endpoints', () => {
    const previous = {
      nodes: [node('a'), node('b')],
      edges: [
        edge('removed-with-node', 'a', 'b'),
        edge('revision-diff:added:old', 'a', 'b', REVISION_DIFF_EDGE_KIND),
      ],
    } satisfies IGraphData;
    const next = { nodes: [node('a')], edges: [] } satisfies IGraphData;

    expect(withRevisionDiffEdges(previous, next)).toEqual(next);
  });
});
