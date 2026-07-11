import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { resolveGraphViewProviderWebviewView } from '../../../../../src/extension/graphView/provider/webview/resolve';

function createView(visible = true): vscode.WebviewView {
  return {
    viewType: 'codegraphy.graphView',
    webview: { options: {}, html: '' },
    visible,
    onDidChangeVisibility: vi.fn(() => ({ dispose: vi.fn() })),
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
  } as unknown as vscode.WebviewView;
}

function createDependencies(overrides: Record<string, unknown> = {}) {
  return {
    createHtml: vi.fn(() => '<graph html />'),
    executeCommand: vi.fn(() => Promise.resolve(undefined)),
    resolveWebviewView: vi.fn(),
    setWebviewMessageListener: vi.fn(),
    ...overrides,
  };
}

function createSource() {
  return {
    _extensionUri: vscode.Uri.file('/test/extension'),
    _view: undefined as vscode.WebviewView | undefined,
    _getLocalResourceRoots: vi.fn(() => [vscode.Uri.file('/test/root')]),
    flushPendingWorkspaceRefresh: vi.fn(),
  };
}

describe('graphView/provider/webview/resolve', () => {
  it('titles the graph view with the workspace name', () => {
    const view = createView();
    resolveGraphViewProviderWebviewView(
      createSource(),
      createDependencies({ getWorkspaceTitle: vi.fn(() => 'CodeGraphyV4') }),
      view,
    );

    expect(view.title).toBe('CodeGraphyV4');
  });

  it('uses the graph fallback title without a workspace', () => {
    const view = createView();
    resolveGraphViewProviderWebviewView(
      createSource(),
      createDependencies({ getWorkspaceTitle: vi.fn(() => undefined) }),
      view,
    );

    expect(view.title).toBe('Graph');
  });

  it('wires the graph webview and clears only the disposed instance', () => {
    let disposeListener: (() => void) | undefined;
    const view = createView();
    (view as unknown as { onDidDispose: typeof view.onDidDispose }).onDidDispose = vi.fn(listener => {
      disposeListener = listener;
      return { dispose: vi.fn() };
    });
    const source = createSource();
    const createHtml = vi.fn(() => '<graph html />');
    const executeCommand = vi.fn(() => Promise.resolve(undefined));
    const setWebviewMessageListener = vi.fn();
    const resolveWebviewView = vi.fn((_view, options) => {
      options.getLocalResourceRoots();
      options.setWebviewMessageListener(view.webview);
      options.getHtml(view.webview);
      options.executeCommand('setContext', 'codegraphy.viewVisible', true);
    });

    resolveGraphViewProviderWebviewView(source, {
      createHtml,
      executeCommand,
      resolveWebviewView,
      setWebviewMessageListener,
    }, view);

    expect(source._view).toBe(view);
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, view.webview);
    expect(setWebviewMessageListener).toHaveBeenCalledWith(view.webview, source);
    expect(executeCommand).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', true);
    expect(source.flushPendingWorkspaceRefresh).toHaveBeenCalledOnce();

    source._view = createView();
    disposeListener?.();
    expect(source._view).not.toBeUndefined();
  });

  it('clears the active graph view when it is disposed', () => {
    let disposeListener: (() => void) | undefined;
    const view = createView();
    (view as unknown as { onDidDispose: typeof view.onDidDispose }).onDidDispose = vi.fn(listener => {
      disposeListener = listener;
      return { dispose: vi.fn() };
    });
    const source = createSource();

    resolveGraphViewProviderWebviewView(source, createDependencies(), view);
    disposeListener?.();

    expect(source._view).toBeUndefined();
  });

  it('flushes pending refreshes only after the graph becomes visible', () => {
    let visibilityListener: (() => void) | undefined;
    const view = createView(false);
    (view as unknown as {
      onDidChangeVisibility: typeof view.onDidChangeVisibility;
    }).onDidChangeVisibility = vi.fn(listener => {
      visibilityListener = listener;
      return { dispose: vi.fn() };
    });
    const source = createSource();

    resolveGraphViewProviderWebviewView(source, createDependencies(), view);
    expect(source.flushPendingWorkspaceRefresh).not.toHaveBeenCalled();

    (view as { visible: boolean }).visible = true;
    visibilityListener?.();
    expect(source.flushPendingWorkspaceRefresh).toHaveBeenCalledOnce();
  });
});
