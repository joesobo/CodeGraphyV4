import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';
import { getGraphViewProviderInternals } from '../../graphViewProvider/internals';

function createContext(vscodeModule: typeof import('vscode')) {
  return {
    subscriptions: [],
    extensionUri: vscodeModule.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function createRestoredState() {
  return {
    activeViewId: 'codegraphy.connections',
    dagMode: null,
    nodeSizeMode: 'connections' as const,
  };
}

async function loadSubject(
  workspaceFolders:
    | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
    | undefined,
) {
  const methodContainers = {
    analysis: {},
    command: {
      undo: vi.fn(async () => 'undo'),
      redo: vi.fn(async () => 'redo'),
    },
    fileAction: {},
    fileVisit: {},
    physicsSettings: {},
    plugin: {
      _sendDecorations: vi.fn(),
    },
    pluginResource: {},
    refresh: {
      refresh: vi.fn(),
    },
    settingsState: {
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
    },
    timeline: {},
    viewContext: {},
    viewSelection: {
      changeView: vi.fn(async () => undefined),
      setDepthLimit: vi.fn(async () => undefined),
    },
    webview: {
      _sendMessage: vi.fn(),
    },
  };

  vi.doMock('../../../../src/extension/pipeline/service', () => ({
    WorkspacePipeline: class WorkspacePipeline {},
  }));
  vi.doMock('../../../../src/core/views', () => ({
    ViewRegistry: class ViewRegistry {
      register = vi.fn();
      get = vi.fn(() => undefined);
      getDefaultViewId = vi.fn(() => 'codegraphy.connections');
    },
    coreViews: [],
  }));
  vi.doMock('../../../../src/core/plugins/events/bus', () => ({
    EventBus: class EventBus {},
  }));
  vi.doMock('../../../../src/core/plugins/decoration/manager', () => ({
    DecorationManager: class DecorationManager {},
  }));
  vi.doMock('../../../../src/extension/graphView/provider/wiring/methodContainers', () => ({
    createGraphViewProviderMethodContainers: vi.fn(() => methodContainers),
  }));
  vi.doMock('vscode', async () => {
    const actual = await vi.importActual<typeof import('vscode')>('vscode');

    return {
      ...actual,
      workspace: {
        ...actual.workspace,
        workspaceFolders,
      },
    };
  });

  const vscodeModule = await import('vscode');
  const { GraphViewProvider } = await import('../../../../src/extension/graphViewProvider');

  return { GraphViewProvider, methodContainers, vscodeModule };
}

describe('graphView/provider/runtime', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('vscode');
    vi.doUnmock('../../../../src/extension/pipeline/service');
    vi.doUnmock('../../../../src/core/views');
    vi.doUnmock('../../../../src/core/plugins/events/bus');
    vi.doUnmock('../../../../src/core/plugins/decoration/manager');
    vi.doUnmock('../../../../src/extension/graphView/provider/wiring/methodContainers');
    vi.doUnmock('../../../../src/extension/graphView/provider/wiring/bootstrap');
    vi.resetModules();
  });

  it('seeds runtime defaults and exposes the inherited view registry getter', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState,
    }));

    const { GraphViewProvider, methodContainers, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const registerCommandMock = vi.fn(() => ({ dispose: vi.fn() }));
    (vscodeModule.commands as Record<string, unknown>).registerCommand = registerCommandMock;
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );
    const context = createContext(vscodeModule) as unknown as VSCode.ExtensionContext;
    new GraphViewProvider(vscodeModule.Uri.file('/test/extension'), context);
    const secondInitArgs = initializeGraphViewProviderServices.mock.calls[1][0];
    const disposable = { dispose: vi.fn() };
    const firstWorkspaceReadyPromise = (
      provider as unknown as { _firstWorkspaceReadyPromise: Promise<void> }
    )._firstWorkspaceReadyPromise;
    const resolveFirstWorkspaceReady = (
      provider as unknown as { _resolveFirstWorkspaceReady?: () => void }
    )._resolveFirstWorkspaceReady;

    expect(provider.viewRegistry).toBe(
      (provider as unknown as { _viewRegistry: unknown })._viewRegistry,
    );
    expect((provider as unknown as { _panels: unknown[] })._panels).toEqual([]);
    expect((provider as unknown as { _graphData: unknown })._graphData).toEqual({
      nodes: [],
      edges: [],
    });
    expect((provider as unknown as { _nodeSizeMode: string })._nodeSizeMode).toBe('connections');
    expect((provider as unknown as { _rawGraphData: unknown })._rawGraphData).toEqual({
      nodes: [],
      edges: [],
    });
    expect((provider as unknown as { _analyzerInitialized: boolean })._analyzerInitialized).toBe(
      false,
    );
    expect(
      (provider as unknown as { _webviewReadyNotified: boolean })._webviewReadyNotified,
    ).toBe(false);
    expect(
      (provider as unknown as { _viewContext: { depthLimit: number; activePlugins: Set<string> } })
        ._viewContext.depthLimit,
    ).toBe(1);
    expect((provider as unknown as { _groups: unknown[] })._groups).toEqual([]);
    expect((provider as unknown as { _userGroups: unknown[] })._userGroups).toEqual([]);
    expect((provider as unknown as { _filterPatterns: unknown[] })._filterPatterns).toEqual([]);
    expect((provider as unknown as { _timelineActive: boolean })._timelineActive).toBe(false);
    expect((provider as unknown as { _firstAnalysis: boolean })._firstAnalysis).toBe(true);
    expect(initializeGraphViewProviderServices).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceRoot: '/test/workspace',
      }),
    );
    expect(restoreGraphViewProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        dagModeKey: 'dagMode',
        nodeSizeModeKey: 'nodeSizeMode',
        fallbackViewId: 'codegraphy.connections',
        fallbackNodeSizeMode: 'connections',
      }),
    );
    expect(secondInitArgs.getGraphData()).toEqual({ nodes: [], edges: [] });
    expect(secondInitArgs.registerCommand('codegraphy.test', vi.fn())).toEqual({ dispose: expect.any(Function) });
    secondInitArgs.pushSubscription(disposable);
    expect(registerCommandMock).toHaveBeenCalledWith('codegraphy.test', expect.any(Function));
    expect(context.subscriptions).toContain(disposable);
    expect((provider as unknown as { _methodContainers: unknown })._methodContainers).toBe(
      methodContainers,
    );

    resolveFirstWorkspaceReady?.();
    await expect(firstWorkspaceReadyPromise).resolves.toBeUndefined();
  });

  it('forwards bootstrap callbacks through the extracted method containers', async () => {
    const initializeGraphViewProviderServices = vi.fn();

    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );
    const internals = getGraphViewProviderInternals(provider);
    const initArgs = initializeGraphViewProviderServices.mock.calls[0][0];
    const sendMessageSpy = vi.spyOn(internals._webviewMethods, '_sendMessage');
    const sendDecorationsSpy = vi.spyOn(internals._pluginMethods, '_sendDecorations');

    initArgs.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    initArgs.onDecorationsChanged();

    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendDecorationsSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the method containers available through the internals helper', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, methodContainers, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );
    const internals = getGraphViewProviderInternals(provider);
    const assignedMethodContainers = (
      provider as unknown as {
        _methodContainers: Record<string, unknown>;
      }
    )._methodContainers;

    expect(assignedMethodContainers).toBe(methodContainers);
    expect(internals._analysisMethods).toBe(methodContainers.analysis);
    expect(internals._commandMethods).toBe(methodContainers.command);
    expect(internals._fileActionMethods).toBe(methodContainers.fileAction);
    expect(internals._fileVisitMethods).toBe(methodContainers.fileVisit);
    expect(internals._pluginMethods).toBe(methodContainers.plugin);
    expect(internals._pluginResourceMethods).toBe(methodContainers.pluginResource);
    expect(internals._physicsSettingsMethods).toBe(methodContainers.physicsSettings);
    expect(internals._refreshMethods).toBe(methodContainers.refresh);
    expect(internals._settingsStateMethods).toBe(methodContainers.settingsState);
    expect(internals._timelineMethods).toBe(methodContainers.timeline);
    expect(internals._viewContextMethods).toBe(methodContainers.viewContext);
    expect(internals._viewSelectionMethods).toBe(methodContainers.viewSelection);
    expect(internals._webviewMethods).toBe(methodContainers.webview);
  });

  it('disposes the extension message emitter through the registered subscription', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const context = createContext(vscodeModule) as unknown as VSCode.ExtensionContext;
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      context,
    );
    const emitter = (
      provider as unknown as {
        _extensionMessageEmitter: { dispose(): void };
      }
    )._extensionMessageEmitter;
    const disposeSpy = vi.spyOn(emitter, 'dispose');

    expect(context.subscriptions).toHaveLength(1);
    expect(typeof context.subscriptions[0]?.dispose).toBe('function');

    context.subscriptions[0]?.dispose();

    expect(disposeSpy).toHaveBeenCalledOnce();
  });

  it('passes an empty workspace root to provider services when no folder is open', async () => {
    const initializeGraphViewProviderServices = vi.fn();

    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject(undefined);

    new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );

    expect(initializeGraphViewProviderServices).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceRoot: '',
      }),
    );
  });

  it('passes an empty workspace root to provider services when the folder list is empty', async () => {
    const initializeGraphViewProviderServices = vi.fn();

    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([]);

    new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );

    expect(initializeGraphViewProviderServices).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceRoot: '',
      }),
    );
  });

  it('dispatches extension messages to listeners and stops after disposal', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const context = createContext(vscodeModule) as unknown as VSCode.ExtensionContext;
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      context,
    );
    const handler = vi.fn();
    const dispose = provider.onExtensionMessage(handler);
    const runtime = provider as unknown as { _notifyExtensionMessage(message: unknown): void };

    runtime._notifyExtensionMessage({ type: 'FIRST' });
    expect(handler).toHaveBeenCalledWith({ type: 'FIRST' });

    dispose.dispose();
    runtime._notifyExtensionMessage({ type: 'SECOND' });
    expect(handler).toHaveBeenCalledTimes(1);

    context.subscriptions[0]?.dispose();
  });

  it('tracks the installed plugin activation promise', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    );
    const activationPromise = Promise.resolve();

    provider.setInstalledPluginActivationPromise(activationPromise);

    expect(
      (provider as unknown as { _installedPluginActivationPromise: Promise<void> })
        ._installedPluginActivationPromise,
    ).toBe(activationPromise);
  });

  it('flushes queued workspace changes by invalidating files before refreshing', async () => {
    vi.doMock('../../../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices: vi.fn(),
      restoreGraphViewProviderState: vi.fn(() => createRestoredState()),
    }));

    const { GraphViewProvider, methodContainers, vscodeModule } = await loadSubject([
      {
        uri: { fsPath: '/test/workspace', path: '/test/workspace' },
        name: 'workspace',
        index: 0,
      },
    ]);
    const provider = new GraphViewProvider(
      vscodeModule.Uri.file('/test/extension'),
      createContext(vscodeModule) as unknown as VSCode.ExtensionContext,
    ) as unknown as {
      _view?: { visible: boolean };
      _analyzer?: { invalidateWorkspaceFiles(filePaths: readonly string[]): string[] };
      markWorkspaceRefreshPending(logMessage: string, filePaths?: readonly string[]): void;
      flushPendingWorkspaceRefresh(): void;
    };
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const invalidateWorkspaceFiles = vi.fn(() => ['src/a.ts', 'src/b.ts']);
    const refresh = vi.fn();

    provider._view = { visible: true };
    provider._analyzer = { invalidateWorkspaceFiles };
    methodContainers.refresh.refresh = refresh;

    provider.markWorkspaceRefreshPending('[CodeGraphy] File saved, refreshing graph', [
      '/test/workspace/src/a.ts',
    ]);
    provider.markWorkspaceRefreshPending('[CodeGraphy] File created, refreshing graph', [
      '/test/workspace/src/b.ts',
    ]);
    provider.flushPendingWorkspaceRefresh();

    expect(invalidateWorkspaceFiles).toHaveBeenCalledWith([
      '/test/workspace/src/a.ts',
      '/test/workspace/src/b.ts',
    ]);
    expect(consoleSpy).toHaveBeenCalledWith('[CodeGraphy] File created, refreshing graph');
    expect(refresh).toHaveBeenCalledOnce();

    consoleSpy.mockRestore();
  });
});
