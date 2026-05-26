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



    it('persists explicit Graph Section ownership updates', async () => {
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
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
            } as T;
          }

          return defaultValue;
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

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({ id: 'section-1' }),
        },
        ownership: {
          'src/app.ts': {
            itemId: 'src/app.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: expect.any(String),
          },
        },
      });
    });



    it('assigns a newly created file to the Graph Section from the context message', async () => {
      let graphLayout: GraphLayoutSettings = {
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
        createFile: vi.fn(async () => 'src/new-file.ts'),
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          return key === 'graphLayout' ? graphLayout as T : defaultValue;
        }),
        updateConfig: vi.fn((key: string, value: unknown) => {
          if (key === 'graphLayout') {
            graphLayout = value as GraphLayoutSettings;
          }
          return Promise.resolve();
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'CREATE_FILE',
        payload: {
          directory: '.',
          ownerSectionId: 'section-1',
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.createFile).toHaveBeenCalledWith('.');
      expect(graphLayout.ownership['src/new-file.ts']).toMatchObject({
        itemId: 'src/new-file.ts',
        itemKind: 'node',
        ownerSectionId: 'section-1',
      });
      expect(context.sendMessage).toHaveBeenLastCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: expect.objectContaining({
          ownership: {
            'src/new-file.ts': expect.objectContaining({ ownerSectionId: 'section-1' }),
          },
        }),
      });
    });



    it('assigns a newly created folder to the Graph Section from the context message', async () => {
      let graphLayout: GraphLayoutSettings = {
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
        createFolder: vi.fn(async () => 'new-folder'),
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          return key === 'graphLayout' ? graphLayout as T : defaultValue;
        }),
        updateConfig: vi.fn((key: string, value: unknown) => {
          if (key === 'graphLayout') {
            graphLayout = value as GraphLayoutSettings;
          }
          return Promise.resolve();
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'CREATE_FOLDER',
        payload: {
          directory: '.',
          ownerSectionId: 'section-1',
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.createFolder).toHaveBeenCalledWith('.');
      expect(graphLayout.ownership['new-folder']).toMatchObject({
        itemId: 'new-folder',
        itemKind: 'node',
        ownerSectionId: 'section-1',
      });
    });



    it('removes ownership records when items move back to the root graph', async () => {
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
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
              ownership: {
                'src/app.ts': {
                  itemId: 'src/app.ts',
                  itemKind: 'node',
                  ownerSectionId: 'section-1',
                  updatedAt: '2026-05-07T09:00:00.000Z',
                },
              },
            } as T;
          }

          return defaultValue;
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_OWNER',
        payload: {
          itemId: 'src/app.ts',
          itemKind: 'node',
          ownerSectionId: null,
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({ id: 'section-1' }),
        },
        ownership: {},
      });
    });



    it('persists Graph Section deletion by promoting direct children', async () => {
      const context = createPrimaryMessageContext({
        showWarningMessage: vi.fn(async (): Promise<'Delete' | undefined> => 'Delete'),
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
              collapsedNodes: {},
              pinnedNodes: {
                'section-2': {
                  nodeId: 'section-2',
                  '2D': { x: 40, y: 40 },
                },
              },
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
                  width: 120,
                  height: 100,
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
                  ownerSectionId: 'section-2',
                  updatedAt: '2026-05-07T09:00:00.000Z',
                },
              },
            } as T;
          }

          return defaultValue;
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'DELETE_GRAPH_LAYOUT_SECTION',
        payload: { sectionId: 'section-2' },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.showWarningMessage).toHaveBeenCalledWith(
        'Are you sure you want to delete Graph Section "Section 2"?',
        { modal: true },
        'Delete',
      );
      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({ id: 'section-1' }),
        },
        ownership: {
          'src/app.ts': {
            itemId: 'src/app.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: expect.any(String),
          },
        },
      });
    });



    it('does not delete a Graph Section when confirmation is cancelled', async () => {
      const context = createPrimaryMessageContext({
        showWarningMessage: vi.fn(async () => undefined),
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
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
            } as T;
          }

          return defaultValue;
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'DELETE_GRAPH_LAYOUT_SECTION',
        payload: { sectionId: 'section-1' },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.showWarningMessage).toHaveBeenCalledWith(
        'Are you sure you want to delete Graph Section "Section 1"?',
        { modal: true },
        'Delete',
      );
      expect(context.updateConfig).not.toHaveBeenCalled();
    });



    it('restores a deleted Graph Section through undo', async () => {
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
        ownership: {
          'section-1': {
            itemId: 'section-1',
            itemKind: 'section',
            ownerSectionId: null,
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
        showWarningMessage: vi.fn(async (): Promise<'Delete' | undefined> => 'Delete'),
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
        type: 'DELETE_GRAPH_LAYOUT_SECTION',
        payload: { sectionId: 'section-1' },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenLastCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {},
        ownership: {},
      });

      await expect(getUndoManager().undo()).resolves.toBe('Delete Graph Section');

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
      expect(context.sendMessage).toHaveBeenLastCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: expect.objectContaining({
          sections: {
            'section-1': expect.objectContaining({ id: 'section-1' }),
          },
        }),
      });
    });
});
