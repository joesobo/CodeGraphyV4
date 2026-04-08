import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../../src/extension/activate';
import type { GraphViewProvider } from '../../../src/extension/graphViewProvider';

const fixtureWorkspacePath = path.resolve(__dirname, '../../../test-fixtures/workspace');

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
let installedExtensionsValue: Array<{
  id: string;
  isActive: boolean;
  packageJSON?: { extensionDependencies?: string[] };
  activate: () => Promise<unknown>;
}> = [];

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

Object.defineProperty(vscode.extensions, 'all', {
  get: () => installedExtensionsValue,
  configurable: true,
});

function createContext() {
  return {
    subscriptions: [] as { dispose: () => void }[],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function getRegisteredProvider(): GraphViewProvider {
  return (
    vscode.window.registerWebviewViewProvider as unknown as { mock: { calls: unknown[][] } }
  ).mock.calls[0]?.[1] as GraphViewProvider;
}

function resolveGraphWebview(provider: GraphViewProvider) {
  let messageHandler: ((message: unknown) => Promise<void>) | undefined;
  const mockWebview = {
    options: {},
    html: '',
    onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
      messageHandler = handler;
      return { dispose: () => undefined };
    }),
    postMessage: vi.fn(),
    asWebviewUri: vi.fn((uri: vscode.Uri) => uri),
    cspSource: 'test-csp',
  };

  const mockView = {
    webview: mockWebview,
    visible: true,
    onDidChangeVisibility: vi.fn(() => ({ dispose: () => undefined })),
    onDidDispose: vi.fn(() => ({ dispose: () => undefined })),
    show: vi.fn(),
  };

  provider.resolveWebviewView(
    mockView as unknown as vscode.WebviewView,
    {} as vscode.WebviewViewResolveContext,
    { isCancellationRequested: false, onCancellationRequested: vi.fn() } as never,
  );

  return {
    mockWebview,
    getMessageHandler(): (message: unknown) => Promise<void> {
      expect(messageHandler).toBeDefined();
      return messageHandler!;
    },
  };
}

async function waitForPluginStatuses(
  getMessages: () => Array<{
    type?: string;
    payload?: {
      plugins?: Array<{
        id: string;
        sources: Array<{ qualifiedSourceId: string }>;
      }>;
    };
  }>,
): Promise<Array<{ id: string; sources: Array<{ qualifiedSourceId: string }> }>> {
  const requiredPluginIds = [
    'codegraphy.markdown',
    'codegraphy.typescript',
    'codegraphy.gdscript',
  ];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pluginMessage = getMessages()
      .filter(message => message.type === 'PLUGINS_UPDATED')
      .at(-1);
    const plugins = pluginMessage?.payload?.plugins ?? [];
    const pluginIds = new Set(plugins.map(plugin => plugin.id));

    if (requiredPluginIds.every(pluginId => pluginIds.has(pluginId))) {
      return plugins;
    }

    await new Promise(resolve => setTimeout(resolve, 25));
  }

  return getMessages()
    .filter(message => message.type === 'PLUGINS_UPDATED')
    .at(-1)?.payload?.plugins ?? [];
}

describe('extension/pluginIntegration/installedPluginStatuses', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(fixtureWorkspacePath), name: 'workspace', index: 0 },
    ];
    installedExtensionsValue = [];
    vi.clearAllMocks();

    (vscode.workspace.getConfiguration as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      inspect: vi.fn(() => undefined),
      update: vi.fn(),
    });

    (vscode.workspace.fs.stat as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (uri: { fsPath: string }) => {
        const stat = await fs.stat(uri.fsPath);
        return {
          mtime: stat.mtimeMs,
          size: stat.size,
        };
      },
    );
  });

  it('sends installed external plugins and their sources to the webview after startup', async () => {
    const apiRef: { current?: ReturnType<typeof activate> } = {};
    const coreExtensionRef = {
      id: 'codegraphy.codegraphy',
      isActive: false,
      activate: vi.fn(async () => {
        await Promise.resolve();
        return apiRef.current;
      }),
    };

    (vscode.extensions.getExtension as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (extensionId: string) =>
        extensionId === 'codegraphy.codegraphy' ? coreExtensionRef : undefined,
    );

    installedExtensionsValue = [
      {
        id: 'codegraphy.codegraphy-typescript',
        isActive: false,
        packageJSON: {
          extensionDependencies: ['codegraphy.codegraphy'],
        },
        activate: async () => {
          const plugin = await import('../../../../plugin-typescript/src/activate');
          await plugin.activate({ extensionUri: vscode.Uri.file('/plugins/typescript') } as never);
        },
      },
      {
        id: 'codegraphy.codegraphy-godot',
        isActive: false,
        packageJSON: {
          extensionDependencies: ['codegraphy.codegraphy'],
        },
        activate: async () => {
          const plugin = await import('../../../../plugin-godot/src/activate');
          await plugin.activate({ extensionUri: vscode.Uri.file('/plugins/godot') } as never);
        },
      },
    ];

    const api = activate(createContext() as unknown as vscode.ExtensionContext);
    apiRef.current = api;

    const provider = getRegisteredProvider();
    const { mockWebview, getMessageHandler } = resolveGraphWebview(provider);

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });

    const getPluginMessages = () =>
      mockWebview.postMessage.mock.calls.map((call: unknown[]) => call[0] as {
        type?: string;
        payload?: {
          plugins?: Array<{
            id: string;
            sources: Array<{ qualifiedSourceId: string }>;
          }>;
        };
      });

    const plugins = await waitForPluginStatuses(getPluginMessages);
    expect(getPluginMessages().some(message => message.type === 'PLUGINS_UPDATED')).toBe(true);

    expect(plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'codegraphy.markdown' }),
        expect.objectContaining({
          id: 'codegraphy.typescript',
          sources: expect.arrayContaining([
            expect.objectContaining({
              qualifiedSourceId: expect.stringContaining('codegraphy.typescript'),
            }),
          ]),
        }),
        expect.objectContaining({ id: 'codegraphy.gdscript' }),
      ]),
    );
  });
});
