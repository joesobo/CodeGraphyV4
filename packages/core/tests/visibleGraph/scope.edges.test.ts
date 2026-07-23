import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import type { VisibleGraphScopeConfig } from '../../src/visibleGraph/contracts';
import { applyGraphScope } from '../../src/visibleGraph/scope';

function node(id: string, nodeType?: IGraphNode['nodeType'], symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label: id,
    ...(nodeType ? { nodeType } : {}),
    ...(symbol ? { symbol } : {}),
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources: [],
  };
}


function symbol(overrides: Partial<NonNullable<IGraphNode['symbol']>>): NonNullable<IGraphNode['symbol']> {
  return {
    id: 'src/app.ts:symbol:App',
    name: 'App',
    kind: 'class',
    filePath: 'src/app.ts',
    ...overrides,
  };
}






describe('visibleGraph/scope', () => {

  it('omits hidden symbol self-relations but keeps explicit file self-relations', () => {
    const fileNode = node('src/app.py', 'file');
    const functionNode = node('src/app.py#main:function', 'symbol:function', symbol({
      id: 'src/app.py:function:main',
      filePath: 'src/app.py',
      kind: 'function',
      name: 'main',
    }));
    const fileOnlyScope: VisibleGraphScopeConfig = {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol:function', enabled: false },
      ],
      edges: [{ type: 'call', enabled: true }],
    };

    const hiddenSymbolResult = applyGraphScope({
      nodes: [fileNode, functionNode],
      edges: [edge(functionNode.id, functionNode.id, 'call')],
    }, fileOnlyScope);
    expect(hiddenSymbolResult).toEqual({ nodes: [fileNode], edges: [] });

    expect(applyGraphScope({
      nodes: [fileNode, functionNode],
      edges: [edge(fileNode.id, fileNode.id, 'call')],
    }, fileOnlyScope)).toEqual({
      nodes: [fileNode],
      edges: [edge(fileNode.id, fileNode.id, 'call')],
    });
  });

  it('keeps file-level type imports when imported type symbols are visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/alias/themePack.ts'),
        node('src/types.ts'),
        node('src/types.ts#PaletteMood:type', 'symbol', symbol({
          id: 'src/types.ts:type:PaletteMood',
          filePath: 'src/types.ts',
          kind: 'type',
          name: 'PaletteMood',
        })),
      ],
      edges: [
        edge('src/alias/themePack.ts', 'src/types.ts', 'type-import'),
        edge('src/alias/themePack.ts', 'src/types.ts#PaletteMood:type', 'type-import'),
        edge('src/types.ts', 'src/types.ts#PaletteMood:type', 'contains'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:type', enabled: true },
      ],
      edges: [
        { type: 'type-import', enabled: true },
        { type: 'contains', enabled: true },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/alias/themePack.ts', 'src/types.ts', 'type-import'),
        edge('src/types.ts', 'src/types.ts#PaletteMood:type', 'contains'),
      ],
    });
  });

  it('keeps one visible edge for repeated edges with the same identity', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.py#process_data:function', 'symbol', symbol({
          id: 'src/app.py:function:process_data',
          filePath: 'src/app.py',
          kind: 'function',
          name: 'process_data',
        })),
        node('src/format.py#format_output:function', 'symbol', symbol({
          id: 'src/format.py:function:format_output',
          filePath: 'src/format.py',
          kind: 'function',
          name: 'format_output',
        })),
      ],
      edges: [
        edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
        edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'symbol', enabled: true },
        { type: 'symbol:function', enabled: true },
      ],
      edges: [
        { type: 'call', enabled: true },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/app.py#process_data:function', 'src/format.py#format_output:function', 'call'),
      ],
    });
  });
});
