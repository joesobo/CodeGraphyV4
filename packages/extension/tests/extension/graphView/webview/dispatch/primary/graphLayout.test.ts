import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { dispatchGraphViewPrimaryMessage } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import {
  resetUndoManager
} from '../../../../../../src/extension/undoManager';
import {
  createDefaultGraphLayoutSettings,
  type GraphLayoutSettings,
} from '../../../../../../src/shared/settings/graphLayout';
import { createPrimaryMessageContext } from '../context';

describe('graphView/webview/dispatch/primary graph layout', () => {

    beforeEach(() => {
      resetUndoManager();
    });



    it('persists an active-mode node pin and echoes the updated graph layout', async () => {
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
              collapsedNodes: {},
              pinnedNodes: {},
              sections: {},
              ownership: {},
            } as T;
          }

          return defaultValue;
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_PIN',
        payload: {
          graphMode: '2d',
          nodeId: 'src/app.ts',
          position: { x: 12, y: -24 },
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {
          'src/app.ts': {
            nodeId: 'src/app.ts',
            '2D': { x: 12, y: -24 },
          },
        },
        sections: {},
        ownership: {},
      });
      expect(context.sendMessage).toHaveBeenCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: {
          collapsedNodes: {},
          pinnedNodes: {
            'src/app.ts': {
              nodeId: 'src/app.ts',
              '2D': { x: 12, y: -24 },
            },
          },
          sections: {},
          ownership: {},
        },
      });
    });



    it('clears only the active-mode pin and removes empty pin records', async () => {
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
              collapsedNodes: {},
              pinnedNodes: {
                'src/app.ts': {
                  nodeId: 'src/app.ts',
                  '2D': { x: 12, y: -24 },
                },
              },
              sections: {},
              ownership: {},
            } as T;
          }

          return defaultValue;
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'CLEAR_GRAPH_LAYOUT_PIN',
        payload: {
          graphMode: '2d',
          nodeId: 'src/app.ts',
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {},
        ownership: {},
      });
      expect(context.sendMessage).toHaveBeenCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: {
          collapsedNodes: {},
          pinnedNodes: {},
          sections: {},
          ownership: {},
        },
      });
    });



    it('persists a generated Graph Section and selected-node ownership', async () => {
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return {
              collapsedNodes: {},
              pinnedNodes: {},
              sections: {},
              ownership: {},
            } as T;
          }

          return defaultValue;
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'CREATE_GRAPH_LAYOUT_SECTION',
        payload: {
          color: '#60a5fa',
          height: 180,
          memberNodeIds: ['src/app.ts', 'src/utils.ts'],
          width: 280,
          x: -140,
          y: -90,
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'Section 1',
            color: '#60a5fa',
            x: -140,
            y: -90,
            width: 280,
            height: 180,
            collapsed: false,
            updatedAt: expect.any(String),
          },
        },
        ownership: {
          'src/app.ts': {
            itemId: 'src/app.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: expect.any(String),
          },
          'src/utils.ts': {
            itemId: 'src/utils.ts',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: expect.any(String),
          },
        },
      });
      expect(context.sendMessage).toHaveBeenCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: expect.objectContaining({
          sections: expect.objectContaining({
            'section-1': expect.objectContaining({ label: 'Section 1' }),
          }),
          ownership: {
            'src/app.ts': expect.objectContaining({ ownerSectionId: 'section-1' }),
            'src/utils.ts': expect.objectContaining({ ownerSectionId: 'section-1' }),
          },
        }),
      });
    });



    it('persists the user-facing Graph Section lifecycle across creation, ownership, editing, collapse, and pinning', async () => {
      let graphLayout: GraphLayoutSettings = createDefaultGraphLayoutSettings();
      const context = createPrimaryMessageContext({
        getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
          if (key === 'graphLayout') {
            return graphLayout as T;
          }

          return defaultValue;
        }),
        updateConfig: vi.fn((key: string, value: unknown) => {
          if (key === 'graphLayout') {
            graphLayout = value as GraphLayoutSettings;
          }

          return Promise.resolve();
        }),
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'CREATE_GRAPH_LAYOUT_SECTION',
        payload: {
          color: '#60a5fa',
          height: 180,
          memberNodeIds: ['src/app.ts'],
          width: 280,
          x: -140,
          y: -90,
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(graphLayout.sections['section-1']).toMatchObject({
        color: '#60a5fa',
        collapsed: false,
        height: 180,
        label: 'Section 1',
        width: 280,
        x: -140,
        y: -90,
      });
      expect(graphLayout.ownership['src/app.ts']).toMatchObject({
        itemKind: 'node',
        ownerSectionId: 'section-1',
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_OWNER',
        payload: {
          itemId: 'src',
          itemKind: 'node',
          ownerSectionId: 'section-1',
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(graphLayout.ownership.src).toMatchObject({
        itemKind: 'node',
        ownerSectionId: 'section-1',
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_SECTION',
        payload: {
          sectionId: 'section-1',
          updates: {
            collapsed: true,
            color: '#22c55e',
            height: 220,
            label: 'Feature Work',
            width: 340,
            x: 40,
            y: 50,
          },
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(graphLayout.sections['section-1']).toMatchObject({
        collapsed: true,
        color: '#22c55e',
        height: 220,
        label: 'Feature Work',
        width: 340,
        x: 40,
        y: 50,
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_PIN',
        payload: {
          graphMode: '2d',
          nodeId: 'section-1',
          position: { x: 210, y: 180 },
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(graphLayout.pinnedNodes['section-1']).toMatchObject({
        nodeId: 'section-1',
        '2D': { x: 210, y: 180 },
      });
      expect(context.updateConfig).toHaveBeenLastCalledWith('graphLayout', graphLayout);
      expect(context.sendMessage).toHaveBeenLastCalledWith({
        type: 'GRAPH_LAYOUT_UPDATED',
        payload: graphLayout,
      });
    });



    it('persists Graph Section presentation and bounds updates', async () => {
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
                  x: -140,
                  y: -90,
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
        type: 'UPDATE_GRAPH_LAYOUT_SECTION',
        payload: {
          sectionId: 'section-1',
          updates: {
            color: '#22c55e',
            height: 210,
            icon: 'UI',
            label: 'UI Work',
            width: 320,
            x: -120,
            y: -80,
          },
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'UI Work',
            icon: 'UI',
            color: '#22c55e',
            x: -120,
            y: -80,
            width: 320,
            height: 210,
            collapsed: false,
            updatedAt: expect.any(String),
          },
        },
        ownership: {},
      });
    });



    it('writes Graph Section icon imports and persists only the icon path', async () => {
      const updateConfig = vi.fn((_key: string, _value: unknown) => Promise.resolve());
      const context = createPrimaryMessageContext({
        workspaceFolder: { index: 0, name: 'workspace', uri: vscode.Uri.file('/workspace') },
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
                  x: -140,
                  y: -90,
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
        updateConfig,
      });

      await expect(dispatchGraphViewPrimaryMessage({
        type: 'UPDATE_GRAPH_LAYOUT_SECTION',
        payload: {
          sectionId: 'section-1',
          updates: { icon: '.codegraphy/icons/section-1-section.svg' },
          iconImports: [{
            imagePath: '.codegraphy/icons/section-1-section.svg',
            contentsBase64: 'PHN2Zy8+',
          }],
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.createDirectory).toHaveBeenCalledWith(vscode.Uri.file('/workspace/.codegraphy/icons'));
      expect(context.writeFile).toHaveBeenCalledWith(
        vscode.Uri.file('/workspace/.codegraphy/icons/section-1-section.svg'),
        Uint8Array.from([60, 115, 118, 103, 47, 62]),
      );
      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({
            icon: '.codegraphy/icons/section-1-section.svg',
          }),
        },
        ownership: {},
      });
      expect(JSON.stringify(updateConfig.mock.calls.at(-1)?.[1])).not.toContain('data:image');
    });



    it('persists an empty Graph Section label while editing', async () => {
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
                  x: -140,
                  y: -90,
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
        type: 'UPDATE_GRAPH_LAYOUT_SECTION',
        payload: {
          sectionId: 'section-1',
          updates: { label: '' },
        },
      }, context)).resolves.toEqual({ handled: true });

      expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
        collapsedNodes: {},
        pinnedNodes: {},
        sections: {
          'section-1': expect.objectContaining({ label: '' }),
        },
        ownership: {},
      });
    });
});
