import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge } from '../../../../src/shared/graph/contracts';
import {
  applyEdgeTypeDefaultColors,
  filterSemanticEdges,
  filterVisibleEdgeDecorations,
  filterVisibleStructuralEdges,
} from '../../../../src/webview/graphControls/filtering/edges';

function edge(id: string, from: string, to: string, kind: IGraphEdge['kind'], color?: string): IGraphEdge {
  return {
    id,
    from,
    to,
    kind,
    sources: [],
    ...(color ? { color } : {}),
  };
}

const edges: IGraphData['edges'] = [
  edge('a->b#import', 'a.ts', 'b.ts', 'import'),
  edge('b->c#reference', 'b.ts', 'c.ts', 'reference'),
  edge('c->a#type-import', 'c.ts', 'a.ts', 'type-import'),
  edge('a->folder#nests', 'a.ts', 'src', 'nests'),
];

describe('webview/graphControls/filtering edges', () => {
  it('filters semantic edges by edge visibility and visible endpoints', () => {
    expect(filterSemanticEdges(edges, new Set(['a.ts', 'b.ts']), {
      reference: true,
      'type-import': false,
    })).toEqual([
      edge('a->b#import', 'a.ts', 'b.ts', 'import'),
    ]);
  });

  it('hides plugin-scoped edge kinds unless explicitly enabled', () => {
    const pluginEdges = [edge('a->b#signal', 'a.ts', 'b.ts', 'codegraphy.gdscript:signal-connection')];
    expect(filterSemanticEdges(pluginEdges, new Set(['a.ts', 'b.ts']), {})).toEqual([]);
    expect(filterSemanticEdges(pluginEdges, new Set(['a.ts', 'b.ts']), {
      'codegraphy.gdscript:signal-connection': true,
    })).toEqual(pluginEdges);
  });

  it('hides otherwise visible semantic edges when their edge type is disabled', () => {
    expect(filterSemanticEdges(edges, new Set(['a.ts', 'b.ts']), {
      import: false,
    })).toEqual([]);
  });

  it('keeps visible structural edges regardless of edge visibility settings', () => {
    expect(filterVisibleStructuralEdges(edges, new Set(['a.ts', 'src']))).toEqual([
      edge('a->folder#nests', 'a.ts', 'src', 'nests'),
    ]);
  });

  it('applies default colors only when an edge has no explicit color', () => {
    expect(applyEdgeTypeDefaultColors([
      edge('a->b#import', 'a.ts', 'b.ts', 'import'),
      edge('b->c#reference', 'b.ts', 'c.ts', 'reference', '#custom'),
      edge('c->a#type-import', 'c.ts', 'a.ts', 'type-import'),
    ], [
      { id: 'import', label: 'Import', defaultColor: '#import', defaultVisible: true },
      { id: 'reference', label: 'Reference', defaultColor: '#reference', defaultVisible: true },
    ])).toEqual([
      edge('a->b#import', 'a.ts', 'b.ts', 'import', '#import'),
      edge('b->c#reference', 'b.ts', 'c.ts', 'reference', '#custom'),
      edge('c->a#type-import', 'c.ts', 'a.ts', 'type-import'),
    ]);
  });

  it('keeps only decorations for visible edges', () => {
    expect(filterVisibleEdgeDecorations([
      edge('a->b#import', 'a.ts', 'b.ts', 'import'),
    ], {
      'a->b#import': { color: '#import' },
      'b->c#reference': { color: '#reference' },
    })).toEqual({
      'a->b#import': { color: '#import' },
    });
  });

  it('returns an empty decoration map when no decorations exist', () => {
    expect(filterVisibleEdgeDecorations(edges)).toEqual({});
  });
});
