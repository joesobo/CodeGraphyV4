import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { openGraphViewInEditor } from '../../../src/extension/graphView/editorPanel';

describe('graph view editor panel helper', () => {
  it('opens a panel, sets its icon/html, and unregisters it on dispose', () => {
    let disposeHandler: (() => void) | undefined;
    let viewStateHandler: (() => void) | undefined;
    const postMessage = vi.fn();
    const panel = {
      active: true,
      visible: true,
      webview: { html: '', options: {}, postMessage },
      iconPath: undefined,
      onDidChangeViewState: vi.fn((handler: () => void) => {
        viewStateHandler = handler;
        return { dispose: () => {} };
      }),
      onDidDispose: vi.fn((handler: () => void) => {
        disposeHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const createPanel = vi.fn(() => panel as never);
    const registerPanel = vi.fn();
    const unregisterPanel = vi.fn();

    openGraphViewInEditor({
      column: vscode.ViewColumn.Two,
      viewType: 'codegraphy.graphView',
      extensionUri: vscode.Uri.file('/extension'),
      getPanels: () => [],
      getLocalResourceRoots: () => [vscode.Uri.file('/extension')],
      createPanel,
      setWebviewMessageListener: vi.fn(),
      getHtmlForWebview: () => '<div id="root"></div>',
      registerPanel,
      unregisterPanel,
    });
    panel.visible = false;
    viewStateHandler?.();
    disposeHandler?.();

    expect(createPanel).toHaveBeenCalledWith(
      'codegraphy.graphView',
      'CodeGraphy',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file('/extension')],
        retainContextWhenHidden: true,
      },
    );
    expect(registerPanel).toHaveBeenCalledWith(panel);
    expect(panel.webview.html).toBe('<div id="root"></div>');
    expect(panel.iconPath).toEqual({
      dark: vscode.Uri.file('/extension/assets/icon-dark.svg'),
      light: vscode.Uri.file('/extension/assets/icon-light.svg'),
    });
    expect(unregisterPanel).toHaveBeenCalledWith(panel);
    expect(postMessage).toHaveBeenCalledWith({
      payload: { visible: false },
      type: 'GRAPH_VIEW_VISIBILITY_UPDATED',
    });
  });

  it('reveals an existing editor panel instead of creating a duplicate', () => {
    const existingPanel = {
      reveal: vi.fn(),
    };
    const createPanel = vi.fn();

    openGraphViewInEditor({
      viewType: 'codegraphy.graphView',
      extensionUri: vscode.Uri.file('/extension'),
      getPanels: () => [existingPanel as never],
      getLocalResourceRoots: () => [vscode.Uri.file('/extension')],
      createPanel,
      setWebviewMessageListener: vi.fn(),
      getHtmlForWebview: () => '<div id="root"></div>',
      registerPanel: vi.fn(),
      unregisterPanel: vi.fn(),
    });

    expect(existingPanel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.Beside);
    expect(createPanel).not.toHaveBeenCalled();
  });
});
