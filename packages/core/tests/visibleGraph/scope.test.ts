import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../src/graph/contracts';
import { applyGraphScope } from '../../src/visibleGraph/scope';

function node(id: string, nodeType?: IGraphNode['nodeType'], symbol?: IGraphNode['symbol']): IGraphNode {
  return {
    id,
    label: id,
    color: '#111111',
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

describe('visibleGraph/scope', () => {
  it('filters disabled node, symbol, and edge types together', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/generated.ts', undefined, {
          id: 'src/generated.ts:function:generate',
          name: 'generate',
          kind: 'function',
          filePath: 'src/generated.ts',
        }),
        node('src', 'folder'),
        node('src/consumer.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/consumer.ts', 'import'),
        edge('src/app.ts', 'src/generated.ts', 'reference'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'folder', enabled: false },
        { type: 'symbol:function', enabled: false },
      ],
      edges: [
        { type: 'reference', enabled: false },
      ],
    })).toEqual({
      nodes: [
        node('src/app.ts'),
        node('src/consumer.ts'),
      ],
      edges: [
        edge('src/app.ts', 'src/consumer.ts', 'import'),
      ],
    });
  });
});
