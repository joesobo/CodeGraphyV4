import { describe, expect, it } from 'vitest';
import type { IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { projectCollapsedEdges } from '../../src/visibleGraph/collapseEdges';

function node(id: string): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
  };
}

function edge(
  from: string,
  to: string,
  sources: IGraphEdge['sources'] = [],
  color?: string,
): IGraphEdge {
  return {
    id: `${from}->${to}#import`,
    from,
    to,
    kind: 'import',
    sources,
    ...(color ? { color } : {}),
  };
}

describe('visibleGraph/collapseEdges', () => {
  it('drops projected edges with missing or self endpoints', () => {
    expect(projectCollapsedEdges(
      [
        edge('hidden/a.ts', 'hidden/b.ts'),
        edge('missing.ts', 'outside.ts'),
      ],
      [node('src'), node('outside.ts')],
      new Map([
        ['hidden/a.ts', 'src'],
        ['hidden/b.ts', 'src'],
      ]),
    )).toEqual([]);
  });

  it('merges duplicate projected edges without duplicating sources and preserves fallback color', () => {
    expect(projectCollapsedEdges(
      [
        edge('hidden/a.ts', 'outside.ts', [
          { id: 'source:a', pluginId: 'plugin', sourceId: 'a', label: 'A' },
        ]),
        edge('hidden/b.ts', 'outside.ts', [
          { id: 'source:a', pluginId: 'plugin', sourceId: 'a', label: 'A' },
          { id: 'source:b', pluginId: 'plugin', sourceId: 'b', label: 'B' },
        ], '#ff0000'),
      ],
      [node('src'), node('outside.ts')],
      new Map([
        ['hidden/a.ts', 'src'],
        ['hidden/b.ts', 'src'],
      ]),
    )).toEqual([
      {
        id: 'src->outside.ts#import',
        from: 'src',
        to: 'outside.ts',
        kind: 'import',
        color: '#ff0000',
        sources: [
          { id: 'source:a', pluginId: 'plugin', sourceId: 'a', label: 'A' },
          { id: 'source:b', pluginId: 'plugin', sourceId: 'b', label: 'B' },
        ],
      },
    ]);
  });
});
