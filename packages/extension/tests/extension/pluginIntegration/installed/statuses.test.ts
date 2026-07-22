import * as fs from 'node:fs/promises';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import { activate } from '../../../../src/extension/activate';
import type { GraphViewProvider } from '../../../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from '../../graphViewProvider/internals';
import {
  createPluginIntegrationWorkspace,
  installPluginIntegrationPackage,
  type PluginIntegrationWorkspace,
} from '../workspaceFixture';

const mockState = vi.hoisted(() => ({
  databaseCache: {
    clearWorkspaceAnalysisDatabaseCache: vi.fn(),
    getWorkspaceAnalysisDatabasePath: vi.fn((workspaceRoot: string) => `${workspaceRoot}/.codegraphy/graph.sqlite`),
    loadWorkspaceAnalysisDatabaseCache: vi.fn(() => ({ files: {}, version: '2.0.0' })),
    loadWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => ({ files: {}, version: '2.0.0' })),
    readWorkspaceAnalysisDatabaseSnapshot: vi.fn(() => ({ files: [], graph: { nodes: [], edges: [] }, symbols: [], relations: [] })),
    saveWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => undefined),
  },
}));

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
let workspaceFixture: PluginIntegrationWorkspace | undefined;
let currentContext:
  | {
      subscriptions: Array<{ dispose: () => void }>;
    }
  | undefined;
let originalHome: string | undefined;
let installedPackage:
  | Awaited<ReturnType<typeof installPluginIntegrationPackage>>
  | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

