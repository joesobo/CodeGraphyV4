import type { CoreGraphViewContributionEntry } from '@codegraphy-dev/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IGraphViewNodeDragEndContribution } from '../../../../../../../src/core/plugins/types/contracts';
import type { FGNode } from '../../../../../../../src/webview/components/graph/model/build';
import {
  releaseNodeDrag,
  shouldKeepFixedPosition,
} from '../../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag/policy';

function node(overrides: Partial<FGNode> & { id?: string } = {}): FGNode {
  return { id: 'node', ...overrides } as FGNode;
}

function nodeDragEndContribution(
  onNodeDragEnd: IGraphViewNodeDragEndContribution['onNodeDragEnd'],
): CoreGraphViewContributionEntry<IGraphViewNodeDragEndContribution> {
  return {
    pluginId: 'plugin.organize',
    contribution: {
      id: 'pin-policy',
      label: 'Pin Policy',
      onNodeDragEnd,
    },
  };
}

describe('graph/runtime/use/interaction/nodeDrag/policy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps fixed coordinates when a drag policy requests it', () => {
    const draggedNode = node();
    const graphNodes = [draggedNode, node({ id: 'other' })];
    const onNodeDragEnd = vi.fn(() => ({ keepFixedPosition: true }));

    expect(shouldKeepFixedPosition(draggedNode, {
      graphData: { nodes: graphNodes },
      graphViewContributions: {
        nodeDragEnd: [nodeDragEndContribution(onNodeDragEnd)],
      },
    })).toBe(true);
    expect(onNodeDragEnd).toHaveBeenCalledWith({
      node: draggedNode,
      nodes: graphNodes,
    });
  });

  it('uses the dragged node as the default policy context', () => {
    const draggedNode = node();
    const onNodeDragEnd = vi.fn(() => undefined);

    expect(shouldKeepFixedPosition(draggedNode, {
      graphViewContributions: {
        nodeDragEnd: [nodeDragEndContribution(onNodeDragEnd)],
      },
    })).toBe(false);
    expect(onNodeDragEnd).toHaveBeenCalledWith({
      node: draggedNode,
      nodes: [draggedNode],
    });
  });

  it('logs failing drag policies and continues to later policies', () => {
    const error = new Error('policy failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(shouldKeepFixedPosition(node(), {
      graphViewContributions: {
        nodeDragEnd: [
          nodeDragEndContribution(() => {
            throw error;
          }),
          nodeDragEndContribution(() => ({ keepFixedPosition: true })),
        ],
      },
    })).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Plugin node drag end contribution error:',
      error,
    );
  });

  it('keeps 2d coordinates fixed where the user drops the node', () => {
    const draggedNode = node({ fx: 1, fy: 2, isDragging: true });

    releaseNodeDrag(draggedNode);

    expect(draggedNode).toMatchObject({
      fx: 1,
      fy: 2,
      isDragging: false,
    });
  });

  it('keeps coordinates when release is owned by a drag policy', () => {
    const draggedNode = node({ fx: 1, fy: 2, isDragging: true });

    releaseNodeDrag(draggedNode, {
      graphViewContributions: {
        nodeDragEnd: [nodeDragEndContribution(() => ({ keepFixedPosition: true }))],
      },
    });

    expect(draggedNode).toMatchObject({
      fx: 1,
      fy: 2,
      isDragging: false,
    });
  });
});
