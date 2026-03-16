import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getGraphViewWebviewResourceRoots,
  refreshGraphViewResourceRoots,
  resolveGraphViewPluginAssetPath,
  sendGraphViewContextMenuItems,
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
  sendGraphViewPluginWebviewInjections,
} from '../../../src/extension/graphView/pluginWebview';

describe('graphView/pluginWebview', () => {
  it('skips plugin status updates when no analyzer is available', () => {
    const sendMessage = vi.fn();

    sendGraphViewPluginStatuses(undefined, new Set(), new Set(), sendMessage);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends plugin status updates when an analyzer exists', () => {
    const sendMessage = vi.fn();

    sendGraphViewPluginStatuses(
      {
        getPluginStatuses: vi.fn(() => [{ id: 'plugin.test', enabled: true }]),
      },
      new Set(['plugin.test:rule']),
      new Set(['plugin.disabled']),
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [{ id: 'plugin.test', enabled: true }] },
    });
  });

  it('sends merged decoration payloads', () => {
    const sendMessage = vi.fn();

    sendGraphViewDecorations(
      {
        getMergedNodeDecorations: () =>
          new Map([['src/app.ts', { color: '#ffffff', priority: 1 }]]),
        getMergedEdgeDecorations: () =>
          new Map([['src/app.ts->src/lib.ts', { color: '#000000', priority: 1 }]]),
      },
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'DECORATIONS_UPDATED',
      payload: {
        nodeDecorations: {
          'src/app.ts': { color: '#ffffff' },
        },
        edgeDecorations: {
          'src/app.ts->src/lib.ts': { color: '#000000' },
        },
      },
    });
  });

  it('sends collected plugin context menu items', () => {
    const sendMessage = vi.fn();

    sendGraphViewContextMenuItems(
      {
        registry: {
          list: () => [{ plugin: { id: 'plugin.test' } }],
          getPluginAPI: () => ({
            contextMenuItems: [{ label: 'Inspect', when: 'node' as const }],
          }),
        },
      },
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'CONTEXT_MENU_ITEMS',
      payload: {
        items: [
          {
            label: 'Inspect',
            when: 'node',
            icon: undefined,
            group: undefined,
            pluginId: 'plugin.test',
            index: 0,
          },
        ],
      },
    });
  });

  it('skips context menu updates when no analyzer is available', () => {
    const sendMessage = vi.fn();

    sendGraphViewContextMenuItems(undefined, sendMessage);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends plugin webview injections with resolved asset paths', () => {
    const sendMessage = vi.fn();
    const resolveAssetPath = vi.fn((assetPath: string, pluginId?: string) => `${pluginId}:${assetPath}`);

    sendGraphViewPluginWebviewInjections(
      {
        registry: {
          list: () => [
            {
              plugin: {
                id: 'plugin.test',
                webviewContributions: {
                  scripts: ['dist/plugin.js'],
                  styles: ['dist/plugin.css'],
                },
              },
            },
          ],
        },
      },
      resolveAssetPath,
      sendMessage,
    );

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'plugin.test',
        scripts: ['plugin.test:dist/plugin.js'],
        styles: ['plugin.test:dist/plugin.css'],
      },
    });
  });

  it('skips plugin webview injections when no analyzer is available', () => {
    const sendMessage = vi.fn();
    const resolveAssetPath = vi.fn();

    sendGraphViewPluginWebviewInjections(undefined, resolveAssetPath, sendMessage);

    expect(resolveAssetPath).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('refreshes local resource roots across the sidebar view and editor panels', () => {
    const roots = [
      vscode.Uri.file('/test/extension'),
      vscode.Uri.file('/test/workspace'),
    ];
    const view = { webview: { options: { enableScripts: true } } };
    const panel = { webview: { options: { enableScripts: true } } };

    refreshGraphViewResourceRoots(
      view as unknown as vscode.WebviewView,
      [panel as unknown as vscode.WebviewPanel],
      roots,
    );

    expect(view.webview.options).toEqual({
      enableScripts: true,
      localResourceRoots: roots,
    });
    expect(panel.webview.options).toEqual({
      enableScripts: true,
      localResourceRoots: roots,
    });
  });

  it('resolves plugin assets against the current webview and known extension roots', () => {
    const webview = {
      asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
    };

    expect(
      resolveGraphViewPluginAssetPath(
        'dist/plugin.js',
        vscode.Uri.file('/test/extension'),
        new Map([['plugin.test', vscode.Uri.file('/test/external-extension')]]),
        { webview } as unknown as vscode.WebviewView,
        [],
        'plugin.test',
      ),
    ).toBe('webview:/test/external-extension/dist/plugin.js');
  });

  it('falls back to the first panel webview when no sidebar view exists', () => {
    const panelWebview = {
      asWebviewUri: vi.fn((uri: vscode.Uri) => `panel:${uri.fsPath}`),
    };

    expect(
      resolveGraphViewPluginAssetPath(
        'dist/plugin.js',
        vscode.Uri.file('/test/extension'),
        new Map([['plugin.test', vscode.Uri.file('/test/external-extension')]]),
        undefined,
        [{ webview: panelWebview } as unknown as vscode.WebviewPanel],
        'plugin.test',
      ),
    ).toBe('panel:/test/external-extension/dist/plugin.js');
  });

  it('resolves plugin assets without a webview when neither a sidebar view nor panel exists', () => {
    expect(
      resolveGraphViewPluginAssetPath(
        'dist/plugin.js',
        vscode.Uri.file('/test/extension'),
        new Map([['plugin.test', vscode.Uri.file('/test/external-extension')]]),
        undefined,
        [],
        'plugin.test',
      ),
    ).toBe('/test/external-extension/dist/plugin.js');
  });

  it('returns the combined local resource roots for extension, plugin, and workspace folders', () => {
    expect(
      getGraphViewWebviewResourceRoots(
        vscode.Uri.file('/test/extension'),
        new Map([['plugin.test', vscode.Uri.file('/test/external-extension')]]),
        [{ uri: vscode.Uri.file('/test/workspace') } as vscode.WorkspaceFolder],
      ).map((uri) => uri.fsPath),
    ).toEqual([
      '/test/extension',
      '/test/external-extension',
      '/test/workspace',
    ]);
  });
});
