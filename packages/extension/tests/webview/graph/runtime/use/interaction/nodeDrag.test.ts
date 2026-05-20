import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  applyNodeDrag,
  markNodeDragging,
  postDraggedNodesDragEndMessages,
  postNodeDragEndMessages,
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag';

describe('graph/runtime/use/interaction node drag', () => {
  it('marks active node drags', () => {
    const node = { id: 'node' } as FGNode;

    markNodeDragging(node);

    expect(node.isDragging).toBe(true);
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

  it('ignores non-finite drag deltas after starting the drag', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', x: 30, y: 40 } as FGNode;

    const session = applyNodeDrag(primary, { x: Number.NaN, y: -3 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    });

    expect(session?.draggedNodeIds).toEqual(new Set(['primary', 'sibling']));
    expect(primary.isDragging).toBe(true);
    expect(sibling).toMatchObject({ x: 30, y: 40 });
    expect(sibling.isDragging).toBeUndefined();
  });

  it('releases unpinned nodes at drag end', () => {
    const node = {
      id: 'node',
      fx: 12,
      fy: 24,
      fz: 36,
      isDragging: true,
      isPinned: false,
    } as unknown as FGNode;

    postNodeDragEndMessages(node, '3d');

    expect(node).toMatchObject({
      fx: undefined,
      fy: undefined,
      fz: undefined,
      isDragging: false,
    });
  });

  it('releases pinned graph nodes when no plugin drag policy keeps them fixed', () => {
    const node = {
      id: 'node',
      fx: 12,
      fy: 24,
      fz: 36,
      isDragging: true,
      isPinned: true,
    } as unknown as FGNode;

    postNodeDragEndMessages(node, '3d');

    expect(node).toMatchObject({
      fx: undefined,
      fy: undefined,
      fz: undefined,
      isDragging: false,
    });
  });

  it('keeps fixed coordinates when a plugin drag policy owns the node', () => {
    const node = {
      id: 'node',
      fx: 12,
      fy: 24,
      isDragging: true,
      isPinned: true,
    } as FGNode;
    const onNodeDragEnd = vi.fn(() => ({ keepFixedPosition: true }));

    postNodeDragEndMessages(node, '2d', {
      nodeDragEnd: [{
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'codegraphy.organize.pin-drag-end',
          label: 'Pinned Node Drag End',
          onNodeDragEnd,
        },
      }],
    });

    expect(onNodeDragEnd).toHaveBeenCalledWith({
      graphMode: '2d',
      node,
      nodes: [node],
      timelineActive: false,
    });
    expect(node).toMatchObject({
      fx: 12,
      fy: 24,
      isDragging: false,
    });
  });

  it('passes live graph nodes and timeline state to plugin drag policies', () => {
    const node = {
      id: 'node',
      fx: 12,
      fy: 24,
      isDragging: true,
      isPinned: true,
      x: 12,
      y: 24,
    } as FGNode;
    const section = {
      id: 'section-ui',
      isGraphSection: true,
      sectionHeight: 100,
      sectionWidth: 160,
      x: 40,
      y: 50,
    } as unknown as FGNode;
    const onNodeDragEnd = vi.fn(() => undefined);

    postDraggedNodesDragEndMessages(
      node,
      null,
      {
        graphData: { nodes: [node, section] },
        graphMode: '2d',
        graphViewContributions: {
          nodeDragEnd: [{
            pluginId: 'codegraphy.organize',
            contribution: {
              id: 'codegraphy.organize.section-drag-end',
              label: 'Section Drag End',
              onNodeDragEnd,
            },
          }],
        },
        timelineActive: true,
      },
    );

    expect(onNodeDragEnd).toHaveBeenCalledWith({
      graphMode: '2d',
      node,
      nodes: [node, section],
      timelineActive: true,
    });
  });

  it('releases every node in the active drag group', () => {
    const primary = { id: 'primary', fx: 1, fy: 2, isDragging: true } as FGNode;
    const sibling = { id: 'sibling', fx: 3, fy: 4, isDragging: true } as FGNode;

    postDraggedNodesDragEndMessages(
      primary,
      {
        draggedNodeIds: new Set(['primary', 'sibling']),
        primaryNodeId: 'primary',
      },
      {
        graphData: { nodes: [primary, sibling] },
        graphMode: '2d',
      },
    );

    expect(primary).toMatchObject({ fx: undefined, fy: undefined, isDragging: false });
    expect(sibling).toMatchObject({ fx: undefined, fy: undefined, isDragging: false });
  });
});