vi.mock('../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  clearWorkspaceAnalysisDatabaseCache: mockState.databaseCache.clearWorkspaceAnalysisDatabaseCache,
  getWorkspaceAnalysisDatabasePath: mockState.databaseCache.getWorkspaceAnalysisDatabasePath,
  loadWorkspaceAnalysisDatabaseCache: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache,
  loadWorkspaceAnalysisDatabaseCacheAsync: mockState.databaseCache.loadWorkspaceAnalysisDatabaseCacheAsync,
  readWorkspaceAnalysisDatabaseSnapshot: mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot,
  saveWorkspaceAnalysisDatabaseCacheAsync: mockState.databaseCache.saveWorkspaceAnalysisDatabaseCacheAsync,
}));

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
      plugins?: Array<{ enabled?: boolean; id: string; packageName?: string }>;
    };
  }>,
  requiredPluginIds = ['codegraphy.markdown', installedPackage!.pluginId],
): Promise<Array<{ enabled?: boolean; id: string; packageName?: string }>> {
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

async function waitForGraphViewContributionStatuses(
  getMessages: () => Array<{
    type?: string;
    payload?: {
      contributions?: Array<{
        contributionId: string;
        kind: string;
        pluginId: string;
      }>;
    };
  }>,
): Promise<Array<{ contributionId: string; kind: string; pluginId: string }>> {
  const requiredContributionIds = [
    installedPackage!.graphViewContributionIds!.runtimeNode,
    installedPackage!.graphViewContributionIds!.projection,
  ];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const contributionMessage = getMessages()
      .filter(message => message.type === 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED')
      .at(-1);
    const contributions = contributionMessage?.payload?.contributions ?? [];
    const contributionIds = new Set(contributions.map(contribution => contribution.contributionId));

    if (requiredContributionIds.every(contributionId => contributionIds.has(contributionId))) {
      return contributions;
    }

    await new Promise(resolve => setTimeout(resolve, 25));
  }

  return getMessages()
    .filter(message => message.type === 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED')
    .at(-1)?.payload?.contributions ?? [];
}

describe('extension/pluginIntegration/installedPluginStatuses', () => {
  beforeAll(async () => {
    workspaceFixture = await createPluginIntegrationWorkspace();
    installedPackage = await installPluginIntegrationPackage(
      workspaceFixture.workspacePath,
      workspaceFixture.scratchPath,
      {
        graphViewContributions: true,
        packageName: '@acme/graph-tools',
        pluginId: 'acme.graph-tools',
        webviewContributions: true,
      },
    );
  });

  beforeEach(() => {
    currentContext = undefined;
    originalHome = process.env.HOME;
    process.env.HOME = installedPackage!.homeDir;
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
    mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache.mockReturnValue({
      files: {},
      version: '2.0.0',
    });
    mockState.databaseCache.loadWorkspaceAnalysisDatabaseCacheAsync.mockResolvedValue({
      files: {},
      version: '2.0.0',
    });
    mockState.databaseCache.readWorkspaceAnalysisDatabaseSnapshot.mockReturnValue({
      files: [],
      graph: { nodes: [], edges: [] },
      symbols: [],
      relations: [],
    });
  });

  afterEach(() => {
    for (const subscription of [...(currentContext?.subscriptions ?? [])].reverse()) {
      subscription?.dispose();
    }
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    currentContext = undefined;
  });

  afterAll(async () => {
    await workspaceFixture?.cleanup();
    workspaceFixture = undefined;
  });

  it('sends package-enabled plugins to the webview after startup', async () => {
    currentContext = createContext();
    activate(currentContext as unknown as vscode.ExtensionContext);

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    const { mockWebview, getMessageHandler } = resolveGraphWebview(provider);

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });

    const getPluginMessages = () =>
      mockWebview.postMessage.mock.calls.map((call: unknown[]) => call[0] as {
        type?: string;
        payload?: {
          plugins?: Array<{ id: string }>;
        };
      });

    const plugins = await waitForPluginStatuses(getPluginMessages);
    expect(getPluginMessages().some(message => message.type === 'PLUGINS_UPDATED')).toBe(true);

    expect(plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'codegraphy.markdown' }),
        expect.objectContaining({ id: installedPackage!.pluginId }),
      ]),
    );
    await internals._analysisMethods._analyzeAndSendData();
    expect(mockState.databaseCache.loadWorkspaceAnalysisDatabaseCache).toHaveBeenCalled();
    expect(mockState.databaseCache.loadWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    expect(mockState.databaseCache.saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalled();
  }, 15000);

  it('sends package-enabled graph view contributions to the webview after startup', async () => {
    currentContext = createContext();
    activate(currentContext as unknown as vscode.ExtensionContext);

    const provider = getRegisteredProvider();
    const { mockWebview, getMessageHandler } = resolveGraphWebview(provider);

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });

    const getContributionMessages = () =>
      mockWebview.postMessage.mock.calls.map((call: unknown[]) => call[0] as {
        type?: string;
        payload?: {
          contributions?: Array<{
            contributionId: string;
            kind: string;
            pluginId: string;
          }>;
        };
      });

    const contributions = await waitForGraphViewContributionStatuses(getContributionMessages);

    expect(contributions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contributionId: installedPackage!.graphViewContributionIds!.runtimeNode,
          kind: 'runtimeNodes',
          pluginId: installedPackage!.pluginId,
        }),
        expect.objectContaining({
          contributionId: installedPackage!.graphViewContributionIds!.projection,
          kind: 'projections',
          pluginId: installedPackage!.pluginId,
        }),
      ]),
    );
  }, 15000);

  it('injects package plugin webview assets from the installed package root', async () => {
    currentContext = createContext();
    activate(currentContext as unknown as vscode.ExtensionContext);

    const provider = getRegisteredProvider();
    const { mockWebview, getMessageHandler } = resolveGraphWebview(provider);

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });

    const injectionMessages = mockWebview.postMessage.mock.calls
      .map((call: unknown[]) => call[0] as {
        type?: string;
        payload?: {
          assets?: unknown[];
          pluginId?: string;
          scripts?: string[];
          styles?: string[];
        };
      })
      .filter(message => message.type === 'PLUGIN_WEBVIEW_INJECT');

    expect(injectionMessages).toContainEqual({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        assets: [],
        pluginId: installedPackage!.pluginId,
        scripts: [`${installedPackage!.packageRoot}/webview.js`],
        styles: [`${installedPackage!.packageRoot}/webview.css`],
      },
    });
  }, 15000);

  it('renders disabled installed package plugins from static metadata without importing runtime code', async () => {
    const disabledWorkspace = await createPluginIntegrationWorkspace();
    const importMarkerPath = `${disabledWorkspace.scratchPath}/disabled-runtime-imported.txt`;
    const disabledPackage = await installPluginIntegrationPackage(
      disabledWorkspace.workspacePath,
      disabledWorkspace.scratchPath,
      {
        graphViewContributions: true,
        importMarkerPath,
        packageName: '@acme/disabled-graph-tools',
        pluginId: 'acme.disabled-graph-tools',
        webviewContributions: true,
      },
    );
    writeCodeGraphyWorkspaceSettings(disabledWorkspace.workspacePath, {
      ...readCodeGraphyWorkspaceSettings(disabledWorkspace.workspacePath),
      plugins: [
        { id: 'codegraphy.markdown', activation: 'enabled' },
        {
          id: disabledPackage.pluginId,
          activation: 'disabled',
          options: {
            targetFile: 'src/utils.ts',
          },
        },
      ],
    });

    try {
      process.env.HOME = disabledPackage.homeDir;
      workspaceFoldersValue = [
        { uri: vscode.Uri.file(disabledWorkspace.workspacePath), name: 'workspace', index: 0 },
      ];
      currentContext = createContext();
      activate(currentContext as unknown as vscode.ExtensionContext);

      const provider = getRegisteredProvider();
      const { mockWebview, getMessageHandler } = resolveGraphWebview(provider);

      await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });

      const getMessages = () =>
        mockWebview.postMessage.mock.calls.map((call: unknown[]) => call[0] as {
          type?: string;
          payload?: {
            contributions?: Array<{ pluginId?: string }>;
            plugins?: Array<{ enabled: boolean; id: string; packageName?: string }>;
            pluginId?: string;
          };
        });
      const plugins = await waitForPluginStatuses(
        getMessages,
        ['codegraphy.markdown', disabledPackage.pluginId],
      );

      expect(plugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            activation: 'disabled',
            id: disabledPackage.pluginId,
            packageName: disabledPackage.packageName,
          }),
        ]),
      );
      await expect(fs.stat(importMarkerPath)).rejects.toMatchObject({ code: 'ENOENT' });
      expect(getMessages()).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'PLUGIN_WEBVIEW_INJECT',
            payload: expect.objectContaining({ pluginId: disabledPackage.pluginId }),
          }),
        ]),
      );
      const contributionMessages = getMessages().filter(message => message.type === 'GRAPH_VIEW_CONTRIBUTIONS_UPDATED');
      for (const message of contributionMessages) {
        expect(message.payload?.contributions ?? []).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ pluginId: disabledPackage.pluginId }),
          ]),
        );
      }
    } finally {
      await disabledWorkspace.cleanup();
    }
  }, 15000);

  it('re-sends package plugin webview assets after analysis initializes package plugins', async () => {
    currentContext = createContext();
    activate(currentContext as unknown as vscode.ExtensionContext);

    const provider = getRegisteredProvider();
    const internals = getGraphViewProviderInternals(provider);
    const { mockWebview, getMessageHandler } = resolveGraphWebview(provider);

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    mockWebview.postMessage.mockClear();

    await internals._analysisMethods._analyzeAndSendData();

    const injectionMessages = mockWebview.postMessage.mock.calls
      .map((call: unknown[]) => call[0] as {
        type?: string;
        payload?: {
          assets?: unknown[];
          pluginId?: string;
          scripts?: string[];
          styles?: string[];
        };
      })
      .filter(message => message.type === 'PLUGIN_WEBVIEW_INJECT');

    expect(injectionMessages).toContainEqual({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        assets: [],
        pluginId: installedPackage!.pluginId,
        scripts: [`${installedPackage!.packageRoot}/webview.js`],
        styles: [`${installedPackage!.packageRoot}/webview.css`],
      },
    });

    const resourceRootPaths = (
      mockWebview.options as { localResourceRoots?: Array<{ fsPath?: string }> }
    ).localResourceRoots?.map(root => root.fsPath);
    expect(resourceRootPaths).toContain(installedPackage!.packageRoot);
  }, 15000);
});
