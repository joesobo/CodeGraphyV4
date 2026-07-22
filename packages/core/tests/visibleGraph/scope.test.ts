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

  it('keeps symbol nodes that are disconnected after edge type filtering', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.cpp'),
        node('src/widget.hpp'),
        node('src/app.cpp#Runner:class', 'symbol', symbol({
          id: 'src/app.cpp:class:Runner',
          kind: 'class',
          name: 'Runner',
        })),
      ],
      edges: [
        edge('src/app.cpp', 'src/widget.hpp', 'import'),
        edge('src/app.cpp', 'src/app.cpp#Runner:class', 'contains'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:class', enabled: true },
      ],
      edges: [
        { type: 'import', enabled: true },
        { type: 'contains', enabled: false },
      ],
    })).toEqual({
      nodes: [
        node('src/app.cpp'),
        node('src/widget.hpp'),
        node('src/app.cpp#Runner:class', 'symbol', symbol({
          id: 'src/app.cpp:class:Runner',
          kind: 'class',
          name: 'Runner',
        })),
      ],
      edges: [
        edge('src/app.cpp', 'src/widget.hpp', 'import'),
      ],
    });
  });

  it('uses the narrower method row before the broad function row for method symbols', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/runner.cpp'),
        node('src/runner.cpp#TaskRunner::run:method', 'symbol', symbol({
          id: 'src/runner.cpp:method:TaskRunner::run',
          filePath: 'src/runner.cpp',
          kind: 'method',
          name: 'TaskRunner::run',
        })),
      ],
      edges: [
        edge('src/runner.cpp', 'src/runner.cpp#TaskRunner::run:method', 'contains'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:function', enabled: false },
        { type: 'symbol:method', enabled: true },
      ],
      edges: [
        { type: 'contains', enabled: true },
      ],
    })).toEqual(graphData);
  });

  it('keeps enabled symbol nodes as orphans when unrelated file edges are visible', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/main.c'),
        node('src/logger/logger.h'),
        node('src/logger/logger.h#logger_init:prototype', 'symbol', symbol({
          id: 'src/logger/logger.h:prototype:logger_init',
          filePath: 'src/logger/logger.h',
          kind: 'prototype',
          name: 'logger_init',
        })),
      ],
      edges: [
        edge('src/main.c', 'src/logger/logger.h', 'include'),
      ],
    };

    expect(applyGraphScope(graphData, {
      nodes: [
        { type: 'file', enabled: true },
        { type: 'symbol', enabled: true },
        { type: 'symbol:prototype', enabled: true },
      ],
      edges: [
        { type: 'include', enabled: true },
        { type: 'contains', enabled: false },
      ],
    })).toEqual({
      nodes: graphData.nodes,
      edges: [
        edge('src/main.c', 'src/logger/logger.h', 'include'),
      ],
    });
  });
});
