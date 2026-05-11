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
          '2D': { x: 12, y: -24 },
        },
      },
    });
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_LAYOUT_UPDATED',
      payload: {
        pinnedNodes: {
          'src/app.ts': {
            nodeId: 'src/app.ts',
            '2D': { x: 12, y: -24 },
          },
        },
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
                '2D': { x: 12, y: -24 },
              },
            },
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
    });
    expect(context.sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_LAYOUT_UPDATED',
      payload: {
        pinnedNodes: {},
      },
    });
  });
});
