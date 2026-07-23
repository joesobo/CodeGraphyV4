import { vi } from 'vitest';

const stateHarness = vi.hoisted(() => {
  let resolveFirstWorkspaceReady!: () => void;
  const firstWorkspaceReadyPromise = new Promise<void>((resolve) => {
    resolveFirstWorkspaceReady = resolve;
  });

  return {
    analyzerInstances: [] as Array<{
      context: unknown;
      dispose: ReturnType<typeof vi.fn>;
      invalidateWorkspaceFiles: ReturnType<typeof vi.fn>;
      warmGraphCache: ReturnType<typeof vi.fn>;
    }>,
    viewRegistryInstances: [] as Array<{ id: string }>,
    decorationManagerInstances: [] as Array<{ id: string }>,
    eventBusInstances: [] as Array<{ id: string }>,
    initializeRuntimeStateServices: vi.fn(),
    restorePersistedRuntimeState: vi.fn(() => ({
      depthMode: true,
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
        previous: { filePaths: Set<string>; gitignoreRefresh?: boolean; logMessage: string } | undefined,
        logMessage: string,
        filePaths: readonly string[],
        options?: { gitignoreRefresh?: boolean },
      ) => ({
        filePaths: new Set([...(previous?.filePaths ?? []), ...filePaths]),
        gitignoreRefresh: previous?.gitignoreRefresh === true || options?.gitignoreRefresh === true,
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
      fileInfo: {},
      plugin: {},
      pluginResource: {},
      physicsSettings: {},
      refresh: {
        refresh: vi.fn(async () => undefined),
        refreshGitignoreMetadata: vi.fn(async () => undefined),
        refreshChangedFiles: undefined as undefined | ((filePaths: readonly string[]) => Promise<void>),
      },
      settingsState: {
        _loadDisabledRulesAndPlugins: vi.fn(() => undefined),
      },
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
      _nodeSizeMode: 'connections' as const,
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
    dispose = vi.fn();
    invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => [...filePaths]);
    warmGraphCache = vi.fn(async () => undefined);

    constructor(context: unknown) {
      stateHarness.analyzerInstances.push({
        context,
        dispose: this.dispose,
        invalidateWorkspaceFiles: this.invalidateWorkspaceFiles,
        warmGraphCache: this.warmGraphCache,
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

vi.mock('../../../../../../src/extension/events/bus', () => ({
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
    previous: { filePaths: Set<string>; gitignoreRefresh?: boolean; logMessage: string } | undefined,
    logMessage: string,
    filePaths: readonly string[],
    options?: { gitignoreRefresh?: boolean },
  ) => stateHarness.mergePendingWorkspaceRefresh(previous, logMessage, filePaths, options),
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

export * as vscode from 'vscode';
import { GraphViewProviderRuntime } from '../../../../../../src/extension/graphView/provider/runtime/state/model';

export function getStateHarness(): typeof stateHarness {
  return stateHarness;
}

export function createContext() {
  return {
    subscriptions: [] as Array<{ dispose(): void }>,
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(async () => undefined),
    },
  };
}

export class TestRuntimeState extends GraphViewProviderRuntime {
  public notify(message: unknown): void {
    this._notifyExtensionMessage(message);
  }
}

export function resetStateHarness(): void {
  vi.clearAllMocks();
  stateHarness.analyzerInstances = [];
  stateHarness.viewRegistryInstances = [];
  stateHarness.decorationManagerInstances = [];
  stateHarness.eventBusInstances = [];
  stateHarness.getWorkspaceRoot.mockReturnValue('/workspace');
  stateHarness.loadPersistedWorkspaceRefresh.mockReturnValue(undefined);
  stateHarness.isGraphViewVisible.mockReturnValue(false);
  stateHarness.methodContainers.refresh.refreshChangedFiles = undefined;
}
