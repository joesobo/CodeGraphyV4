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
      graphMode: '2d',
      graphViewContributions: {
        nodeDragEnd: [nodeDragEndContribution(onNodeDragEnd)],
      },
      timelineActive: true,
    })).toBe(true);
    expect(onNodeDragEnd).toHaveBeenCalledWith({
      graphMode: '2d',
      node: draggedNode,
      nodes: graphNodes,
      timelineActive: true,
    });
  });

  it('uses the dragged node and inactive timeline as default policy context', () => {
    const draggedNode = node();
    const onNodeDragEnd = vi.fn(() => undefined);

    expect(shouldKeepFixedPosition(draggedNode, {
      graphMode: '3d',
      graphViewContributions: {
        nodeDragEnd: [nodeDragEndContribution(onNodeDragEnd)],
      },
    })).toBe(false);
    expect(onNodeDragEnd).toHaveBeenCalledWith({
      graphMode: '3d',
      node: draggedNode,
      nodes: [draggedNode],
      timelineActive: false,
    });
  });

  it('logs failing drag policies and continues to later policies', () => {
    const error = new Error('policy failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(shouldKeepFixedPosition(node(), {
      graphMode: '2d',
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

  it('releases temporary 2d drag coordinates after the user drops the node', () => {
    const draggedNode = node({ fx: 1, fy: 2, fz: 3, isDragging: true });

    releaseNodeDrag(draggedNode, '2d');

    expect(draggedNode).toMatchObject({ isDragging: false });
    expect(draggedNode.fx).toBeUndefined();
    expect(draggedNode.fy).toBeUndefined();
    expect(draggedNode.fz).toBeUndefined();
  });

  it('releases temporary 3d drag coordinates after the user drops the node', () => {
    const draggedNode = node({ fx: 1, fy: 2, fz: 3, isDragging: true });

    releaseNodeDrag(draggedNode, '3d');

    expect(draggedNode).toMatchObject({ isDragging: false });
    expect(draggedNode.fx).toBeUndefined();
    expect(draggedNode.fy).toBeUndefined();
    expect(draggedNode.fz).toBeUndefined();
  });

  it('keeps coordinates for nodes in explicit pin mode', () => {
    const draggedNode = node({ fx: 1, fy: 2, fz: 3, isDragging: true, isPinned: true });

    releaseNodeDrag(draggedNode, '2d');

    expect(draggedNode).toMatchObject({
      fx: 1,
      fy: 2,
      fz: 3,
      isDragging: false,
    });
  });

  it('keeps coordinates when release is owned by a drag policy', () => {
    const draggedNode = node({ fx: 1, fy: 2, fz: 3, isDragging: true });

    releaseNodeDrag(draggedNode, '3d', {
      graphViewContributions: {
        nodeDragEnd: [nodeDragEndContribution(() => ({ keepFixedPosition: true }))],
      },
    });

    expect(draggedNode).toMatchObject({
      fx: 1,
      fy: 2,
      fz: 3,
      isDragging: false,
    });
  });
});
