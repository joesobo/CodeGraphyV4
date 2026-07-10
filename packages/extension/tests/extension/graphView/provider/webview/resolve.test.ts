import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { resolveGraphViewProviderWebviewView } from '../../../../../src/extension/graphView/provider/webview/resolve';

describe('graphView/provider/webview/resolve', () => {
  it('titles the graph view with the current workspace name', () => {
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview: {},
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewView;
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _getLocalResourceRoots: vi.fn(() => []),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml: vi.fn(() => '<graph html />'),
      executeCommand: vi.fn(() => Promise.resolve(undefined)),
      getWorkspaceTitle: vi.fn(() => 'CodeGraphyV4'),
      resolveWebviewView: vi.fn(),
      setWebviewMessageListener: vi.fn(),
    }, webviewView);

    expect(webviewView.title).toBe('CodeGraphyV4');
  });

  it('keeps the graph view fallback title when no workspace is open', () => {
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview: {},
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewView;
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _getLocalResourceRoots: vi.fn(() => []),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml: vi.fn(() => '<graph html />'),
      executeCommand: vi.fn(() => Promise.resolve(undefined)),
      getWorkspaceTitle: vi.fn(() => undefined),
      resolveWebviewView: vi.fn(),
      setWebviewMessageListener: vi.fn(),
    }, webviewView);

    expect(webviewView.title).toBe('Graph');
  });

  it('flushes pending refreshes when a resolved view becomes visible later', () => {
    let visibilityListener: (() => void) | undefined;
    const webview = {
      options: {},
      html: '',
    } as unknown as vscode.Webview;
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview,
      visible: false,
      onDidChangeVisibility: vi.fn(listener => {
        visibilityListener = listener;
        return { dispose: vi.fn() };
      }),
      onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    } as unknown as vscode.WebviewView;
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _getLocalResourceRoots: vi.fn(() => []),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml: vi.fn(() => '<graph html />'),
      executeCommand: vi.fn(() => Promise.resolve(undefined)),
      resolveWebviewView: vi.fn(),
      setWebviewMessageListener: vi.fn(),
    }, webviewView);

    expect(source.flushPendingWorkspaceRefresh).not.toHaveBeenCalled();

    (webviewView as { visible: boolean }).visible = true;
    visibilityListener?.();

    expect(source.flushPendingWorkspaceRefresh).toHaveBeenCalledOnce();
  });
});
