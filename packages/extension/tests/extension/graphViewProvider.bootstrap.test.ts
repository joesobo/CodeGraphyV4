import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';

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
  vi.doMock('../../src/extension/workspaceAnalyzer/service', () => ({
    WorkspaceAnalyzer: class WorkspaceAnalyzer {},
  }));
  vi.doMock('../../src/core/views', () => ({
    ViewRegistry: class ViewRegistry {
      register = vi.fn();
      get = vi.fn(() => undefined);
      getDefaultViewId = vi.fn(() => 'codegraphy.connections');
    },
    coreViews: [],
  }));
  vi.doMock('../../src/core/plugins/eventBus', () => ({
    EventBus: class EventBus {},
  }));
  vi.doMock('../../src/core/plugins/decoration/manager', () => ({
    DecorationManager: class DecorationManager {},
  }));
  vi.doMock('../../src/extension/graphView/provider/analysis/methods', () => ({
    createGraphViewProviderAnalysisMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/commands', () => ({
    createGraphViewProviderCommandMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/file/actions', () => ({
    createGraphViewProviderFileActionMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/file/visits', () => ({
    createGraphViewProviderFileVisitMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/plugins', () => ({
    createGraphViewProviderPluginMethods: () => ({
      _sendDecorations: vi.fn(),
    }),
  }));
  vi.doMock('../../src/extension/graphView/provider/pluginResources', () => ({
    createGraphViewProviderPluginResourceMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/physicsSettings', () => ({
    createGraphViewProviderPhysicsSettingsMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/refresh', () => ({
    createGraphViewProviderRefreshMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/settingsState', () => ({
    createGraphViewProviderSettingsStateMethods: () => ({
      _loadDisabledRulesAndPlugins: vi.fn(() => false),
    }),
  }));
  vi.doMock('../../src/extension/graphView/provider/timeline/methods', () => ({
    createGraphViewProviderTimelineMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/view/context', () => ({
    createGraphViewProviderViewContextMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/view/selection', () => ({
    createGraphViewProviderViewSelectionMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/webview/host', () => ({
    createGraphViewProviderWebviewMethods: () => ({
      _sendMessage: vi.fn(),
    }),
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
  const { GraphViewProvider } = await import('../../src/extension/graphViewProvider');

  return { GraphViewProvider, vscodeModule };
}

describe('GraphViewProvider bootstrap wiring', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('vscode');
    vi.doUnmock('../../src/extension/workspaceAnalyzer/service');
    vi.doUnmock('../../src/core/views');
    vi.doUnmock('../../src/core/plugins/eventBus');
    vi.doUnmock('../../src/core/plugins/decoration/manager');
    vi.doUnmock('../../src/extension/graphView/provider/analysis/methods');
    vi.doUnmock('../../src/extension/graphView/provider/commands');
    vi.doUnmock('../../src/extension/graphView/provider/file/actions');
    vi.doUnmock('../../src/extension/graphView/provider/file/visits');
    vi.doUnmock('../../src/extension/graphView/provider/plugins');
    vi.doUnmock('../../src/extension/graphView/provider/pluginResources');
    vi.doUnmock('../../src/extension/graphView/provider/physicsSettings');
    vi.doUnmock('../../src/extension/graphView/provider/refresh');
    vi.doUnmock('../../src/extension/graphView/provider/settingsState');
    vi.doUnmock('../../src/extension/graphView/provider/timeline/methods');
    vi.doUnmock('../../src/extension/graphView/provider/view/context');
    vi.doUnmock('../../src/extension/graphView/provider/view/selection');
    vi.doUnmock('../../src/extension/graphView/provider/webview/host');
    vi.doUnmock('../../src/extension/graphView/provider/wiring/bootstrap');
    vi.resetModules();
  });

  it('seeds constructor defaults and forwards bootstrap callbacks', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState,
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
    const sendMessageSpy = vi
      .spyOn(internals._webviewMethods, '_sendMessage')
      .mockImplementation(() => {});
    const sendDecorationsSpy = vi
      .spyOn(internals._pluginMethods, '_sendDecorations')
      .mockImplementation(() => {});

    expect((provider as unknown as { _nodeSizeMode: string })._nodeSizeMode).toBe('connections');
    expect(GraphViewProvider.viewType).toBe('codegraphy.graphView');
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
    expect(
      Array.from(
        (provider as unknown as { _viewContext: { activePlugins: Set<string> } })._viewContext
          .activePlugins,
      ),
    ).toEqual([]);
    expect((provider as unknown as { _groups: unknown[] })._groups).toEqual([]);
    expect((provider as unknown as { _userGroups: unknown[] })._userGroups).toEqual([]);
    expect(
      Array.from(
        (provider as unknown as { _hiddenPluginGroupIds: Set<string> })._hiddenPluginGroupIds,
      ),
    ).toEqual([]);
    expect((provider as unknown as { _filterPatterns: unknown[] })._filterPatterns).toEqual([]);

    expect(initArgs.workspaceRoot).toBe('/test/workspace');
    expect(initArgs.getGraphData()).toEqual({ nodes: [], edges: [] });

    initArgs.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    initArgs.onDecorationsChanged();

    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendDecorationsSpy).toHaveBeenCalledOnce();
    expect(restoreGraphViewProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedViewKey: 'codegraphy.selectedView',
        dagModeKey: 'codegraphy.dagMode',
        nodeSizeModeKey: 'codegraphy.nodeSizeMode',
        fallbackViewId: 'codegraphy.connections',
        fallbackNodeSizeMode: 'connections',
      }),
    );
  });

  it('passes an empty workspace root to provider services when no folder is open', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState,
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
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/provider/wiring/bootstrap', () => ({
      initializeGraphViewProviderServices,
      restoreGraphViewProviderState,
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
});
