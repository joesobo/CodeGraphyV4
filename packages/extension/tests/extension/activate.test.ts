import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../src/extension/activate';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

function makeMockContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: () => undefined,
      update: () => Promise.resolve(),
    },
  };
}

function getRegisteredProvider(): GraphViewProvider {
  return (
    vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls[0]?.[1] as GraphViewProvider;
}

describe('activate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (vscode.extensions as unknown as { all: unknown[] }).all = [];
  });

  it('dispatches webview messages through the provider', async () => {
    const api = activate(makeMockContext() as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const dispatchSpy = vi
      .spyOn(provider, 'dispatchWebviewMessage')
      .mockResolvedValue(undefined);
    const message = { type: 'WEBVIEW_READY' } as const;

    await expect(api.dispatchWebviewMessage(message as never)).resolves.toBeUndefined();
    expect(dispatchSpy).toHaveBeenCalledWith(message);
  });

  it('exposes refresh hooks for extension e2e tests', async () => {
    const api = activate(makeMockContext() as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const refreshSpy = vi.spyOn(provider, 'refresh').mockResolvedValue(undefined);
    const refreshSettingsSpy = vi.spyOn(provider, 'refreshSettings').mockReturnValue(undefined);

    await expect(api.refresh()).resolves.toBeUndefined();
    api.refreshSettings();

    expect(refreshSpy).toHaveBeenCalledOnce();
    expect(refreshSettingsSpy).toHaveBeenCalledOnce();
  });

  it('registers extension message listeners through the provider', () => {
    const api = activate(makeMockContext() as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const disposable = { dispose: vi.fn() };
    const handler = vi.fn();

    const onExtensionMessageSpy = vi
      .spyOn(provider, 'onExtensionMessage')
      .mockReturnValue(disposable);

    expect(api.onExtensionMessage(handler)).toBe(disposable);
    expect(onExtensionMessageSpy).toHaveBeenCalledWith(handler);
  });

  it('delegates graph queries through the provider', () => {
    const api = activate(makeMockContext() as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const query = { report: 'nodes' as const, arguments: {} };
    const queryGraphSpy = vi.spyOn(provider, 'queryGraph').mockReturnValue({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
      page: { offset: 0, limit: 500, returned: 1, total: 1, nextOffset: null },
    });

    expect(api.queryGraph(query)).toEqual({
      nodes: [{ path: 'src/app.ts', nodeType: 'file' }],
      page: { offset: 0, limit: 500, returned: 1, total: 1, nextOffset: null },
    });
    expect(queryGraphSpy).toHaveBeenCalledWith(query);
  });

  it('does not activate VS Code extensions that depend on CodeGraphy', () => {
    const activateDependentExtension = vi.fn(async () => undefined);
    (vscode.extensions as unknown as { all: unknown[] }).all = [
      {
        id: 'codegraphy.codegraphy-typescript',
        isActive: false,
        packageJSON: {
          extensionDependencies: ['codegraphy.codegraphy'],
        },
        activate: activateDependentExtension,
      },
    ];

    activate(makeMockContext() as unknown as vscode.ExtensionContext);

    expect(activateDependentExtension).not.toHaveBeenCalled();
  });

  it('emits verbose lifecycle diagnostics during activation when enabled', () => {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn(<T>(key: string, defaultValue: T) =>
        key === 'verboseDiagnostics' ? true as T : defaultValue
      ),
      inspect: vi.fn(() => undefined),
      update: vi.fn(),
    } as never);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    activate(makeMockContext() as unknown as vscode.ExtensionContext);

    const diagnosticLines = log.mock.calls
      .map(call => call[0])
      .filter(line => typeof line === 'string' && line.startsWith('[CodeGraphy] Activation'));
    expect(diagnosticLines).toEqual([
      '[CodeGraphy] Activation started: area=extension.lifecycle, workspaceFolders=0',
      '[CodeGraphy] Activation completed: area=extension.lifecycle, registeredWebviewProviders=1',
    ]);

    log.mockRestore();
  });
});
