import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLayoutSettings } from '../../../../../../src/shared/settings/graphLayout';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  applyNodeDrag,
  markNodeDragging,
  postDraggedNodesDragEndMessages,
  postNodeDragEndMessages,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag';

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

  it('assigns dragged nodes using live Section Node positions', () => {
    const layout = createLayout(null);
    layout.sections.child.x = 20;
    layout.sections.child.y = 20;

    postNodeDragEndMessages(
      { id: 'node', x: 340, y: 40 } as FGNode,
      layout,
      '2d',
      false,
      [
        {
          id: 'child',
          isGraphSection: true,
          sectionHeight: 80,
          sectionWidth: 80,
          x: 300,
          y: 20,
        } as FGNode,
      ],
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

  it('marks active node drags and mirrors the new owner locally on drag end', () => {
    const node = { id: 'node', x: 40, y: 40 } as FGNode;

    markNodeDragging(node);
    expect(node.isDragging).toBe(true);

    postNodeDragEndMessages(node, createLayout(null), '2d', false);

    expect(node.isDragging).toBe(false);
    expect(node.ownerSectionId).toBe('child');
    expect(nodeDragHarness.postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_GRAPH_LAYOUT_OWNER',
      payload: {
        itemId: 'node',
        itemKind: 'node',
        ownerSectionId: 'child',
      },
    });
  });

  it('moves the selected node group by the live drag delta', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', vx: 1, vy: 2, x: 30, y: 40 } as FGNode;
    const outside = { id: 'outside', x: 90, y: 90 } as FGNode;

    const session = applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary, sibling, outside] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    });

    expect(session?.draggedNodeIds).toEqual(new Set(['primary', 'sibling']));
    expect(primary.isDragging).toBe(true);
    expect(sibling).toMatchObject({
      fx: 35,
      fy: 37,
      isDragging: true,
      vx: 0,
      vy: 0,
      x: 35,
      y: 37,
    });
    expect(outside).toMatchObject({ x: 90, y: 90 });
  });

  it('posts owner updates for every selected dragged node at drag end', () => {
    const primary = { id: 'primary', isDragging: true, x: 40, y: 40 } as FGNode;
    const sibling = { id: 'sibling', isDragging: true, x: 50, y: 50 } as FGNode;

    postDraggedNodesDragEndMessages(
      primary,
      {
        draggedNodeIds: new Set(['primary', 'sibling']),
        primaryNodeId: 'primary',
      },
      {
        graphData: { nodes: [primary, sibling] },
        graphLayout: createLayout(null),
        graphMode: '2d',
        timelineActive: false,
      },
    );

    expect(nodeDragHarness.postMessage).toHaveBeenNthCalledWith(1, {
      type: 'UPDATE_GRAPH_LAYOUT_OWNER',
      payload: {
        itemId: 'primary',
        itemKind: 'node',
        ownerSectionId: 'child',
      },
    });
    expect(nodeDragHarness.postMessage).toHaveBeenNthCalledWith(2, {
      type: 'UPDATE_GRAPH_LAYOUT_OWNER',
      payload: {
        itemId: 'sibling',
        itemKind: 'node',
        ownerSectionId: 'child',
      },
    });
    expect(primary.isDragging).toBe(false);
    expect(sibling.isDragging).toBe(false);
  });

  it('does not assign a dragged section to itself', () => {
    const section = {
      id: 'child',
      isGraphSection: true,
      sectionHeight: 80,
      sectionWidth: 80,
      x: 40,
      y: 40,
    } as FGNode;

    postNodeDragEndMessages(section, createLayout(null), '2d', false, [section]);

    expect(nodeDragHarness.postMessage).not.toHaveBeenCalled();
  });

  it('posts dragged section owner changes as section ownership', () => {
    const section = {
      id: 'child',
      isGraphSection: true,
      sectionHeight: 80,
      sectionWidth: 80,
      x: 250,
      y: 250,
    } as FGNode;

    postNodeDragEndMessages(section, createLayout(null), '2d', false, [section]);

    expect(nodeDragHarness.postMessage).toHaveBeenCalledWith({
      type: 'UPDATE_GRAPH_LAYOUT_OWNER',
      payload: {
        itemId: 'child',
        itemKind: 'section',
        ownerSectionId: null,
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
