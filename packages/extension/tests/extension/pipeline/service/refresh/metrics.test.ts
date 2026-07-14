import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphNode } from '../../../../../src/shared/graph/contracts';
import { patchGraphDataNodeMetrics } from '../../../../../src/extension/pipeline/service/refresh/metrics';

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

describe('extension/pipeline/service/refresh/metrics', () => {
  it('returns the same graph when there are no metric file paths', () => {
    const graphData = {
      get nodes(): IGraphNode[] {
        throw new Error('nodes should not be read without metric file paths');
      },
      edges: [],
    } as IGraphData;

    expect(
      patchGraphDataNodeMetrics({
        filePaths: [],
        fileSizes: {},
        graphData,
      }),
    ).toBe(graphData);
  });

  it('returns the same graph when metric paths do not match any node', () => {
    const graphData = createGraph([createNode({ id: 'src/a.ts' })]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/other.ts'],
        fileSizes: { 'src/other.ts': { size: 64 } },
        graphData,
      }),
    ).toBe(graphData);
  });

  it('patches matching node metrics while preserving unchanged nodes', () => {
    const unchangedNode = createNode({ id: 'src/unchanged.ts', label: 'unchanged.ts' });
    const graphData = createGraph([
      createNode({ id: 'src\\a.ts', fileSize: 12 }),
      unchangedNode,
    ]);

    const patchedGraph = patchGraphDataNodeMetrics({
      filePaths: ['src\\a.ts'],
      fileSizes: { 'src/a.ts': { size: 64 } },
      graphData,
    });

    expect(patchedGraph).not.toBe(graphData);
    expect(patchedGraph.nodes).toEqual([
      createNode({ id: 'src\\a.ts', fileSize: 64 }),
      unchangedNode,
    ]);
    expect(patchedGraph.nodes[1]).toBe(unchangedNode);
  });

  it('uses symbol file paths when matching metric updates', () => {
    const graphData = createGraph([
      createNode({
        id: 'symbol:loadUser',
        nodeType: 'symbol',
        symbol: {
          id: 'symbol:loadUser',
          name: 'loadUser',
          kind: 'function',
          filePath: 'src/users.ts',
        },
      }),
    ]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/users.ts'],
        fileSizes: { 'src/users.ts': { size: 128 } },
        graphData,
      }).nodes[0],
    ).toEqual(createNode({
      id: 'symbol:loadUser',
      nodeType: 'symbol',
      fileSize: 128,
      symbol: {
        id: 'symbol:loadUser',
        name: 'loadUser',
        kind: 'function',
        filePath: 'src/users.ts',
      },
    }));
  });

  it('falls back to node ids when symbol file paths are empty', () => {
    const graphData = createGraph([
      createNode({
        id: 'src/a.ts',
        symbol: {
          id: 'symbol:a',
          name: 'a',
          kind: 'function',
          filePath: '',
        },
      }),
    ]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/a.ts'],
        fileSizes: { 'src/a.ts': { size: 20 } },
        graphData,
      }).nodes[0],
    ).toEqual(createNode({
      fileSize: 20,
      symbol: {
        id: 'symbol:a',
        name: 'a',
        kind: 'function',
        filePath: '',
      },
    }));
  });

  it('returns the same graph when matching metrics are unchanged', () => {
    const graphData = createGraph([createNode({ fileSize: 64 })]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/a.ts'],
        fileSizes: { 'src/a.ts': { size: 64 } },
        graphData,
      }),
    ).toBe(graphData);
  });

  it('patches when only one metric changes', () => {
    const graphData = createGraph([
      createNode({ id: 'src/size.ts', label: 'size.ts', fileSize: 10 }),
      createNode({ id: 'src/churn.ts', label: 'churn.ts', fileSize: 20 }),
    ]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/size.ts', 'src/churn.ts'],
        fileSizes: {
          'src/size.ts': { size: 16 },
          'src/churn.ts': { size: 20 },
        },
        graphData,
      }).nodes,
    ).toEqual([
      createNode({ id: 'src/size.ts', label: 'size.ts', fileSize: 16 }),
      createNode({ id: 'src/churn.ts', label: 'churn.ts', fileSize: 20 }),
    ]);
  });

  it('preserves unchanged matched nodes when another matched node changes', () => {
    const graphData = createGraph([
      createNode({ id: 'src/stable.ts', label: 'stable.ts', fileSize: 10 }),
      createNode({ id: 'src/changed.ts', label: 'changed.ts', fileSize: 20 }),
    ]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/stable.ts', 'src/changed.ts'],
        fileSizes: {
          'src/stable.ts': { size: 10 },
          'src/changed.ts': { size: 20 },
        },
        graphData,
      }).nodes,
    ).toEqual([
      createNode({ id: 'src/stable.ts', label: 'stable.ts', fileSize: 10 }),
      createNode({ id: 'src/changed.ts', label: 'changed.ts', fileSize: 20 }),
    ]);
  });

  it('defaults missing size and churn metrics without throwing', () => {
    const graphData = createGraph([createNode()]);

    expect(
      patchGraphDataNodeMetrics({
        filePaths: ['src/a.ts'],
        fileSizes: {},
        graphData,
      }).nodes[0],
    ).toEqual(createNode({ fileSize: undefined }));
  });
});
