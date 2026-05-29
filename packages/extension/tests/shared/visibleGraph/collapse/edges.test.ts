import { describe, expect, it } from 'vitest';
import type {
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
} from '../../../../src/shared/graph/contracts';
import {
  mergeEdgeSources,
  mergeProjectedEdge,
  projectCollapsedEdges,
  resolveProjectedEndpoint,
} from '../../../../src/shared/visibleGraph/collapse/edges';

function node(id: string): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
  };
}

function source(id: string): IGraphEdgeSource {
  return {
    id,
    pluginId: 'plugin',
    sourceId: id,
    label: id,
  };
}

function edge(
  from: string,
  to: string,
  kind: IGraphEdge['kind'],
  sources: IGraphEdgeSource[],
  color?: string,
): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    color,
    sources,
  };
}

describe('shared/visibleGraph/collapse/edges', () => {
  it('resolves visible node ids and hidden node owners', () => {
    const visibleNodeIds = new Set(['src', 'outside.ts']);
    const hiddenByNodeId = new Map([['src/app.ts', 'src']]);

    expect(resolveProjectedEndpoint('outside.ts', visibleNodeIds, hiddenByNodeId)).toBe('outside.ts');
    expect(resolveProjectedEndpoint('src/app.ts', visibleNodeIds, hiddenByNodeId)).toBe('src');
    expect(resolveProjectedEndpoint('missing.ts', visibleNodeIds, hiddenByNodeId)).toBeUndefined();
  });

  it('merges edge sources without duplicating source ids', () => {
    const first = source('first');
    const second = source('second');

    expect(mergeEdgeSources([first], [first, second])).toEqual([first, second]);
  });

  it('preserves an existing projected edge color while merging sources', () => {
    const edges = new Map<string, IGraphEdge>();

    mergeProjectedEdge(edges, edge('src', 'outside.ts', 'import', [source('first')], '#111111'));
    mergeProjectedEdge(edges, edge('src', 'outside.ts', 'import', [source('second')], '#222222'));

    expect(edges.get('src->outside.ts#import')).toMatchObject({
      color: '#111111',
      sources: [source('first'), source('second')],
    });
  });

  it('fills a missing projected edge color from a later duplicate', () => {
    const edges = new Map<string, IGraphEdge>();

    mergeProjectedEdge(edges, edge('src', 'outside.ts', 'import', [source('first')]));
    mergeProjectedEdge(edges, edge('src', 'outside.ts', 'import', [source('second')], '#222222'));

    expect(edges.get('src->outside.ts#import')?.color).toBe('#222222');
  });

  it('projects hidden endpoints through their collapsed owner and skips self loops', () => {
    const nodes = [node('src'), node('outside.ts')];
    const hiddenByNodeId = new Map([
      ['src/app.ts', 'src'],
      ['src/lib.ts', 'src'],
    ]);

    const result = projectCollapsedEdges([
      edge('src/app.ts', 'outside.ts', 'import', [source('import-a')]),
      edge('src/lib.ts', 'outside.ts', 'import', [source('import-b')]),
      edge('outside.ts', 'src/app.ts', 'reference', [source('reference')]),
      edge('src/app.ts', 'src/lib.ts', 'import', [source('self-loop')]),
      edge('outside.ts', 'missing.ts', 'import', [source('missing')]),
    ], nodes, hiddenByNodeId);

    expect(result.map((item) => ({
      id: item.id,
      from: item.from,
      to: item.to,
      sources: item.sources.map((itemSource) => itemSource.id),
    }))).toEqual([
      {
        id: 'src->outside.ts#import',
        from: 'src',
        to: 'outside.ts',
        sources: ['import-a', 'import-b'],
      },
      {
        id: 'outside.ts->src#reference',
        from: 'outside.ts',
        to: 'src',
        sources: ['reference'],
      },
    ]);
  });
});
