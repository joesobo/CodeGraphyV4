import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../../../../../src/shared/graph/contracts';
import { createMetricOnlyGraphUpdate } from '../../../../../../../src/extension/graphView/analysis/execution/publish/metrics/patch';

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
    nodes: [createNode({ fileSize: 10, churn: 1 })],
    edges: [createEdge()],
    ...overrides,
  };
}

describe('extension/graphView/analysis/execution/publish/metrics/patch', () => {
  it('returns metric patches for metric-only changed path updates', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph({ nodes: [createNode({ fileSize: 15, churn: 2 })] }),
        ['src/a.ts'],
      ),
    ).toEqual([{ id: 'src/a.ts', fileSize: 15, churn: 2 }]);
  });

  it('returns undefined when no current graph exists', () => {
    expect(
      createMetricOnlyGraphUpdate(
        undefined,
        createGraph(),
        ['src/a.ts'],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when no changed paths are available', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph({ nodes: [createNode({ fileSize: 15 })] }),
        [],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when node counts changed', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph({ nodes: [createNode(), createNode({ id: 'src/b.ts' })] }),
        ['src/a.ts'],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when edge counts changed', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph({ edges: [createEdge(), createEdge({ id: 'src/b.ts->src/c.ts#import' })] }),
        ['src/a.ts'],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when graph differences are not metric-only', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph({ nodes: [createNode({ label: 'renamed.ts', fileSize: 15 })] }),
        ['src/a.ts'],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when no changed path nodes are present', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph({ nodes: [createNode({ fileSize: 15 })] }),
        ['src/missing.ts'],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when changed path node sets differ', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph({
          nodes: [
            createNode({
              id: 'src/a.ts#Component',
              nodeType: 'symbol',
              symbol: {
                id: 'src/a.ts#Component',
                name: 'Component',
                kind: 'class',
                filePath: 'src/a.ts',
              },
            }),
          ],
        }),
        createGraph({
          nodes: [createNode({ id: 'src/a.ts#Component', nodeType: 'symbol' })],
        }),
        ['src/a.ts'],
      ),
    ).toBeUndefined();
  });

  it('returns undefined when changed node metrics are unchanged', () => {
    expect(
      createMetricOnlyGraphUpdate(
        createGraph(),
        createGraph(),
        ['src/a.ts'],
      ),
    ).toBeUndefined();
  });
});
