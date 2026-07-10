import { describe, expect, it } from 'vitest';
import type { IGraphNode } from '../../../../../../../src/shared/graph/contracts';
import { areNodesEqualIgnoringMetrics } from '../../../../../../../src/extension/graphView/analysis/execution/publish/equality/node';

function createNode(overrides: Partial<IGraphNode> = {}): IGraphNode {
  return {
    id: 'src/a.ts',
    label: 'a.ts',
    color: '#67E8F9',
    nodeType: 'file',
    ...overrides,
  };
}

describe('extension/graphView/analysis/execution/publish/equality/node', () => {
  it('treats the same node object as equal', () => {
    const node = createNode();
    Object.defineProperty(node, 'label', {
      enumerable: true,
      get: () => {
        throw new Error('same-node identity should not read node fields');
      },
    });

    expect(areNodesEqualIgnoringMetrics(node, node)).toBe(true);
  });

  it('rejects non-metric node differences', () => {
    expect(
      areNodesEqualIgnoringMetrics(
        createNode({ label: 'a.ts' }),
        createNode({ label: 'renamed.ts' }),
      ),
    ).toBe(false);
  });
});
