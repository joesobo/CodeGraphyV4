import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchGraphViewPrimaryMessage } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import {
  getUndoManager,
  resetUndoManager,
} from '../../../../../../src/extension/undoManager';
import {
  type GraphLayoutSettings
} from '../../../../../../src/shared/settings/graphLayout';
import { createPrimaryMessageContext } from '../context';

describe('graphView/webview/dispatch/primary graph layout', () => {

    beforeEach(() => {
      resetUndoManager();
    });



    it('restores Graph Section ownership changes through undo', async () => {
      let currentGraphLayout: GraphLayoutSettings = {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'Section 1',
            color: '#60a5fa',
            x: 0,
            y: 0,
            width: 280,
            height: 180,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {},
      };
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          return key === 'graphLayout' ? currentGraphLayout as T : defaultValue;
        }),
        updateConfig: vi.fn((key: string, value: unknown) => {
          if (key === 'graphLayout') {
            currentGraphLayout = value as GraphLayoutSettings;
          }
          return Promise.resolve();
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_OWNER',
        payload: {
          itemId: 'src/app.ts',
          itemKind: 'node',
          ownerSectionId: 'section-1',
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenLastCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({ id: 'section-1' }),
        },
        ownership: {
          'src/app.ts': expect.objectContaining({
            itemId: 'src/app.ts',
            ownerSectionId: 'section-1',
          }),
        },
      });

      await expect(getUndoManager().undo()).resolves.toBe('Move Graph Item');

      expect(context.updateConfig).toHaveBeenLastCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({ id: 'section-1' }),
        },
        ownership: {},
      });
      expect(context.sendMessage).toHaveBeenLastCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: expect.objectContaining({
          ownership: {},
        }),
      });
    });



    it('restores nested Graph Section ownership changes through undo', async () => {
      let currentGraphLayout: GraphLayoutSettings = {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'Section 1',
            color: '#60a5fa',
            x: 0,
            y: 0,
            width: 280,
            height: 180,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          'section-2': {
            id: 'section-2',
            label: 'Section 2',
            color: '#22c55e',
            x: 40,
            y: 40,
            width: 180,
            height: 120,
            collapsed: false,
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
        ownership: {
          'section-2': {
            itemId: 'section-2',
            itemKind: 'section',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
          'src/app.ts': {
            itemId: 'src/app.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-07T09:00:00.000Z',
          },
        },
      };
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          return key === 'graphLayout' ? currentGraphLayout as T : defaultValue;
        }),
        updateConfig: vi.fn((key: string, value: unknown) => {
          if (key === 'graphLayout') {
            currentGraphLayout = value as GraphLayoutSettings;
          }
          return Promise.resolve();
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_OWNER',
        payload: {
          itemId: 'src/app.ts',
          itemKind: 'node',
          ownerSectionId: 'section-2',
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(currentGraphLayout.ownership['src/app.ts']?.ownerSectionId).toBe('section-2');

      await expect(getUndoManager().undo()).resolves.toBe('Move Graph Item');

      expect(currentGraphLayout.ownership['src/app.ts']).toMatchObject({
        itemId: 'src/app.ts',
        itemKind: 'node',
        ownerSectionId: 'section-1',
      });
    });
});
