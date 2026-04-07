import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getGraphViewWebviewResourceRoots,
  refreshGraphViewResourceRoots,
  resolveGraphViewPluginAssetPath,
} from '../../../../../src/extension/graphView/webview/plugins/resources';

describe('graphView/webview/plugins/resources', () => {
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

  it('falls back to the first panel webview or a plain path when no sidebar view exists', () => {
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
