import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { resolveGraphViewProviderWebviewView } from '../../../../../src/extension/graphView/provider/webview/resolve';

describe('graphView/provider/webview/resolve', () => {
  it('resolves the graph view and clears it on dispose', () => {
    let disposeListener: (() => void) | undefined;
    const resourceRoots = [vscode.Uri.file('/test/root')];
    const webview = {
      options: {},
      html: '',
    } as unknown as vscode.Webview;
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview,
      visible: true,
      onDidChangeVisibility: vi.fn(() => undefined),
      onDidDispose: vi.fn(listener => {
        disposeListener = listener;
        return { dispose: vi.fn() };
      }),
    } as unknown as vscode.WebviewView;
    const createHtml = vi.fn(() => '<graph html />');
    const executeCommand = vi.fn(() => Promise.resolve(undefined));
    const setWebviewMessageListener = vi.fn();
    const resolveWebviewView = vi.fn((_view, options) => {
      options.getLocalResourceRoots();
      options.setWebviewMessageListener(webview);
      options.getHtml(webview);
      options.executeCommand('setContext', 'codegraphy.viewVisible', true);
    });
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _timelineView: webviewView,
      _getLocalResourceRoots: vi.fn(() => resourceRoots),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml,
      executeCommand,
      resolveWebviewView,
      setWebviewMessageListener,
    }, webviewView);

    expect(source._view).toBe(webviewView);
    expect(resolveWebviewView).toHaveBeenCalledOnce();
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, webview, 'graph');
    expect(setWebviewMessageListener).toHaveBeenCalledWith(webview, source);
    expect(executeCommand).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', true);
    expect(source.flushPendingWorkspaceRefresh).toHaveBeenCalledOnce();

    disposeListener?.();

    expect(source._view).toBeUndefined();
    expect(source._timelineView).toBe(webviewView);
  });

  it('keeps a different timeline view attached when the graph view disposes', () => {
    let disposeListener: (() => void) | undefined;
    const resourceRoots = [vscode.Uri.file('/test/root')];
    const webview = {
      options: {},
      html: '',
    } as unknown as vscode.Webview;
    const webviewView = {
      viewType: 'codegraphy.graphView',
      webview,
      visible: true,
      onDidChangeVisibility: vi.fn(() => undefined),
      onDidDispose: vi.fn(listener => {
        disposeListener = listener;
        return { dispose: vi.fn() };
      }),
    } as unknown as vscode.WebviewView;
    const otherTimelineView = { viewType: 'codegraphy.timelineView' } as unknown as vscode.WebviewView;
    const resolveWebviewView = vi.fn((_view, options) => {
      options.getLocalResourceRoots();
      options.getHtml(webview);
    });
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: undefined,
      _timelineView: otherTimelineView,
      _getLocalResourceRoots: vi.fn(() => resourceRoots),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml: vi.fn(() => '<graph html />'),
      executeCommand: vi.fn(() => Promise.resolve(undefined)),
      resolveWebviewView,
      setWebviewMessageListener: vi.fn(),
    }, webviewView);

    disposeListener?.();

    expect(source._timelineView).toBe(otherTimelineView);
  });

  it('resolves the timeline view independently', () => {
    let disposeListener: (() => void) | undefined;
    const webview = {
      options: {},
      html: '',
    } as unknown as vscode.Webview;
    const webviewView = {
      viewType: 'codegraphy.timelineView',
      webview,
      visible: true,
      onDidChangeVisibility: vi.fn(() => undefined),
      onDidDispose: vi.fn(listener => {
        disposeListener = listener;
        return { dispose: vi.fn() };
      }),
    } as unknown as vscode.WebviewView;
    const createHtml = vi.fn(() => '<timeline html />');
    const resolveWebviewView = vi.fn((_view, options) => {
      options.getHtml(webview);
    });
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: webviewView,
      _timelineView: undefined,
      _getLocalResourceRoots: vi.fn(() => []),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml,
      executeCommand: vi.fn(() => Promise.resolve(undefined)),
      resolveWebviewView,
      setWebviewMessageListener: vi.fn(),
    }, webviewView);

    expect(source._timelineView).toBe(webviewView);
    expect(createHtml).toHaveBeenCalledWith(source._extensionUri, webview, 'timeline');
    expect(source.flushPendingWorkspaceRefresh).toHaveBeenCalledOnce();

    disposeListener?.();

    expect(source._timelineView).toBeUndefined();
    expect(source._view).toBe(webviewView);
  });

  it('keeps a different graph view attached when the timeline view disposes', () => {
    let disposeListener: (() => void) | undefined;
    const webview = {
      options: {},
      html: '',
    } as unknown as vscode.Webview;
    const webviewView = {
      viewType: 'codegraphy.timelineView',
      webview,
      visible: true,
      onDidChangeVisibility: vi.fn(() => undefined),
      onDidDispose: vi.fn(listener => {
        disposeListener = listener;
        return { dispose: vi.fn() };
      }),
    } as unknown as vscode.WebviewView;
    const otherGraphView = { viewType: 'codegraphy.graphView' } as unknown as vscode.WebviewView;
    const resolveWebviewView = vi.fn((_view, options) => {
      options.getHtml(webview);
    });
    const source = {
      _extensionUri: vscode.Uri.file('/test/extension'),
      _view: otherGraphView,
      _timelineView: undefined,
      _getLocalResourceRoots: vi.fn(() => []),
      flushPendingWorkspaceRefresh: vi.fn(),
    };

    resolveGraphViewProviderWebviewView(source as never, {
      createHtml: vi.fn(() => '<timeline html />'),
      executeCommand: vi.fn(() => Promise.resolve(undefined)),
      resolveWebviewView,
      setWebviewMessageListener: vi.fn(),
    }, webviewView);

    disposeListener?.();

    expect(source._view).toBe(otherGraphView);
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
      _timelineView: undefined,
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
