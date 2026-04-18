import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGroup } from '../../../../src/shared/settings/groups';
import type { IViewContext } from '../../../../src/core/views/contracts';
import {
  sendGraphViewDepthState,
  sendGraphViewLegendsUpdated,
} from '../../../../src/extension/graphView/view/broadcast';

describe('graphView/view/broadcast', () => {
  it('sends depth mode and the current depth limit', () => {
    const sendMessage = vi.fn();

    sendGraphViewDepthState(
      { activePlugins: new Set(['plugin.alpha']), depthLimit: 3 } satisfies IViewContext,
      false,
      { nodes: [], edges: [] },
      1,
      sendMessage,
    );

    expect(sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: false },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 3 },
    });
    expect(sendMessage).toHaveBeenNthCalledWith(3, {
      type: 'DEPTH_LIMIT_RANGE_UPDATED',
      payload: { maxDepthLimit: 10 },
    });
  });

  it('builds the legends-updated payload with webview image urls', () => {
    const legends: IGroup[] = [
      { id: 'plugin:test:src/**', pattern: 'src/**', color: '#112233', imagePath: 'icons/test.svg' },
    ];
    const registerPluginRoots = vi.fn();
    const sendMessage = vi.fn();

    sendGraphViewLegendsUpdated(
      legends,
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
      type: 'LEGENDS_UPDATED',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'plugin:test:src/**',
            imageUrl: '/resolved/icons/test.svg',
          }),
        ],
      },
    });
  });

  it('prefers the active view webview for workspace-relative group images', () => {
    const sendMessage = vi.fn();
    const viewAsWebviewUri = vi.fn((value: { fsPath: string }) => ({
      toString: () => `view:${value.fsPath}`,
    }));

    sendGraphViewLegendsUpdated(
      [
        {
          id: 'user-group',
          pattern: 'src/**',
          color: '#112233',
          imagePath: '.codegraphy/assets/icon.png',
        },
      ],
      {
        registerPluginRoots: vi.fn(),
        workspaceFolder: { uri: vscode.Uri.file('/test/workspace') } as never,
        view: { webview: { asWebviewUri: viewAsWebviewUri } } as never,
        panels: [],
        resolvePluginAssetPath: vi.fn(),
      },
      sendMessage,
    );

    expect(viewAsWebviewUri).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'LEGENDS_UPDATED',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'user-group',
            imageUrl: 'view:/test/workspace/.codegraphy/assets/icon.png',
          }),
        ],
      },
    });
  });

  it('falls back to the first panel webview for workspace-relative group images', () => {
    const sendMessage = vi.fn();
    const panelAsWebviewUri = vi.fn((value: { fsPath: string }) => ({
      toString: () => `panel:${value.fsPath}`,
    }));

    sendGraphViewLegendsUpdated(
      [
        {
          id: 'user-group',
          pattern: 'src/**',
          color: '#112233',
          imagePath: '.codegraphy/assets/icon.png',
        },
      ],
      {
        registerPluginRoots: vi.fn(),
        workspaceFolder: { uri: vscode.Uri.file('/test/workspace') } as never,
        view: undefined,
        panels: [{ webview: { asWebviewUri: panelAsWebviewUri } }] as never,
        resolvePluginAssetPath: vi.fn(),
      },
      sendMessage,
    );

    expect(panelAsWebviewUri).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'LEGENDS_UPDATED',
      payload: {
        legends: [
          expect.objectContaining({
            id: 'user-group',
            imageUrl: 'panel:/test/workspace/.codegraphy/assets/icon.png',
          }),
        ],
      },
    });
  });
});
