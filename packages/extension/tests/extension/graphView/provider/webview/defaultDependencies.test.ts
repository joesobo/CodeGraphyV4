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

import { createDefaultGraphViewProviderWebviewMethodDependencies } from '../../../../../src/extension/graphView/provider/webview/defaultDependencies';

describe('graphView/provider/webview/defaultDependencies', () => {
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

  it('returns the default graph view delegates', () => {
    const dependencies = createDefaultGraphViewProviderWebviewMethodDependencies();

    expect(dependencies.viewType).toBe('codegraphy.graphView');
    expect(dependencies.resolveWebviewView).toBe(mocks.resolveGraphViewWebviewView);
    expect(dependencies.openInEditor).toBe(mocks.openGraphViewInEditor);
    expect(dependencies.sendWebviewMessage).toBe(mocks.sendGraphViewWebviewMessage);
    expect(dependencies.onWebviewMessage).toBe(mocks.onGraphViewWebviewMessage);
    expect(dependencies.setWebviewMessageListener).toBe(mocks.setGraphViewProviderMessageListener);
  });

  it('creates graph html with a fresh nonce', () => {
    const dependencies = createDefaultGraphViewProviderWebviewMethodDependencies();
    const nextWebview = { kind: 'next-webview' };

    expect(dependencies.createHtml({ fsPath: '/test/extension' } as never, nextWebview as never, 'graph')).toBe(
      '<default html />',
    );

    expect(mocks.createGraphViewNonce).toHaveBeenCalledOnce();
    expect(mocks.createGraphViewHtml).toHaveBeenCalledWith(
      { fsPath: '/test/extension' },
      nextWebview,
      'nonce-123',
      'graph',
    );
  });

  it('forwards command execution and panel creation to vscode', async () => {
    const dependencies = createDefaultGraphViewProviderWebviewMethodDependencies();

    await expect(dependencies.executeCommand('setContext', 'codegraphy.graphViewVisible', true)).resolves.toBe(
      'executed',
    );
    expect(dependencies.createPanel('codegraphy.graphView', 'CodeGraphy', 1 as never, {
      enableScripts: true,
    } as never)).toEqual(expect.objectContaining({ id: 'panel-1' }));

    expect(mocks.executeCommand).toHaveBeenCalledWith(
      'setContext',
      'codegraphy.graphViewVisible',
      true,
    );
    expect(mocks.createWebviewPanel).toHaveBeenCalledWith(
      'codegraphy.graphView',
      'CodeGraphy',
      1,
      { enableScripts: true },
    );
  });
});
