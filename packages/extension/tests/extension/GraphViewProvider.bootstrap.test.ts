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
    vi.doUnmock('../../src/extension/graphView/providerBootstrap');
    vi.resetModules();
  });

  it('seeds constructor defaults and forwards bootstrap callbacks', async () => {
    const initializeGraphViewProviderServices = vi.fn();
    const restoreGraphViewProviderState = vi.fn(() => createRestoredState());

    vi.doMock('../../src/extension/graphView/providerBootstrap', () => ({
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

    vi.doMock('../../src/extension/graphView/providerBootstrap', () => ({
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
