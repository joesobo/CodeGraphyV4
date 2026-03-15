import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../src/shared/types';
import { ViewRegistry, type IViewContext, coreViews } from '../../../src/core/views';
import {
  sendGraphViewAvailableViews,
  sendGraphViewGroupsUpdated,
} from '../../../src/extension/graphView/viewBroadcast';

describe('graph view broadcast helpers', () => {
  it('sends available views and the current depth limit', () => {
    const viewRegistry = new ViewRegistry();
    for (const view of coreViews) {
      viewRegistry.register(view, { core: true, isDefault: view.id === 'codegraphy.connections' });
    }
    const sendMessage = vi.fn();

    sendGraphViewAvailableViews(
      viewRegistry,
      { activePlugins: new Set(['plugin.alpha']), depthLimit: 3 } satisfies IViewContext,
      'codegraphy.connections',
      1,
      sendMessage,
    );

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'VIEWS_UPDATED',
      payload: {
        views: expect.any(Array),
        activeViewId: 'codegraphy.connections',
      },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 3 },
    });
  });

  it('builds the groups-updated payload with webview image urls', () => {
    const groups: IGroup[] = [
      { id: 'plugin:test:src/**', pattern: 'src/**', color: '#112233', imagePath: 'icons/test.svg' },
    ];
    const registerPluginRoots = vi.fn();
    const sendMessage = vi.fn();

    sendGraphViewGroupsUpdated(
      groups,
      {
        registerPluginRoots,
        workspaceFolder: undefined,
        view: undefined,
        panels: [{ webview: { asWebviewUri: vi.fn((value: { toString(): string }) => ({ toString: () => value.toString() })) } }] as never,
        resolvePluginAssetPath: assetPath => `/resolved/${assetPath}`,
      },
      sendMessage,
    );

    expect(registerPluginRoots).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GROUPS_UPDATED',
      payload: {
        groups: [
          expect.objectContaining({
            id: 'plugin:test:src/**',
            imageUrl: '/resolved/icons/test.svg',
          }),
        ],
      },
    });
  });
});
