import * as vscode from 'vscode';
import { expect, vi } from 'vitest';

import { GraphViewProvider } from '../../../src/extension/graphViewProvider';

export interface InputBoxCall {
  options?: vscode.InputBoxOptions;
  resolveValue?: string;
}

export interface GraphViewProviderTestHarness {
  readonly inputBoxCalls: InputBoxCall[];
  readonly mockContext: {
    subscriptions: { dispose: () => void }[];
    extensionUri: vscode.Uri;
    workspaceState: {
      get: <T>(_key: string) => T | undefined;
      update: (_key: string, _value: unknown) => Thenable<void>;
    };
  };
  readonly provider: GraphViewProvider;
  createResolvedWebview: () => {
    mockWebview: {
      options: Record<string, unknown>;
      html: string;
      onDidReceiveMessage: ReturnType<typeof vi.fn>;
      postMessage: ReturnType<typeof vi.fn>;
      asWebviewUri: ReturnType<typeof vi.fn>;
      cspSource: string;
    };
    getMessageHandler: () => (message: unknown) => Promise<void>;
  };
  recreateProvider: (workspaceState?: GraphViewProviderTestHarness['mockContext']['workspaceState']) => GraphViewProvider;
}

export function deferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export function createGraphViewProviderTestHarness(): GraphViewProviderTestHarness {
  const inputBoxCalls: InputBoxCall[] = [];
  const mutableWindow = vscode.window as unknown as Record<string, unknown>;
  const mutableWorkspaceFs = vscode.workspace.fs as unknown as Record<string, unknown>;

  mutableWindow.showInputBox = vi.fn(async (options?: vscode.InputBoxOptions) => {
    inputBoxCalls.push({ options });
    return undefined;
  });
  mutableWindow.showWarningMessage = vi.fn();
  Object.defineProperty(vscode, 'env', {
    value: {
      clipboard: {
        writeText: vi.fn(),
      },
    },
    configurable: true,
  });

  mutableWorkspaceFs.rename = vi.fn();
  mutableWorkspaceFs.delete = vi.fn();
  mutableWorkspaceFs.writeFile = vi.fn();

  Object.defineProperty(vscode.workspace, 'workspaceFolders', {
    get: () => [{ uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 }],
    configurable: true,
  });

  const mockContext: GraphViewProviderTestHarness['mockContext'] = {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: <T>(_key: string) => undefined as T | undefined,
      update: (_key: string, _value: unknown) => Promise.resolve(),
    },
  };

  let provider = new GraphViewProvider(
    mockContext.extensionUri,
    mockContext as unknown as vscode.ExtensionContext
  );

  function recreateProvider(
    workspaceState: GraphViewProviderTestHarness['mockContext']['workspaceState'] = mockContext.workspaceState
  ) {
    mockContext.workspaceState = workspaceState;
    provider = new GraphViewProvider(
      mockContext.extensionUri,
      mockContext as unknown as vscode.ExtensionContext
    );
    return provider;
  }

  function createResolvedWebview() {
    let messageHandler: ((message: unknown) => Promise<void>) | null = null;

    const mockWebview = {
      options: {},
      html: '',
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
      postMessage: vi.fn(),
      asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
      cspSource: 'test-csp',
    };

    const mockView = {
      webview: mockWebview,
      visible: true,
      onDidChangeVisibility: vi.fn(() => ({ dispose: () => {} })),
      onDidDispose: vi.fn(() => ({ dispose: () => {} })),
      show: vi.fn(),
    };

    provider.resolveWebviewView(
      mockView as unknown as vscode.WebviewView,
      {} as vscode.WebviewViewResolveContext,
      { isCancellationRequested: false, onCancellationRequested: vi.fn() } as unknown as vscode.CancellationToken
    );

    return {
      mockWebview,
      getMessageHandler: () => {
        expect(messageHandler).not.toBeNull();
        return messageHandler!;
      },
    };
  }

  return {
    inputBoxCalls,
    mockContext,
    get provider() {
      return provider;
    },
    createResolvedWebview,
    recreateProvider,
  };
}
