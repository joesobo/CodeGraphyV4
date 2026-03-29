import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createGraphViewHtml: vi.fn(() => '<default html />'),
  createGraphViewNonce: vi.fn(() => 'nonce-123'),
  openGraphViewInEditor: vi.fn(),
  setGraphViewProviderMessageListener: vi.fn(),
  resolveGraphViewWebviewView: vi.fn(),
  sendGraphViewWebviewMessage: vi.fn(),
  onGraphViewWebviewMessage: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(() => Promise.resolve('executed')),
  createWebviewPanel: vi.fn(() => ({
    id: 'panel-1',
    webview: {
      onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
    },
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
  })),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
    })),
  },
  commands: {
    executeCommand: mocks.executeCommand,
  },
  ViewColumn: {
    Active: 1,
  },
  window: {
    createWebviewPanel: mocks.createWebviewPanel,
  },
}));

vi.mock('../../../../../src/extension/graphView/webview/html', () => ({
  createGraphViewHtml: mocks.createGraphViewHtml,
  createGraphViewNonce: mocks.createGraphViewNonce,
}));

vi.mock('../../../../../src/extension/graphView/editorPanel', () => ({
  openGraphViewInEditor: mocks.openGraphViewInEditor,
}));

vi.mock('../../../../../src/extension/graphView/webview/providerMessages/listener', () => ({
  setGraphViewProviderMessageListener: mocks.setGraphViewProviderMessageListener,
}));

vi.mock('../../../../../src/extension/graphView/webview/resolve', () => ({
  resolveGraphViewWebviewView: mocks.resolveGraphViewWebviewView,
}));

vi.mock('../../../../../src/extension/graphView/webview/bridge', () => ({
  sendGraphViewWebviewMessage: mocks.sendGraphViewWebviewMessage,
  onGraphViewWebviewMessage: mocks.onGraphViewWebviewMessage,
}));

import { createGraphViewProviderWebviewMethods } from '../../../../../src/extension/graphView/provider/webview/host';

describe('graphView/provider/webview/host default dependencies', () => {
  beforeEach(() => {
    mocks.createGraphViewHtml.mockClear();
    mocks.createGraphViewNonce.mockClear();
    mocks.openGraphViewInEditor.mockClear();
    mocks.setGraphViewProviderMessageListener.mockClear();
    mocks.resolveGraphViewWebviewView.mockClear();
    mocks.sendGraphViewWebviewMessage.mockClear();
    mocks.onGraphViewWebviewMessage.mockClear();
    mocks.executeCommand.mockClear();
    mocks.createWebviewPanel.mockClear();
    mocks.onGraphViewWebviewMessage.mockReturnValue({ dispose: vi.fn() });
  });

  it('uses the default sidebar delegates for html, commands, listener wiring, analysis, and logging', async () => {
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const source = {
      _extensionUri: { fsPath: '/test/extension' },
      _view: undefined,
      _panels: [],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => [{ fsPath: '/test/root' }]),
    };
    const webviewView = { webview: {}, visible: true };
    const nextWebview = { kind: 'next-webview' };
    const methods = createGraphViewProviderWebviewMethods(source as never);

    methods.resolveWebviewView(webviewView as never, {} as never, {} as never);

    const options = mocks.resolveGraphViewWebviewView.mock.calls[0]?.[1] as {
      getHtml(webview: unknown): string;
      setWebviewMessageListener(webview: unknown): void;
      executeCommand(command: string, key: string, value: boolean): Promise<unknown>;
      analyzeAndSendData(): Promise<void>;
      log(message: string): void;
    };

    expect(options.getHtml(nextWebview)).toBe('<default html />');
    options.setWebviewMessageListener(nextWebview);
    await expect(options.executeCommand('setContext', 'codegraphy.graphViewVisible', true)).resolves.toBe(
      'executed',
    );
    await options.analyzeAndSendData();
    options.log('sidebar ready');

    expect(mocks.createGraphViewNonce).toHaveBeenCalledOnce();
    expect(mocks.createGraphViewHtml).toHaveBeenCalledWith(source._extensionUri, nextWebview, 'nonce-123');
    expect(mocks.setGraphViewProviderMessageListener).toHaveBeenCalledWith(nextWebview, source);
    expect(mocks.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'codegraphy.graphViewVisible',
      true,
    );
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
    expect(consoleLog).toHaveBeenCalledWith('sidebar ready');

    consoleLog.mockRestore();
  });

  it('uses the default editor-opening delegates for panels, view type, html, and listener wiring', () => {
    const source = {
      _extensionUri: { fsPath: '/test/extension' },
      _view: undefined,
      _panels: [],
      _analyzeAndSendData: vi.fn(async () => undefined),
      _getLocalResourceRoots: vi.fn(() => [{ fsPath: '/test/root' }]),
    };
    const nextWebview = { kind: 'panel-webview' };
    const methods = createGraphViewProviderWebviewMethods(source as never);

    mocks.openGraphViewInEditor.mockImplementation(options => {
      expect(options.viewType).toBe('codegraphy.graphView');
      expect(options.getLocalResourceRoots()).toEqual([{ fsPath: '/test/root' }]);
      expect(
        options.createPanel('codegraphy.graphView', 'CodeGraphy', 2 as never, {
          enableScripts: true,
        } as never),
      ).toEqual(expect.objectContaining({ id: 'panel-1' }));
      options.setWebviewMessageListener(nextWebview as never);
      expect(options.getHtmlForWebview(nextWebview as never)).toBe('<default html />');
    });

    methods.openInEditor();

    expect(mocks.openGraphViewInEditor).toHaveBeenCalledOnce();
    expect(mocks.createWebviewPanel).toHaveBeenCalledWith(
      'codegraphy.graphView',
      'CodeGraphy',
      2,
      { enableScripts: true },
    );
    expect(mocks.setGraphViewProviderMessageListener).toHaveBeenCalledWith(nextWebview, source);
    expect(mocks.createGraphViewNonce).toHaveBeenCalledOnce();
    expect(mocks.createGraphViewHtml).toHaveBeenCalledWith(source._extensionUri, nextWebview, 'nonce-123');
  });
});
