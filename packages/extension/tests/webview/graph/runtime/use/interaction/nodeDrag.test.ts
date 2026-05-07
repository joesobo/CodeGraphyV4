import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLayoutSettings } from '../../../../../../src/shared/settings/graphLayout';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { postNodeDragEndMessages } from '../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag';

const nodeDragHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../../../src/webview/vscodeApi', () => ({
  postMessage: nodeDragHarness.postMessage,
}));

function createLayout(ownerSectionId: string | null = null): GraphLayoutSettings {
  return {
    pinnedNodes: {},
    sections: {
      parent: {
        id: 'parent',
        label: 'Parent',
        color: '#60a5fa',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        collapsed: false,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
      child: {
        id: 'child',
        label: 'Child',
        color: '#22c55e',
        x: 20,
        y: 20,
        width: 80,
        height: 80,
        collapsed: false,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    },
    ownership: {
      parent: {
        itemId: 'parent',
        itemKind: 'section',
        ownerSectionId: null,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
      child: {
        itemId: 'child',
        itemKind: 'section',
        ownerSectionId: 'parent',
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
      node: {
        itemId: 'node',
        itemKind: 'node',
        ownerSectionId,
        updatedAt: '2026-05-07T09:00:00.000Z',
      },
    },
  };
}

describe('graph/runtime/use/interaction node drag', () => {
  beforeEach(() => {
    nodeDragHarness.postMessage.mockReset();
  });

  it('updates a pinned node position at drag end', () => {
    postNodeDragEndMessages(
      { id: 'node', isPinned: true, x: 12, y: 24 } as FGNode,
      undefined,
      '2d',
      false,
    );

    expect(nodeDragHarness.postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_GRAPH_LAYOUT_PIN',
      payload: {
        graphMode: '2d',
        nodeId: 'node',
        position: { x: 12, y: 24 },
      },
    });
  });

  it('assigns a dragged node to the deepest section under the drop point', () => {
    postNodeDragEndMessages(
      { id: 'node', x: 40, y: 40 } as FGNode,
      createLayout(null),
      '2d',
      false,
    );

    expect(nodeDragHarness.postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_GRAPH_LAYOUT_OWNER',
      payload: {
        itemId: 'node',
        itemKind: 'node',
        ownerSectionId: 'child',
      },
    });
  });

  it('skips owner updates when the owner is unchanged or owner updates are unavailable', () => {
    postNodeDragEndMessages({ id: 'node', x: 40, y: 40 } as FGNode, createLayout('child'), '2d', false);
    postNodeDragEndMessages({ id: 'node', x: 40, y: 40, z: 10 } as FGNode, createLayout(null), '3d', false);
    postNodeDragEndMessages({ id: 'node', x: 40, y: 40 } as FGNode, createLayout(null), '2d', true);

    expect(nodeDragHarness.postMessage).not.toHaveBeenCalled();
  });

  it('skips pin and owner updates when the dragged node has no valid position', () => {
    postNodeDragEndMessages(
      { id: 'node', isPinned: true, x: Number.NaN, y: 24 } as FGNode,
      createLayout(null),
      '2d',
      false,
    );

    expect(nodeDragHarness.postMessage).not.toHaveBeenCalled();
  });

  it('treats nodes without saved ownership as root-owned before drag reassignment', () => {
    const layout = createLayout(null);
    delete layout.ownership.node;

    expect(() => postNodeDragEndMessages(
      { id: 'node', x: 250, y: 250 } as FGNode,
      layout,
      '2d',
      false,
    )).not.toThrow();

    expect(nodeDragHarness.postMessage).not.toHaveBeenCalled();
  });
});
