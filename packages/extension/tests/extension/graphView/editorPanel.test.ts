import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { openGraphViewInEditor } from '../../../src/extension/graphView/editorPanel';

describe('graph view editor panel helper', () => {
  it('opens a panel, sets its icon/html, and unregisters it on dispose', () => {
    let disposeHandler: (() => void) | undefined;
    const panel = {
      webview: { html: '', options: {} },
      onDidDispose: vi.fn((handler: () => void) => {
        disposeHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const registerPanel = vi.fn();
    const unregisterPanel = vi.fn();

    openGraphViewInEditor({
      viewType: 'codegraphy.graphView',
      extensionUri: vscode.Uri.file('/extension'),
      getLocalResourceRoots: () => [vscode.Uri.file('/extension')],
      createPanel: vi.fn(() => panel as never),
      setWebviewMessageListener: vi.fn(),
      getHtmlForWebview: () => '<div id="root"></div>',
      registerPanel,
      unregisterPanel,
    });
    disposeHandler?.();

    expect(registerPanel).toHaveBeenCalledWith(panel);
    expect(panel.webview.html).toBe('<div id="root"></div>');
    expect(panel.iconPath).toEqual(vscode.Uri.file('/extension/assets/icon.svg'));
    expect(unregisterPanel).toHaveBeenCalledWith(panel);
  });
});
