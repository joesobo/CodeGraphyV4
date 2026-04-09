import * as fs from 'node:fs/promises';
import { waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createTypeScriptPlugin } from '../../../../plugin-typescript/src/plugin';
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

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
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

describe('extension/pluginIntegration/typescript', () => {
  beforeAll(async () => {
    workspaceFixture = await createPluginIntegrationWorkspace();
  });

  beforeEach(() => {
    currentContext = undefined;
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceFixture!.workspacePath), name: 'workspace', index: 0 },
    ];
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

  it('keeps the graph populated when the TypeScript plugin registers after the first analysis', async () => {
    currentContext = createContext();
    const api = activate(currentContext as unknown as vscode.ExtensionContext);
    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);

    await internals._analysisMethods._analyzeAndSendData();

    expect(api.getGraphData().edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'src/index.ts',
          to: 'src/utils.ts',
        }),
      ]),
    );

    api.registerPlugin(createTypeScriptPlugin(), {
      extensionUri: vscode.Uri.file('/plugins/typescript'),
    });

    await waitFor(() => {
      expect(api.getGraphData().edges).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            from: 'src/index.ts',
            to: 'src/utils.ts',
          }),
        ]),
      );
    });
    await internals._analysisMethods._analyzeAndSendData();

    const pluginIds = (
      (provider as unknown as {
        _analyzer: { registry: { list: () => Array<{ plugin: { id: string } }> } };
      })._analyzer.registry.list()
    ).map((pluginInfo) => pluginInfo.plugin.id);

    expect(pluginIds).toContain('codegraphy.typescript');
  }, 15000);
});
