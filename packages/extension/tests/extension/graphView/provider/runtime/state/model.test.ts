import { beforeEach, describe, expect, it, vi } from 'vitest';

const stateHarness = vi.hoisted(() => {
  let resolveFirstWorkspaceReady!: () => void;
  const firstWorkspaceReadyPromise = new Promise<void>((resolve) => {
    resolveFirstWorkspaceReady = resolve;
  });

  return {
    analyzerInstances: [] as Array<{
      context: unknown;
      invalidateWorkspaceFiles: ReturnType<typeof vi.fn>;
    }>,
    viewRegistryInstances: [] as Array<{ id: string }>,
    decorationManagerInstances: [] as Array<{ id: string }>,
    eventBusInstances: [] as Array<{ id: string }>,
    initializeRuntimeStateServices: vi.fn(),
    restorePersistedRuntimeState: vi.fn(() => ({
      depthMode: true,
      dagMode: 'focus' as const,
      nodeSizeMode: 'connections' as const,
    })),
    createGraphViewProviderMethodContainers: vi.fn(),
    defineGraphViewProviderMethodAccessors: vi.fn(),
    assignGraphViewProviderPublicMethods: vi.fn(),
    invalidateWorkspaceFiles: vi.fn((_analyzer: unknown, filePaths: readonly string[]) => [...filePaths]),
    invalidatePluginFiles: vi.fn((_analyzer: unknown, pluginIds: readonly string[]) => [...pluginIds]),
    isGraphViewVisible: vi.fn(() => false),
    mergePendingWorkspaceRefresh: vi.fn(
      (
        previous: { filePaths: Set<string>; logMessage: string } | undefined,
        logMessage: string,
        filePaths: readonly string[],
      ) => ({
        filePaths: new Set([...(previous?.filePaths ?? []), ...filePaths]),
        logMessage,
      }),
    ),
    persistPendingWorkspaceRefresh: vi.fn(),
    loadPersistedWorkspaceRefresh: vi.fn(),
    getWorkspaceRoot: vi.fn(() => '/workspace'),
    extensionMessageEmitter: {
      dispose: vi.fn(),
      fire: vi.fn(),
    },
    createPluginExtensionUris: vi.fn(() => new Map<string, { fsPath: string; path: string }>()),
    createFirstWorkspaceReadyState: vi.fn(() => ({
      promise: firstWorkspaceReadyPromise,
      resolve: resolveFirstWorkspaceReady,
    })),
    methodContainers: {
      analysis: {},
      command: {},
      fileAction: {},
      fileVisit: {},
      plugin: {},
      pluginResource: {},
      physicsSettings: {},
      refresh: {
        refresh: vi.fn(async () => undefined),
        refreshChangedFiles: undefined as undefined | ((filePaths: readonly string[]) => Promise<void>),
      },
      settingsState: {
        _loadDisabledRulesAndPlugins: vi.fn(() => undefined),
      },
      timeline: {},
      viewContext: {},
      viewSelection: {},
      webview: {},
    },
    dataState: {
      _panels: [],
      _graphData: { nodes: [], edges: [] },
      _analysisRequestId: 0,
      _changedFilePaths: [],
      _rawGraphData: { nodes: [], edges: [] },
      _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 },
      _groups: [],
      _userGroups: [],
      _filterPatterns: [],
      _disabledPlugins: new Set<string>(),
    },
    flagState: {
      _analyzerInitialized: false,
      _depthMode: false,
      _dagMode: null,
      _nodeSizeMode: 'connections' as const,
      _timelineActive: false,
      _firstAnalysis: true,
      _webviewReadyNotified: false,
      _installedPluginActivationPromise: Promise.resolve(),
    },
  };
});

vi.mock('vscode', () => ({
  Uri: {
    file: (filePath: string) => ({ fsPath: filePath, path: filePath }),
  },
  workspace: {
    workspaceFolders: [
      {
        uri: {
          fsPath: '/workspace',
          path: '/workspace',
        },
      },
    ],
  },
}));

vi.mock('../../../../../../src/extension/pipeline/service/lifecycleFacade', () => ({
  WorkspacePipeline: class WorkspacePipeline {
    invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => [...filePaths]);

    constructor(context: unknown) {
      stateHarness.analyzerInstances.push({
        context,
        invalidateWorkspaceFiles: this.invalidateWorkspaceFiles,
      });
    }
  },
}));

