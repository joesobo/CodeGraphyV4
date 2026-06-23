import { describe, expect, it, vi } from 'vitest';
import { resolveGraphViewWebviewView } from '../../../../src/extension/graphView/webview/resolve';

describe('graphView/webview/resolve', () => {
  it('configures the webview, registers the message listener, and sets the initial visibility context', () => {
    const setWebviewMessageListener = vi.fn();
    const executeCommand = vi.fn(() => Promise.resolve());
    let visibilityHandler: (() => void) | undefined;
    const webviewView = {
      visible: false,
      webview: {
        options: {},
        html: '',
      },
      onDidChangeVisibility: vi.fn((handler: () => void) => {
        visibilityHandler = handler;
        return { dispose: () => {} };
      }),
    };

    resolveGraphViewWebviewView(webviewView as never, {
      getLocalResourceRoots: () => ['/workspace'],
      setWebviewMessageListener,
      getHtml: () => '<div id="root"></div>',
      executeCommand,
    });

    expect(webviewView.webview.options).toEqual({
      enableScripts: true,
      localResourceRoots: ['/workspace'],
      retainContextWhenHidden: true,
    });
    expect(setWebviewMessageListener).toHaveBeenCalledWith(webviewView.webview);
    expect(webviewView.webview.html).toBe('<div id="root"></div>');
    expect(executeCommand).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', false);
    expect(visibilityHandler).toBeTypeOf('function');
  });

  it('records timing markers around resolver startup work', () => {
    const recordPerformanceEvent = vi.fn();
    const webviewView = {
      visible: true,
      webview: {
        options: {},
        html: '',
      },
      onDidChangeVisibility: vi.fn(() => ({ dispose: () => {} })),
    };

    resolveGraphViewWebviewView(webviewView as never, {
      getLocalResourceRoots: () => ['/workspace'],
      setWebviewMessageListener: vi.fn(),
      getHtml: () => '<div id="root"></div>',
      executeCommand: vi.fn(() => Promise.resolve()),
      recordPerformanceEvent,
    });

    expect(recordPerformanceEvent.mock.calls.map(([name]) => name)).toEqual([
      'graphWebview.resolve.start',
      'graphWebview.options.start',
      'graphWebview.options.end',
      'graphWebview.listener.start',
      'graphWebview.listener.end',
      'graphWebview.html.start',
      'graphWebview.html.assigned',
      'graphWebview.context.initial',
      'graphWebview.resolve.end',
    ]);
    expect(recordPerformanceEvent).toHaveBeenCalledWith(
      'graphWebview.resolve.start',
      { visible: true },
    );
    expect(recordPerformanceEvent).toHaveBeenCalledWith(
      'graphWebview.options.end',
      { localResourceRootCount: 1 },
    );
    expect(recordPerformanceEvent).toHaveBeenCalledWith(
      'graphWebview.html.assigned',
      { htmlLength: 21 },
    );
  });

  it('updates visibility context without triggering reload work when the view becomes visible again', () => {
    const executeCommand = vi.fn(() => Promise.resolve());
    let visibilityHandler: (() => void) | undefined;
    const webviewView = {
      visible: true,
      webview: {
        options: {},
        html: '',
      },
      onDidChangeVisibility: vi.fn((handler: () => void) => {
        visibilityHandler = handler;
        return { dispose: () => {} };
      }),
    };

    resolveGraphViewWebviewView(webviewView as never, {
      getLocalResourceRoots: () => ['/workspace'],
      setWebviewMessageListener: vi.fn(),
      getHtml: () => '<div id="root"></div>',
      executeCommand,
    });

    visibilityHandler?.();

    expect(executeCommand).toHaveBeenCalledTimes(2);
    expect(executeCommand).toHaveBeenLastCalledWith('setContext', 'codegraphy.viewVisible', true);
  });

  it('updates visibility context while the view stays hidden', () => {
    const executeCommand = vi.fn(() => Promise.resolve());
    let visibilityHandler: (() => void) | undefined;
    const webviewView = {
      visible: false,
      webview: {
        options: {},
        html: '',
      },
      onDidChangeVisibility: vi.fn((handler: () => void) => {
        visibilityHandler = handler;
        return { dispose: () => {} };
      }),
    };

    resolveGraphViewWebviewView(webviewView as never, {
      getLocalResourceRoots: () => ['/workspace'],
      setWebviewMessageListener: vi.fn(),
      getHtml: () => '<div id="root"></div>',
      executeCommand,
    });

    visibilityHandler?.();

    expect(executeCommand).toHaveBeenCalledTimes(2);
    expect(executeCommand).toHaveBeenLastCalledWith('setContext', 'codegraphy.viewVisible', false);
  });
});
