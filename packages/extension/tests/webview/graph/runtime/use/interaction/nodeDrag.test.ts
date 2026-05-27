import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLayoutSettings } from '../../../../../../src/shared/settings/graphLayout';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  markNodeDragging,
  postNodeDragEndMessages,
  updateNodeDragOwnerPreview
} from '../../../../../../src/webview/components/graph/runtime/use/interaction/nodeDrag';

const nodeDragHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../../../src/webview/vscodeApi', () => ({
  postMessage: nodeDragHarness.postMessage,
}));

function createLayout(ownerSectionId: string | null = null): GraphLayoutSettings {
  return {
    collapsedNodes: {},
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



    it('updates a pinned Section Member position in direct owner local coordinates at drag end', () => {
      postNodeDragEndMessages(
        { id: 'node', isPinned: true, ownerSectionId: 'parent', x: 120, y: 80 } as FGNode,
        {
          collapsedNodes: {},
          pinnedNodes: {},
          sections: {
            parent: {
              id: 'parent',
              label: 'Parent',
              color: '#60a5fa',
              x: 100,
              y: 50,
              width: 200,
              height: 160,
              collapsed: false,
              updatedAt: '2026-05-07T09:00:00.000Z',
            },
          },
          ownership: {
            node: {
              itemId: 'node',
              itemKind: 'node',
              ownerSectionId: 'parent',
              updatedAt: '2026-05-07T09:00:00.000Z',
            },
          },
        },
        '2d',
        false,
      );

      expect(nodeDragHarness.postMessage).toHaveBeenCalledWith({
        type: 'UPDATE_GRAPH_LAYOUT_PIN',
        payload: {
          graphMode: '2d',
          nodeId: 'node',
          position: { x: 20, y: 30 },
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



    it('assigns a dragged node to a nested section using world-space section bounds', () => {
      const layout = createLayout('parent');
      layout.sections.parent.x = 100;
      layout.sections.parent.y = 50;
      layout.sections.child.x = 20;
      layout.sections.child.y = 20;

      postNodeDragEndMessages(
        { id: 'node', x: 140, y: 90 } as FGNode,
        layout,
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



    it('previews nested section ownership using world-space section bounds', () => {
      const layout = createLayout('parent');
      layout.sections.parent.x = 100;
      layout.sections.parent.y = 50;
      layout.sections.child.x = 20;
      layout.sections.child.y = 20;

      expect(updateNodeDragOwnerPreview({ id: 'node', x: 140, y: 90 } as FGNode, {
        graphData: { nodes: [] },
        graphLayout: layout,
        graphMode: '2d',
        timelineActive: false,
      })).toBe('child');
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
            x: 340,
            y: 60,
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
});
