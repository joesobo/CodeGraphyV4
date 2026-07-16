import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphNode } from '../../../../../../../src/shared/graph/contracts';
import {
  collectChangedPathNodes,
  hasChangedNodeMetricDifference,
} from '../../../../../../../src/extension/graphView/analysis/execution/publish/metrics/changedPaths';

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

function createGraph(nodes: IGraphNode[]): IGraphData {
  return {
    nodes,
    edges: [],
  };
}

describe('extension/graphView/analysis/execution/publish/metrics/changedPaths', () => {
  it('returns false when no changed file paths are available', () => {
    expect(
      hasChangedNodeMetricDifference(
        createGraph([createNode({ fileSize: 10 })]),
        createGraph([createNode({ fileSize: 20 })]),
        undefined,
      ),
    ).toBe(false);
  });

  it('detects file size metric differences for changed nodes', () => {
    expect(
      hasChangedNodeMetricDifference(
        createGraph([createNode({ fileSize: 10 })]),
        createGraph([createNode({ fileSize: 20 })]),
        ['src/a.ts'],
      ),
    ).toBe(true);
  });

  it('ignores changed paths when either graph is missing the node', () => {
    expect(
      hasChangedNodeMetricDifference(
        createGraph([createNode({ id: 'src/a.ts', fileSize: 10 })]),
        createGraph([createNode({ id: 'src/b.ts', fileSize: 20 })]),
        ['src/a.ts'],
      ),
    ).toBe(false);
  });

  it('returns false when changed node metrics are unchanged', () => {
    expect(
      hasChangedNodeMetricDifference(
        createGraph([createNode({ fileSize: 10 })]),
        createGraph([createNode({ fileSize: 10 })]),
        ['src/a.ts'],
      ),
    ).toBe(false);
  });

  it('collects nodes whose id exactly matches a changed path', () => {
    const matchingNode = createNode({ id: 'src/a.ts' });
    const unrelatedNode = createNode({ id: 'src/b.ts' });

    expect(collectChangedPathNodes(
      createGraph([matchingNode, unrelatedNode]),
      ['src/a.ts', 'src/c.ts'],
    )).toEqual([matchingNode]);
  });

  it('collects nodes whose id matches a workspace-prefixed changed path', () => {
    const matchingNode = createNode({ id: 'src/a.ts' });
    const unrelatedNode = createNode({ id: 'src/b.ts' });

    expect(collectChangedPathNodes(
      createGraph([matchingNode, unrelatedNode]),
      ['/workspace/project/src/a.ts'],
    )).toEqual([matchingNode]);
  });

  it('collects nodes from Windows-style changed paths', () => {
    const matchingNode = createNode({ id: 'src/a.ts' });
    const unrelatedNode = createNode({ id: 'src/b.ts' });

    expect(collectChangedPathNodes(
      createGraph([matchingNode, unrelatedNode]),
      ['C:\\workspace\\project\\src\\a.ts'],
    )).toEqual([matchingNode]);
  });

  it('collects symbol nodes by symbol file path', () => {
    const symbolNode = createNode({
      id: 'src/a.ts#Component',
      nodeType: 'symbol',
      symbol: {
        id: 'src/a.ts#Component',
        name: 'Component',
        kind: 'class',
        filePath: 'src/a.ts',
      },
    });
    const unrelatedNode = createNode({ id: 'src/b.ts#Component', nodeType: 'symbol' });

    expect(collectChangedPathNodes(
      createGraph([symbolNode, unrelatedNode]),
      ['src/a.ts'],
    )).toEqual([symbolNode]);
  });
});
