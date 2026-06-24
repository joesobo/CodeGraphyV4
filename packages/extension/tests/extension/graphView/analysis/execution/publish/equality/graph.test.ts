import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../../../../src/shared/graph/contracts';
import { areGraphDataEqualIgnoringNodeMetrics } from '../../../../../../../src/extension/graphView/analysis/execution/publish/equality/graph';

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

function createEmptyTripWireArray<T>(message: string): T[] {
  return new Proxy<T[]>([], {
    get(target, property, receiver) {
      if (property === '0') {
        throw new Error(message);
      }

      return Reflect.get(target, property, receiver);
    },
  });
}

describe('extension/graphView/analysis/execution/publish/equality/graph', () => {
  it('treats matching graphs as equal while ignoring node metrics', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph({ nodes: [createNode({ churn: 1, fileSize: 10 })] }),
        createGraph({ nodes: [createNode({ churn: 9, fileSize: 90 })] }),
      ),
    ).toBe(true);
  });

  it('rejects graphs when only the next graph has an extra node', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph(),
        createGraph({ nodes: [createNode(), createNode({ id: 'src/b.ts' })] }),
      ),
    ).toBe(false);
  });

  it('rejects graphs when only the next graph has an extra edge', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph(),
        createGraph({ edges: [createEdge(), createEdge({ id: 'src/b.ts->src/c.ts#import' })] }),
      ),
    ).toBe(false);
  });

  it('rejects non-metric node differences', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph(),
        createGraph({ nodes: [createNode({ label: 'renamed.ts' })] }),
      ),
    ).toBe(false);
  });

  it('rejects edge differences', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph(),
        createGraph({ edges: [createEdge({ kind: 'call' })] }),
      ),
    ).toBe(false);
  });

  it('does not inspect node slots when both graphs have no nodes', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph({
          nodes: createEmptyTripWireArray<IGraphNode>('empty node arrays should not read item zero'),
          edges: [],
        }),
        createGraph({
          nodes: createEmptyTripWireArray<IGraphNode>('empty node arrays should not read item zero'),
          edges: [],
        }),
      ),
    ).toBe(true);
  });

  it('does not inspect edge slots when both graphs have no edges', () => {
    expect(
      areGraphDataEqualIgnoringNodeMetrics(
        createGraph({
          nodes: [],
          edges: createEmptyTripWireArray<IGraphEdge>('empty edge arrays should not read item zero'),
        }),
        createGraph({
          nodes: [],
          edges: createEmptyTripWireArray<IGraphEdge>('empty edge arrays should not read item zero'),
        }),
      ),
    ).toBe(true);
  });
});
