import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../../../../src/shared/graph/contracts';
import {
  collectMetricOnlyGraphUpdates,
  createNodeMap,
} from '../../../../../../../src/extension/graphView/analysis/execution/publish/metrics/updates';

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

describe('extension/graphView/analysis/execution/publish/metrics/updates', () => {
  it('indexes graph nodes by id', () => {
    const firstNode = createNode({ id: 'src/a.ts' });
    const secondNode = createNode({ id: 'src/b.ts' });

    expect(createNodeMap([firstNode, secondNode])).toEqual(new Map([
      ['src/a.ts', firstNode],
      ['src/b.ts', secondNode],
    ]));
  });

  it('returns undefined when no node metrics changed', () => {
    expect(
      collectMetricOnlyGraphUpdates(
        [createNode({ fileSize: 10, churn: 1 })],
        createNodeMap([createNode({ fileSize: 10, churn: 1 })]),
      ),
    ).toBeUndefined();
  });

  it('returns undefined when a next node is missing', () => {
    expect(
      collectMetricOnlyGraphUpdates(
        [createNode({ id: 'src/a.ts' })],
        createNodeMap([createNode({ id: 'src/b.ts' })]),
      ),
    ).toBeUndefined();
  });

  it('returns undefined when a changed node has non-metric differences', () => {
    expect(
      collectMetricOnlyGraphUpdates(
        [createNode({ fileSize: 10, churn: 1 })],
        createNodeMap([createNode({ label: 'renamed.ts', fileSize: 15, churn: 1 })]),
      ),
    ).toBeUndefined();
  });
});
