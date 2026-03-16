import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as VSCode from 'vscode';

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
  vi.doMock('../../src/extension/WorkspaceAnalyzer', () => ({
    WorkspaceAnalyzer: class WorkspaceAnalyzer {},
  }));
  vi.doMock('../../src/core/views', () => ({
    ViewRegistry: class ViewRegistry {},
    coreViews: [],
  }));
  vi.doMock('../../src/core/plugins/EventBus', () => ({
    EventBus: class EventBus {},
  }));
  vi.doMock('../../src/core/plugins/DecorationManager', () => ({
    DecorationManager: class DecorationManager {},
  }));
  vi.doMock('../../src/extension/graphView/provider/analysis', () => ({
    createGraphViewProviderAnalysisMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/commands', () => ({
    createGraphViewProviderCommandMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/fileActions', () => ({
    createGraphViewProviderFileActionMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/fileVisits', () => ({
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
  vi.doMock('../../src/extension/graphView/provider/timeline', () => ({
    createGraphViewProviderTimelineMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/viewContext', () => ({
    createGraphViewProviderViewContextMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/viewSelection', () => ({
    createGraphViewProviderViewSelectionMethods: () => ({}),
  }));
  vi.doMock('../../src/extension/graphView/provider/webview', () => ({
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
  const { GraphViewProvider } = await import('../../src/extension/GraphViewProvider');

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
    vi.doUnmock('../../src/extension/WorkspaceAnalyzer');
    vi.doUnmock('../../src/core/views');
    vi.doUnmock('../../src/core/plugins/EventBus');
    vi.doUnmock('../../src/core/plugins/DecorationManager');
    vi.doUnmock('../../src/extension/graphView/provider/analysis');
    vi.doUnmock('../../src/extension/graphView/provider/commands');
    vi.doUnmock('../../src/extension/graphView/provider/fileActions');
    vi.doUnmock('../../src/extension/graphView/provider/fileVisits');
    vi.doUnmock('../../src/extension/graphView/provider/plugins');
    vi.doUnmock('../../src/extension/graphView/provider/pluginResources');
    vi.doUnmock('../../src/extension/graphView/provider/physicsSettings');
    vi.doUnmock('../../src/extension/graphView/provider/refresh');
    vi.doUnmock('../../src/extension/graphView/provider/settingsState');
    vi.doUnmock('../../src/extension/graphView/provider/timeline');
    vi.doUnmock('../../src/extension/graphView/provider/viewContext');
    vi.doUnmock('../../src/extension/graphView/provider/viewSelection');
    vi.doUnmock('../../src/extension/graphView/provider/webview');
    vi.doUnmock('../../src/extension/graphView/provider/bootstrap');
    vi.resetModules();
  });

  it('seeds constructor defaults and forwards bootstrap callbacks', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/provider/bootstrap', () => ({
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
    const initArgs = initializeGraphViewProviderServices.mock.calls[0][0];
    const sendMessageSpy = vi
      .spyOn(provider as unknown as { _sendMessage(message: unknown): void }, '_sendMessage')
      .mockImplementation(() => {});
    const sendDecorationsSpy = vi
      .spyOn(provider as unknown as { _sendDecorations(): void }, '_sendDecorations')
      .mockImplementation(() => {});

    expect((provider as unknown as { _nodeSizeMode: string })._nodeSizeMode).toBe('connections');
    expect((provider as unknown as { _rawGraphData: unknown })._rawGraphData).toEqual({
      nodes: [],
      edges: [],
    });
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

    vi.doMock('../../src/extension/graphView/provider/bootstrap', () => ({
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
});
