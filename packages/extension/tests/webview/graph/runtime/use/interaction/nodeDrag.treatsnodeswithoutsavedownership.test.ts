import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphLayoutSettings } from '../../../../../../src/shared/settings/graphLayout';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import {
  postNodeDragEndMessages
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
