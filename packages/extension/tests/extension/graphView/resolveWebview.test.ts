import { describe, expect, it, vi } from 'vitest';
import { resolveGraphViewWebviewView } from '../../../src/extension/graphView/resolveWebview';

describe('graph view resolve-webview helper', () => {
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
      analyzeAndSendData: vi.fn(() => Promise.resolve()),
      log: vi.fn(),
    });

    expect(webviewView.webview.options).toEqual({
      enableScripts: true,
      localResourceRoots: ['/workspace'],
    });
    expect(setWebviewMessageListener).toHaveBeenCalledWith(webviewView.webview);
    expect(webviewView.webview.html).toBe('<div id="root"></div>');
    expect(executeCommand).toHaveBeenCalledWith('setContext', 'codegraphy.viewVisible', false);
    expect(visibilityHandler).toBeTypeOf('function');
  });

  it('re-analyzes when the view becomes visible again', () => {
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const executeCommand = vi.fn(() => Promise.resolve());
    const log = vi.fn();
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
      analyzeAndSendData,
      log,
    });

    visibilityHandler?.();

    expect(executeCommand).toHaveBeenLastCalledWith('setContext', 'codegraphy.viewVisible', true);
    expect(log).toHaveBeenCalledWith('[CodeGraphy] View became visible, re-sending data');
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('does not re-analyze while the view stays hidden', () => {
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
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
      executeCommand: vi.fn(() => Promise.resolve()),
      analyzeAndSendData,
      log: vi.fn(),
    });

    visibilityHandler?.();

    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });
});
