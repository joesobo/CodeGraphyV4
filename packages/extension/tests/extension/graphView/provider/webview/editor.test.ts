import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { openGraphViewProviderWebviewInEditor } from '../../../../../src/extension/graphView/provider/webview/editor';

describe('graphView/provider/webview/editor', () => {
  it('opens a graph webview panel and keeps panel state in sync', () => {
    const panel = {
      id: 'panel-1',
      webview: {
        onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      },
      onDidDispose: vi.fn(listener => {
        listener();
        return { dispose: vi.fn() };
      }),
    } as unknown as vscode.WebviewPanel;
    const createPanel = vi.fn(() => panel);
    const createHtml = vi.fn(() => '<graph html />');
    const setWebviewMessageListener = vi.fn();
    const openInEditor = vi.fn(options => {
      const nextPanel = options.createPanel('codegraphy.graphView', 'CodeGraphy', vscode.ViewColumn.Beside, {
        enableScripts: true,
        localResourceRoots: [{ fsPath: '/test/root' }],
        retainContextWhenHidden: true,
      } as never);
      options.setWebviewMessageListener(nextPanel.webview as never);
      options.getHtmlForWebview(nextPanel.webview as never);
      options.registerPanel(nextPanel);
      options.unregisterPanel(nextPanel);
    });
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _timelineView: undefined,
      _panels: [],
      _getLocalResourceRoots: vi.fn(() => [vscode.Uri.file('/test/root')]),
    };

    openGraphViewProviderWebviewInEditor(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml,
      createPanel,
      openInEditor,
      setWebviewMessageListener,
    });

    expect(openInEditor).toHaveBeenCalledOnce();
    expect(createPanel).toHaveBeenCalledWith(
      'codegraphy.graphView',
      'CodeGraphy',
      vscode.ViewColumn.Beside,
      expect.objectContaining({
        enableScripts: true,
        localResourceRoots: expect.arrayContaining([
          expect.objectContaining({ fsPath: '/test/root' }),
        ]),
        retainContextWhenHidden: true,
      }),
    );
    expect(setWebviewMessageListener).toHaveBeenCalledWith(panel.webview, source);
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, panel.webview, 'graph');
    expect(source._panels).toEqual([]);
  });

  it('reuses an existing registered panel when opening from the sidebar again', () => {
    const existingPanel = {
      reveal: vi.fn(),
    } as unknown as vscode.WebviewPanel;
    const createPanel = vi.fn();
    const openInEditor = vi.fn(options => {
      options.getPanels()[0]?.reveal?.(vscode.ViewColumn.Beside);
    });
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _timelineView: undefined,
      _panels: [existingPanel],
      _getLocalResourceRoots: vi.fn(() => [vscode.Uri.file('/test/root')]),
    };

    openGraphViewProviderWebviewInEditor(source as never, {
      viewType: 'codegraphy.graphView',
      createHtml: vi.fn(() => '<graph html />'),
      createPanel,
      openInEditor,
      setWebviewMessageListener: vi.fn(),
    });

    expect(openInEditor).toHaveBeenCalledOnce();
    expect(existingPanel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.Beside);
    expect(createPanel).not.toHaveBeenCalled();
  });
});
