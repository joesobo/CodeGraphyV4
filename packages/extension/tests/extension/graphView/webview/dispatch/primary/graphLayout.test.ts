import { describe, expect, it, vi } from 'vitest';
import { dispatchGraphViewPrimaryMessage } from '../../../../../../src/extension/graphView/webview/dispatch/primary';
import { createPrimaryMessageContext } from '../context';

describe('graphView/webview/dispatch/primary graph layout', () => {
  it('persists an active-mode node pin and echoes the updated graph layout', async () => {
    const context = createPrimaryMessageContext({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'graphLayout') {
          return {
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
      pinnedNodes: {
        'src/app.ts': {
          nodeId: 'src/app.ts',
          twoDimensional: { x: 12, y: -24 },
          updatedAt: expect.any(String),
        },
      },
      sections: {},
      ownership: {},
    });
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_LAYOUT_UPDATED',
      payload: {
        pinnedNodes: {
          'src/app.ts': {
            nodeId: 'src/app.ts',
            twoDimensional: { x: 12, y: -24 },
            updatedAt: expect.any(String),
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
            pinnedNodes: {
              'src/app.ts': {
                nodeId: 'src/app.ts',
                twoDimensional: { x: 12, y: -24 },
                updatedAt: '2026-05-07T08:00:00.000Z',
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
      pinnedNodes: {},
      sections: {},
      ownership: {},
    });
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_LAYOUT_UPDATED',
      payload: {
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
        'section-1': {
          itemId: 'section-1',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: expect.any(String),
        },
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
      }),
    });
  });

  it('persists Graph Section presentation and bounds updates', async () => {
    const context = createPrimaryMessageContext({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'graphLayout') {
          return {
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
            ownership: {
              'section-1': {
                itemId: 'section-1',
                itemKind: 'section',
                ownerSectionId: null,
                updatedAt: '2026-05-07T09:00:00.000Z',
              },
            },
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
          label: 'UI Work',
          width: 320,
          x: -120,
          y: -80,
        },
      },
    }, context)).resolves.toEqual({ handled: true });

    expect(context.updateConfig).toHaveBeenCalledWith('graphLayout', {
      pinnedNodes: {},
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'UI Work',
          color: '#22c55e',
          x: -120,
          y: -80,
          width: 320,
          height: 210,
          collapsed: false,
          updatedAt: expect.any(String),
        },
      },
      ownership: {
        'section-1': {
          itemId: 'section-1',
          itemKind: 'section',
          ownerSectionId: null,
          updatedAt: '2026-05-07T09:00:00.000Z',
        },
      },
    });
  });
});
