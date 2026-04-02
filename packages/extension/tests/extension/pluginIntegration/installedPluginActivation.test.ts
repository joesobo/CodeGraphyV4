import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src';
import { activate } from '../../../src/extension/activate';
import type { GraphViewProvider } from '../../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from '../graphViewProvider/internals';

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

describe('extension/pluginIntegration/installedPluginActivation', () => {
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

  it('activates installed dependent plugins before the first analysis runs', async () => {
    const apiRef: { current?: ReturnType<typeof activate> } = {};
    const activateInstalledPlugin = vi.fn(async () => {
      await Promise.resolve();
      apiRef.current?.registerPlugin(createTypeScriptPlugin(), {
        extensionUri: vscode.Uri.file('/plugins/typescript'),
      });
    });

    installedExtensionsValue = [
      {
        id: 'codegraphy.typescript',
        isActive: false,
        packageJSON: {
          extensionDependencies: ['codegraphy.codegraphy'],
        },
        activate: activateInstalledPlugin,
      },
    ];

    const api = activate(createContext() as unknown as vscode.ExtensionContext);
    apiRef.current = api;

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    await internals._analysisMethods._analyzeAndSendData();

    expect(activateInstalledPlugin).toHaveBeenCalledOnce();
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
  });
});