vi.mock('../../../../../../src/core/views/registry', () => ({
  ViewRegistry: class ViewRegistry {
    constructor() {
      stateHarness.viewRegistryInstances.push({ id: 'view-registry' });
    }
  },
}));

vi.mock('../../../../../../src/core/plugins/decoration/manager', () => ({
  DecorationManager: class DecorationManager {
    constructor() {
      stateHarness.decorationManagerInstances.push({ id: 'decoration-manager' });
    }
  },
}));

vi.mock('../../../../../../src/core/plugins/events/bus', () => ({
  EventBus: class EventBus {
    constructor() {
      stateHarness.eventBusInstances.push({ id: 'event-bus' });
    }
  },
}));

vi.mock('../../../../../../src/extension/graphView/provider/wiring/methodContainers', () => ({
  createGraphViewProviderMethodContainers: (...args: unknown[]) => {
    stateHarness.createGraphViewProviderMethodContainers(...args);
    return stateHarness.methodContainers;
  },
}));

vi.mock('../../../../../../src/extension/graphView/provider/wiring/publicApi', () => ({
  assignGraphViewProviderPublicMethods: (...args: unknown[]) => {
    stateHarness.assignGraphViewProviderPublicMethods(...args);
  },
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/methodAccessors', () => ({
  defineGraphViewProviderMethodAccessors: (...args: unknown[]) => {
    stateHarness.defineGraphViewProviderMethodAccessors(...args);
  },
}));

vi.mock('../../../../../../src/extension/graphView/provider/messageEmitter', () => ({
  createExtensionMessageEmitter: () => stateHarness.extensionMessageEmitter,
}));

vi.mock('../../../../../../src/extension/graphView/provider/firstWorkspaceReady', () => ({
  createFirstWorkspaceReadyState: () => stateHarness.createFirstWorkspaceReadyState(),
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtimeDefaults', () => ({
  DEFAULT_NODE_SIZE_MODE: 'connections',
  createPluginExtensionUris: () => stateHarness.createPluginExtensionUris(),
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/state/bootstrap', () => ({
  getWorkspaceRoot: (workspaceFolders: unknown) =>
    (
      stateHarness.getWorkspaceRoot as unknown as (workspaceFolders: unknown) => string | undefined
    )(workspaceFolders),
  initializeRuntimeStateServices: (
    dependencies: unknown,
    getGraphData: unknown,
    getMethodContainers: unknown,
  ) => {
    stateHarness.initializeRuntimeStateServices(
      dependencies,
      getGraphData,
      getMethodContainers,
    );
  },
  restorePersistedRuntimeState: (context: unknown, fallbackNodeSizeMode: unknown) =>
    (
      stateHarness.restorePersistedRuntimeState as unknown as (
        context: unknown,
        fallbackNodeSizeMode: unknown,
      ) => unknown
    )(context, fallbackNodeSizeMode),
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/state/data', () => ({
  createGraphViewProviderRuntimeDataState: () => stateHarness.dataState,
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/state/flags', () => ({
  createGraphViewProviderRuntimeFlagState: () => stateHarness.flagState,
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/state/refresh', () => ({
  invalidatePluginFiles: (analyzer: unknown, pluginIds: readonly string[]) =>
    stateHarness.invalidatePluginFiles(analyzer, pluginIds),
  invalidateWorkspaceFiles: (analyzer: unknown, filePaths: readonly string[]) =>
    stateHarness.invalidateWorkspaceFiles(analyzer, filePaths),
  mergePendingWorkspaceRefresh: (
    previous: { filePaths: Set<string>; logMessage: string } | undefined,
    logMessage: string,
    filePaths: readonly string[],
  ) => stateHarness.mergePendingWorkspaceRefresh(previous, logMessage, filePaths),
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/state/visibility', () => ({
  isGraphViewVisible: (view: unknown, panels: unknown[]) =>
    (
      stateHarness.isGraphViewVisible as unknown as (
        view: unknown,
        panels: unknown[],
      ) => boolean
    )(view, panels),
}));

vi.mock('../../../../../../src/extension/graphView/provider/runtime/workspaceRefreshPersistence', () => ({
  loadPersistedWorkspaceRefresh: (workspaceRoot: string | undefined) =>
    stateHarness.loadPersistedWorkspaceRefresh(workspaceRoot),
  persistPendingWorkspaceRefresh: (
    workspaceRoot: string | undefined,
    filePaths: string[],
  ) => stateHarness.persistPendingWorkspaceRefresh(workspaceRoot, filePaths),
}));

