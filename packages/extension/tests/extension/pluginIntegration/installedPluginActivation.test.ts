import * as fs from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { activate } from '../../../src/extension/activate';
import type { GraphViewProvider } from '../../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from '../graphViewProvider/internals';
import {
  createPluginIntegrationWorkspace,
  type PluginIntegrationWorkspace,
} from './workspaceFixture';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
let workspaceFixture: PluginIntegrationWorkspace | undefined;
let currentContext:
  | {
      subscriptions: Array<{ dispose: () => void }>;
    }
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

describe('extension/pluginIntegration/installedPluginActivation', () => {
  beforeAll(async () => {
    workspaceFixture = await createPluginIntegrationWorkspace();
  });

  beforeEach(() => {
    currentContext = undefined;
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceFixture!.workspacePath), name: 'workspace', index: 0 },
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

  afterEach(() => {
    for (const subscription of [...(currentContext?.subscriptions ?? [])].reverse()) {
      subscription?.dispose();
    }
    currentContext = undefined;
  });

  afterAll(async () => {
    await workspaceFixture?.cleanup();
    workspaceFixture = undefined;
  });

  it('activates installed dependent plugins before the first analysis runs', async () => {
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

    const activateInstalledPlugin = vi.fn(async () => {
      const plugin = await import('../../../../plugin-typescript/src/activate');
      await plugin.activate({ extensionUri: vscode.Uri.file('/plugins/typescript') } as never);
    });

    installedExtensionsValue = [
      {
        id: 'codegraphy.codegraphy-typescript',
        isActive: false,
        packageJSON: {
          extensionDependencies: ['codegraphy.codegraphy'],
        },
        activate: activateInstalledPlugin,
      },
    ];

    currentContext = createContext();
    const api = activate(currentContext as unknown as vscode.ExtensionContext);
    apiRef.current = api;

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    await internals._analysisMethods._analyzeAndSendData();
    await internals._analysisMethods._analyzeAndSendData();

    expect(activateInstalledPlugin).toHaveBeenCalledOnce();
    expect(coreExtensionRef.activate).toHaveBeenCalledOnce();
    expect(api.getGraphData().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'src/index.ts',
          to: 'src/utils.ts',
        }),
      ]),
    );

    const pluginIds = (
      (provider as unknown as {
        _analyzer: { registry: { list: () => Array<{ plugin: { id: string } }> } };
      })._analyzer.registry.list()
    ).map((pluginInfo) => pluginInfo.plugin.id);

    expect(pluginIds).toEqual(
      expect.arrayContaining(['codegraphy.markdown', 'codegraphy.typescript']),
    );
  }, 15000);
});
