import { describe, expect, it, vi } from 'vitest';
import { forceLink, forceSimulation, type SimulationNodeDatum } from 'd3-force';
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
    expect(primary).toMatchObject({
      isDragging: true,
      x: 15,
      y: 12,
    });
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

  it('moves selected group followers by each force graph drag delta', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', vx: 1, vy: 2, x: 30, y: 40 } as FGNode;

    const firstSession = applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    });
    applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    }, firstSession);

    expect(sibling).toMatchObject({
      fx: 40,
      fy: 34,
      isDragging: true,
      vx: 0,
      vy: 0,
      x: 40,
      y: 34,
    });
  });

  it('lets link forces tug an unselected neighbor while the dragged node is fixed', () => {
    type LinkedNode = SimulationNodeDatum & { id: string };
    const dragged = { fx: 100, fy: 0, id: 'dragged', x: 100, y: 0 } as FGNode & LinkedNode;
    const neighbor = { id: 'neighbor', x: 0, y: 0 } as FGNode & LinkedNode;
    const initialNeighborX = neighbor.x ?? 0;

    applyNodeDrag(dragged, { x: 100, y: 0 }, {
      graphData: { nodes: [dragged, neighbor] },
      graphMode: '2d',
      selectedNodeIds: new Set(),
    });
    const simulation = forceSimulation<LinkedNode>([dragged, neighbor])
      .force('charge', null)
      .force('center', null)
      .force('link', forceLink<LinkedNode, { source: string | LinkedNode; target: string | LinkedNode }>([
        { source: dragged, target: neighbor },
      ]).id(node => node.id).distance(20).strength(1))
      .stop();

    simulation.alpha(1).tick(1);

    expect(neighbor.x).toBeGreaterThan(initialNeighborX);
  });

  it('keeps a pinned primary node at the force graph live drag position in 2d', () => {
    const primary = {
      fx: 20,
      fy: 9,
      id: 'primary',
      isPinned: true,
      vx: 2,
      vy: 4,
      x: 20,
      y: 9,
    } as FGNode;

    const session = applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary] },
      graphMode: '2d',
      selectedNodeIds: new Set(),
    });

    expect(session).toBeNull();
    expect(primary).toMatchObject({
      fx: 20,
      fy: 9,
      isDragging: true,
      vx: 0,
      vy: 0,
      x: 20,
      y: 9,
    });
  });

  it('does not move a pinned primary node beyond force graph live drag positions', () => {
    const primary = {
      fx: 20,
      fy: 9,
      id: 'primary',
      isPinned: true,
      vx: 2,
      vy: 4,
      x: 20,
      y: 9,
    } as FGNode;

    const firstSession = applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary] },
      graphMode: '2d',
      selectedNodeIds: new Set(),
    });
    primary.x = 25;
    primary.y = 6;
    primary.fx = 25;
    primary.fy = 6;
    applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary] },
      graphMode: '2d',
      selectedNodeIds: new Set(),
    }, firstSession);

    expect(primary).toMatchObject({
      fx: 25,
      fy: 6,
      isDragging: true,
      vx: 0,
      vy: 0,
      x: 25,
      y: 6,
    });
  });

  it('ignores missing nodes in a reused drag group session', () => {
    const primary = { id: 'primary', x: 15, y: 12 } as FGNode;
    const sibling = { id: 'sibling', x: 30, y: 40 } as FGNode;

    expect(() => applyNodeDrag(primary, { x: 5, y: -3 }, {
      graphData: { nodes: [primary, sibling] },
      graphMode: '2d',
      selectedNodeIds: new Set(['primary', 'sibling']),
    }, {
      draggedNodeIds: new Set(['primary', 'missing', 'sibling']),
      primaryNodeId: 'primary',
    })).not.toThrow();
    expect(sibling).toMatchObject({ x: 35, y: 37 });
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

  it('releases unpinned nodes where the user drops them', () => {
    const node = {
      id: 'node',
      fx: 12,
      fy: 24,
      fz: 36,
      isDragging: true,
      isPinned: false,
    } as unknown as FGNode;

    postNodeDragEndMessages(node, '3d');

    expect(node).toMatchObject({ isDragging: false });
    expect(node.fx).toBeUndefined();
    expect(node.fy).toBeUndefined();
    expect(node.fz).toBeUndefined();
  });

  it('keeps pinned graph nodes fixed where the user drops them', () => {
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
      fx: 12,
      fy: 24,
      fz: 36,
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
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.pin-drag-end',
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
    const pluginRuntimeNode = {
      id: 'plugin-runtime-node',
      ownerPluginId: 'acme.graph-tools',
      runtimeNodeType: 'workspace-group',
      workspaceGroupHeight: 100,
      workspaceGroupWidth: 160,
      x: 40,
      y: 50,
    } as unknown as FGNode;
    const onNodeDragEnd = vi.fn(() => undefined);

    postDraggedNodesDragEndMessages(
      node,
      null,
      {
        graphData: { nodes: [node, pluginRuntimeNode] },
        graphMode: '2d',
        graphViewContributions: {
          nodeDragEnd: [{
            pluginId: 'acme.graph-tools',
            contribution: {
              id: 'acme.graph-tools.drag-end',
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
      nodes: [node, pluginRuntimeNode],
      timelineActive: true,
    });
  });

  it('releases every unpinned node in the active drag group', () => {
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

    expect(primary).toMatchObject({ isDragging: false });
    expect(sibling).toMatchObject({ isDragging: false });
    expect(primary.fx).toBeUndefined();
    expect(primary.fy).toBeUndefined();
    expect(sibling.fx).toBeUndefined();
    expect(sibling.fy).toBeUndefined();
  });
});
