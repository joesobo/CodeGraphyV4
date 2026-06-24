import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../../../../src/shared/graph/contracts';
import { areGraphDataPayloadsEqual } from '../../../../../../../src/extension/graphView/analysis/execution/publish/equality/payload';

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

function createEdge(overrides: Partial<IGraphEdge> = {}): IGraphEdge {
  return {
    id: 'src/a.ts->src/b.ts#import',
    from: 'src/a.ts',
    to: 'src/b.ts',
    kind: 'import',
    sources: [],
    ...overrides,
  };
}

function createGraph(overrides: Partial<IGraphData> = {}): IGraphData {
  return {
    nodes: [createNode()],
    edges: [createEdge()],
    ...overrides,
  };
}

function withStableJson<T extends unknown[]>(items: T, jsonValue: unknown): T {
  Object.defineProperty(items, 'toJSON', {
    value: () => jsonValue,
  });
  return items;
}

describe('extension/graphView/analysis/execution/publish/equality/payload', () => {
  it('treats the same graph payload object as equal without reading fields', () => {
    const graph = createGraph();
    Object.defineProperty(graph, 'nodes', {
      enumerable: true,
      get: () => {
        throw new Error('same-payload identity should not read graph fields');
      },
    });

    expect(areGraphDataPayloadsEqual(graph, graph)).toBe(true);
  });

  it('rejects payloads with different node or edge counts', () => {
    expect(
      areGraphDataPayloadsEqual(
        createGraph({ nodes: [createNode(), createNode({ id: 'src/b.ts' })] }),
        createGraph(),
      ),
    ).toBe(false);
    expect(
      areGraphDataPayloadsEqual(
        createGraph({ edges: [] }),
        createGraph(),
      ),
    ).toBe(false);
  });

  it('rejects count-only differences before serializing payloads', () => {
    expect(
      areGraphDataPayloadsEqual(
        createGraph({
          nodes: withStableJson([createNode(), createNode({ id: 'src/b.ts' })], ['same nodes']),
        }),
        createGraph({
          nodes: withStableJson([createNode()], ['same nodes']),
        }),
      ),
    ).toBe(false);
    expect(
      areGraphDataPayloadsEqual(
        createGraph({
          edges: withStableJson([], ['same edges']),
        }),
        createGraph({
          edges: withStableJson([createEdge()], ['same edges']),
        }),
      ),
    ).toBe(false);
  });

  it('compares serialized graph payloads when counts match', () => {
    expect(areGraphDataPayloadsEqual(createGraph(), createGraph())).toBe(true);
    expect(
      areGraphDataPayloadsEqual(
        createGraph(),
        createGraph({ nodes: [createNode({ label: 'renamed.ts' })] }),
      ),
    ).toBe(false);
  });

  it('rejects payloads that cannot be serialized', () => {
    const circularGraph = createGraph();
    (circularGraph.nodes[0] as IGraphNode & { graph?: IGraphData }).graph = circularGraph;

    expect(areGraphDataPayloadsEqual(circularGraph, createGraph())).toBe(false);
  });
});