import * as vscode from 'vscode';
import { GraphViewProviderRuntime } from '../../../../../../src/extension/graphView/provider/runtime/state/model';

function createContext() {
  return {
    subscriptions: [] as Array<{ dispose(): void }>,
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(async () => undefined),
    },
  };
}

class TestRuntimeState extends GraphViewProviderRuntime {
  public notify(message: unknown): void {
    this._notifyExtensionMessage(message);
  }
}

describe('graphView/provider/runtime/state/model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateHarness.analyzerInstances = [];
    stateHarness.viewRegistryInstances = [];
    stateHarness.decorationManagerInstances = [];
    stateHarness.eventBusInstances = [];
    stateHarness.getWorkspaceRoot.mockReturnValue('/workspace');
    stateHarness.loadPersistedWorkspaceRefresh.mockReturnValue(undefined);
    stateHarness.isGraphViewVisible.mockReturnValue(false);
    stateHarness.methodContainers.refresh.refreshChangedFiles = undefined;
  });

  it('initializes core runtime wiring and loads persisted settings state', () => {
    const context = createContext();
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      context as never,
    ) as TestRuntimeState & {
      _depthMode: boolean;
      _dagMode: string | null;
      _nodeSizeMode: string;
      _pluginExtensionUris: Map<string, unknown>;
      _firstWorkspaceReadyPromise: Promise<void>;
      _resolveFirstWorkspaceReady?: () => void;
      _methodContainers: typeof stateHarness.methodContainers;
      _graphData: { nodes: unknown[]; edges: unknown[] };
    };
    const initializeArgs = stateHarness.initializeRuntimeStateServices.mock.calls[0] as [
      {
        _analyzer: unknown;
        _context: unknown;
        _viewRegistry: unknown;
        _eventBus: unknown;
        _decorationManager: unknown;
      },
      () => unknown,
      () => unknown,
    ];

    expect(stateHarness.analyzerInstances).toHaveLength(1);
    expect(stateHarness.initializeRuntimeStateServices).toHaveBeenCalledOnce();
    expect(stateHarness.restorePersistedRuntimeState).toHaveBeenCalledWith(
      context,
      'connections',
    );
    expect(stateHarness.createGraphViewProviderMethodContainers).toHaveBeenCalledOnce();
    expect(stateHarness.defineGraphViewProviderMethodAccessors).toHaveBeenCalledOnce();
    expect(stateHarness.assignGraphViewProviderPublicMethods).toHaveBeenCalledOnce();
    expect(runtime.viewRegistry).toBeDefined();
    expect(runtime._depthMode).toBe(true);
    expect(runtime._dagMode).toBe('focus');
    expect(runtime._nodeSizeMode).toBe('connections');
    expect(runtime._pluginExtensionUris).toBeInstanceOf(Map);
    expect(runtime._methodContainers.settingsState._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(context.subscriptions).toHaveLength(1);
    expect(runtime._firstWorkspaceReadyPromise).toBeInstanceOf(Promise);
    expect(runtime._resolveFirstWorkspaceReady).toEqual(expect.any(Function));
    expect(initializeArgs[0]._analyzer).toBe(
      (runtime as unknown as { _analyzer: unknown })._analyzer,
    );
    expect(initializeArgs[0]._context).toBe(context);
    expect(initializeArgs[0]._viewRegistry).toBe(runtime.viewRegistry);
    expect(initializeArgs[0]._eventBus).toBe(
      (runtime as unknown as { _eventBus: unknown })._eventBus,
    );
    expect(initializeArgs[0]._decorationManager).toBe(
      (runtime as unknown as { _decorationManager: unknown })._decorationManager,
    );
    expect(initializeArgs[1]()).toBe(runtime._graphData);
    expect(initializeArgs[2]()).toBe(runtime._methodContainers);
  });

  it('delegates graph visibility and invalidation helpers', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );
    stateHarness.isGraphViewVisible.mockReturnValue(true);

    expect(runtime.isGraphOpen()).toBe(true);
    expect(runtime.invalidateWorkspaceFiles(['/workspace/src/a.ts'])).toEqual(['/workspace/src/a.ts']);
    expect(runtime.invalidatePluginFiles(['plugin.markdown'])).toEqual(['plugin.markdown']);
    expect(stateHarness.invalidateWorkspaceFiles).toHaveBeenCalledWith(expect.anything(), ['/workspace/src/a.ts']);
    expect(stateHarness.invalidatePluginFiles).toHaveBeenCalledWith(expect.anything(), ['plugin.markdown']);
  });

  it('persists pending workspace refreshes and flushes through refreshChangedFiles when available', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const refreshChangedFiles = vi.fn(async () => undefined);
    stateHarness.methodContainers.refresh.refreshChangedFiles = refreshChangedFiles;
    stateHarness.isGraphViewVisible.mockReturnValue(true);
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    ) as TestRuntimeState & {
      _pendingWorkspaceRefresh?: { filePaths: Set<string>; logMessage: string };
    };

    runtime.markWorkspaceRefreshPending('[CodeGraphy] File saved', ['/workspace/src/a.ts']);
    runtime.markWorkspaceRefreshPending('[CodeGraphy] File created', ['/workspace/src/b.ts']);
    runtime.flushPendingWorkspaceRefresh();

    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenNthCalledWith(
      1,
      '/workspace',
      ['/workspace/src/a.ts'],
    );
    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenNthCalledWith(
      2,
      '/workspace',
      ['/workspace/src/a.ts', '/workspace/src/b.ts'],
    );
    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenNthCalledWith(
      3,
      '/workspace',
      [],
    );
    expect(refreshChangedFiles).toHaveBeenCalledWith([
      '/workspace/src/a.ts',
      '/workspace/src/b.ts',
    ]);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created');
    expect(runtime._pendingWorkspaceRefresh).toBeUndefined();

    consoleSpy.mockRestore();
  });

  it('uses the default empty file list when marking a workspace refresh without paths', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.markWorkspaceRefreshPending('[CodeGraphy] Workspace settings changed');

    expect(stateHarness.persistPendingWorkspaceRefresh).toHaveBeenCalledWith('/workspace', []);
  });

  it('flushes persisted workspace refreshes through the fallback refresh path', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    stateHarness.isGraphViewVisible.mockReturnValue(true);
    stateHarness.loadPersistedWorkspaceRefresh.mockReturnValue({
      filePaths: new Set(['/workspace/src/c.ts']),
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    });
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.flushPendingWorkspaceRefresh();

    expect(stateHarness.loadPersistedWorkspaceRefresh).toHaveBeenCalledWith('/workspace');
    expect(stateHarness.invalidateWorkspaceFiles).toHaveBeenCalledWith(
      expect.anything(),
      ['/workspace/src/c.ts'],
    );
    expect(stateHarness.methodContainers.refresh.refresh).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] Applying pending workspace changes');

    consoleSpy.mockRestore();
  });

  it('skips flush work when the graph is closed or when no refresh state exists', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    );

    runtime.flushPendingWorkspaceRefresh();
    expect(stateHarness.loadPersistedWorkspaceRefresh).not.toHaveBeenCalled();

    stateHarness.isGraphViewVisible.mockReturnValue(true);
    runtime.flushPendingWorkspaceRefresh();
    expect(stateHarness.loadPersistedWorkspaceRefresh).toHaveBeenCalledWith('/workspace');
    expect(stateHarness.methodContainers.refresh.refresh).not.toHaveBeenCalled();
  });

  it('forwards extension messages and disposes the emitter from the registered subscription', () => {
    const context = createContext();
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      context as never,
    );

    runtime.notify({ type: 'EXTENSION_MESSAGE' });
    context.subscriptions[0]?.dispose();

    expect(stateHarness.extensionMessageEmitter.fire).toHaveBeenCalledWith({
      type: 'EXTENSION_MESSAGE',
    });
    expect(stateHarness.extensionMessageEmitter.dispose).toHaveBeenCalledOnce();
  });

  it('tracks installed plugin activation promises', () => {
    const runtime = new TestRuntimeState(
      vscode.Uri.file('/extension'),
      createContext() as never,
    ) as TestRuntimeState & {
      _installedPluginActivationPromise: Promise<void>;
    };
    const activationPromise = Promise.resolve();

    runtime.setInstalledPluginActivationPromise(activationPromise);

    expect(runtime._installedPluginActivationPromise).toBe(activationPromise);
  });
});
